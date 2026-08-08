# Child Care Clinic Appointment System (Full-Stack Blueprint)

This repository is currently a **from-scratch** blueprint for a responsive appointment system.

## Tech Stack
- **Frontend:** HTML, CSS, Vanilla JS
- **Backend:** Node.js (API)
- **Database/Auth:** Supabase (Postgres + Supabase Auth)
- **Deploy:** Netlify (frontend), Vercel (backend)

## Key Modules
- Dashboard: upcoming appointments + user token status
- Appointment Booking: select child, date, time, reason
- Child Profiles: CRUD (Name, DOB, Blood Group, Health Concerns)
- Vaccination Tracker: upcoming/due and completed vaccinations
- Visit History: past visits
- Contact/Support: clinic details + doctor info + WhatsApp/Directions

## Project Structure (Recommended)
See `docs/architecture.md`.

## Supabase Schema
See `supabase/schema.sql` and `supabase/rls-policies.sql`.

## Backend
See `apps/api/`.

## Frontend
See `apps/web/`.

## Deployment Workflow
See `docs/deploy.md`.

## 💳 UPI QR Payment Feature

The app includes an optional **UPI QR code payment** flow for booking appointments:

- A **payment modal** opens automatically after booking, and can also be opened from the dashboard via the **Pay Now** button.
- It renders a **dynamic UPI QR code** (`upi://pay` string) that works with **Google Pay, PhonePe, Paytm**, and any other UPI app.
- After scanning and paying, the user enters their **UPI Transaction ID / UTR** and optional reference, then clicks **Verify & Confirm**.
- The backend saves `payment_status` (`pending`/`paid`), `upi_transaction_id`, `upi_transaction_ref`, and `paid_at` on the appointment row.

### Configuration

Add these env vars to `apps/api/.env` (or the Vercel environment):

```env
UPI_ID=childcareclinic@upi          # your actual UPI ID
UPI_PAYEE_NAME=Child Care Clinic     # shown as the payee name
UPI_PAYEE_NOTE=Appointment Fee       # note shown in the UPI app
UPI_AMOUNT=500                       # default consultation fee (₹)
UPI_CURRENCY=INR
```

### Database migration

Run `supabase/schema.sql` in the Supabase SQL editor. The payment columns are added **idempotently** so existing installations can apply it safely:

```sql
alter table public.appointments add column if not exists fee_amount numeric(10,2) not null default 0;
alter table public.appointments add column if not exists payment_status text not null default 'pending';
alter table public.appointments add column if not exists upi_transaction_id text;
alter table public.appointments add column if not exists upi_transaction_ref text;
alter table public.appointments add column if not exists paid_at timestamptz;
```

### API endpoints

| Method | Endpoint                        | Description                                  |
| ------ | ------------------------------- | -------------------------------------------- |
| GET    | `/api/payments/config`          | Public UPI config (id, payee, amount, note)   |
| POST   | `/api/appointments`             | Create appointment (accepts payment fields)   |
| PATCH  | `/api/appointments/:id/payment` | Mark paid with txn id + reference             |

### Files changed

- `supabase/schema.sql` — payment columns on `appointments`
- `apps/api/src/lib/env.js` — UPI config defaults
- `apps/api/src/routes/payments.routes.js` — `GET /payments/config`
- `apps/api/src/routes/appointments.routes.js` — payment fields + `PATCH /:id/payment`
- `apps/api/src/index.js` — register payments routes
- `apps/web/index.html` — payment modal + QR library CDN + Payment column
- `apps/web/css/styles.css` — modal, QR, badge, UPI app-button styles
- `apps/web/js/ui/payment.js` — QR render, UPI deep links, txn verify
- `apps/web/js/ui/booking.js` — auto-open modal after booking
- `apps/web/js/ui/dashboard.js` — payment badge + Pay Now button

