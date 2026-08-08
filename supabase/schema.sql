-- Supabase schema for Child Care Clinic Appointment System
-- Notes:
-- 1) Assumes Supabase Auth is enabled.
-- 2) Uses RLS (Row Level Security) with policies in rls-policies.sql.
-- 3) 'profile' table ties to auth.users via auth.uid().

-- Extensions (optional; safe to include)
create extension if not exists pgcrypto;

-- 1) User profile (token status + role)
create table if not exists public.profile (
  id uuid primary key references auth.users(id) on delete cascade,

  -- Example fields for dashboard
  token_status text not null default 'inactive',
  token_last_updated_at timestamptz not null default now(),

  full_name text,
  phone text,

  role text not null default 'user',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profile_updated_at on public.profile;
create trigger trg_profile_updated_at
before update on public.profile
for each row execute function public.set_updated_at();

-- 2) Children
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,

  -- CRUD fields
  full_name text not null,
  dob date not null,
  blood_group text,
  health_concerns text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, full_name, dob)
);

drop trigger if exists trg_children_updated_at on public.children;
create trigger trg_children_updated_at
before update on public.children
for each row execute function public.set_updated_at();

-- 3) Appointments
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,

  appointment_date date not null,
  appointment_time time not null,

  reason text,
  status text not null default 'scheduled' 
    check (status in ('scheduled','checked_in','completed','cancelled')),

  -- UPI Payment fields (added for the payment feature)
  fee_amount numeric(10,2) not null default 0,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid')),
  upi_transaction_id text,
  upi_transaction_ref text,
  paid_at timestamptz,

  -- Link to visit history (optional)
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Prevent double-booking for same child & timeslot (customize as needed)
  unique (child_id, appointment_date, appointment_time)
);

-- Idempotent migration for existing installations that already have the table
alter table public.appointments add column if not exists fee_amount numeric(10,2) not null default 0;
alter table public.appointments add column if not exists payment_status text not null default 'pending';
alter table public.appointments add column if not exists upi_transaction_id text;
alter table public.appointments add column if not exists upi_transaction_ref text;
alter table public.appointments add column if not exists paid_at timestamptz;

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

-- 4) Vaccination catalog (optional but recommended)
-- Stores vaccine names/types; you can pre-seed this.
create table if not exists public.vaccines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  due_in_days int, -- optional: used for due calculations
  is_active boolean not null default true,

  created_at timestamptz not null default now()
);

-- 5) Vaccination records per child
create table if not exists public.vaccination_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  vaccine_id uuid references public.vaccines(id) on delete set null,

  -- If you want to store raw name even without vaccine_id
  vaccine_name text,

  scheduled_date date,
  due_date date,
  administered_date date,

  dose_number int,
  notes text,

  status text not null default 'upcoming'
    check (status in ('upcoming','due','completed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (child_id, vaccine_name, dose_number)
);

drop trigger if exists trg_vaccination_records_updated_at on public.vaccination_records;
create trigger trg_vaccination_records_updated_at
before update on public.vaccination_records
for each row execute function public.set_updated_at();

-- 6) Visit history (can be derived from appointments, but having a table is flexible)
-- Use this to store clinical notes, doctor, prescriptions, etc.
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,

  visit_date timestamptz not null default now(),
  doctor_name text,
  diagnosis text,
  notes text,

  created_at timestamptz not null default now()
);

-- Indexes for faster dashboard queries
create index if not exists idx_appointments_user_date_time
on public.appointments (user_id, appointment_date, appointment_time);

create index if not exists idx_appointments_child
on public.appointments (child_id);

create index if not exists idx_vaccination_records_child_due
on public.vaccination_records (child_id, due_date);

create index if not exists idx_visits_user_date
on public.visits (user_id, visit_date desc);

-- 7) Payment sessions (dynamic QR verification)
-- Stores a short-lived payment session tied to an exact appointment + amount.
-- The `upi_uri` encodes a unique `tr` (transaction reference) so a callback
-- for that reference can be matched back to this session and the appointment.
create table if not exists public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,

  amount numeric(10,2) not null default 0,
  txn_ref text not null unique,          -- unique UPI transaction reference (tr)
  upi_uri text not null,                 -- full upi://pay URI encoded in the QR
  status text not null default 'pending'
    check (status in ('pending','paid','expired')),

  created_at timestamptz not null default now(),
  expires_at timestamptz not null,       -- QR is only valid until this time
  paid_at timestamptz,

-- Payment gateway callback fields (populated when verified)
  gateway_transaction_id text,
  gateway_signature text
);

-- Idempotent migration for existing installations that already have the table
alter table public.payment_sessions add column if not exists user_id uuid;
alter table public.payment_sessions add column if not exists appointment_id uuid;
alter table public.payment_sessions add column if not exists amount numeric(10,2) not null default 0;
alter table public.payment_sessions add column if not exists txn_ref text;
alter table public.payment_sessions add column if not exists upi_uri text;
alter table public.payment_sessions add column if not exists status text not null default 'pending';
alter table public.payment_sessions add column if not exists created_at timestamptz not null default now();
alter table public.payment_sessions add column if not exists expires_at timestamptz;
alter table public.payment_sessions add column if not exists paid_at timestamptz;
alter table public.payment_sessions add column if not exists gateway_transaction_id text;
alter table public.payment_sessions add column if not exists gateway_signature text;

-- Auto-expire helper: mark stale pending sessions as expired.
create or replace function public.expire_payment_sessions()
returns void as $$
begin
  update public.payment_sessions
  set status = 'expired'
  where status = 'pending' and expires_at < now();
end;
$$ language plpgsql;

create index if not exists idx_payment_sessions_appointment
on public.payment_sessions (appointment_id);

create index if not exists idx_payment_sessions_txn_ref
on public.payment_sessions (txn_ref);

create index if not exists idx_payment_sessions_status_expires
on public.payment_sessions (status, expires_at);

