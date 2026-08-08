-- Row Level Security (RLS) policies
-- Assumptions:
-- - public.profile.id = auth.uid()
-- - user_id columns in child/appointments/vaccination_records/visits match profile.id
-- - backend can use service role key for writes; still keep RLS strict for defense-in-depth.

-- Enable RLS
alter table public.profile enable row level security;
alter table public.children enable row level security;
alter table public.appointments enable row level security;
alter table public.vaccines enable row level security;
alter table public.vaccination_records enable row level security;
alter table public.visits enable row level security;

alter table public.payment_sessions enable row level security;

-- PROFILE
create policy "profile_select_own"
on public.profile
for select
using (id = auth.uid());

create policy "profile_update_own"
on public.profile
for update
using (id = auth.uid())
with check (id = auth.uid());

-- CHILDREN
create policy "children_select_own"
on public.children
for select
using (user_id = auth.uid());

create policy "children_insert_own"
on public.children
for insert
with check (user_id = auth.uid());

create policy "children_update_own"
on public.children
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "children_delete_own"
on public.children
for delete
using (user_id = auth.uid());

-- APPOINTMENTS
create policy "appointments_select_own"
on public.appointments
for select
using (user_id = auth.uid());

create policy "appointments_insert_own"
on public.appointments
for insert
with check (user_id = auth.uid());

create policy "appointments_update_own"
on public.appointments
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "appointments_delete_own"
on public.appointments
for delete
using (user_id = auth.uid());

-- VACCINES (catalog is global read-only)
-- If you want vaccines to be public to authenticated users:
create policy "vaccines_select_authenticated"
on public.vaccines
for select
using (true);

-- Vaccines writes usually happen via admin only.
-- No insert/update/delete policies.

-- VACCINATION RECORDS
create policy "vaccination_records_select_own"
on public.vaccination_records
for select
using (user_id = auth.uid());

create policy "vaccination_records_insert_own"
on public.vaccination_records
for insert
with check (user_id = auth.uid());

create policy "vaccination_records_update_own"
on public.vaccination_records
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "vaccination_records_delete_own"
on public.vaccination_records
for delete
using (user_id = auth.uid());

-- VISITS
create policy "visits_select_own"
on public.visits
for select
using (user_id = auth.uid());

create policy "visits_insert_own"
on public.visits
for insert
with check (user_id = auth.uid());

create policy "visits_update_own"
on public.visits
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "visits_delete_own"
on public.visits
for delete
using (user_id = auth.uid());

-- Optional: token status update trigger.
-- You can implement logic in backend when appointments are checked/completed.

-- PAYMENT SESSIONS
-- Users can read and create their own payment sessions.
create policy "payment_sessions_select_own"
on public.payment_sessions
for select
using (user_id = auth.uid());

create policy "payment_sessions_insert_own"
on public.payment_sessions
for insert
with check (user_id = auth.uid());

-- Note: Status updates (pending -> paid/expired) are performed by the backend
-- via the service-role key (bypassing RLS), so no update policy is granted to
-- regular users. This prevents a client from marking its own payment as paid.

