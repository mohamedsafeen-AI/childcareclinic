# CHILD CARE CLINIC — FULL PROJECT PROMPT (ENGLISH)

This document contains the complete, full-length english prompt/blueprint for the entire **Child Care Clinic Appointment System** project. Use it to understand, rebuild, extend, or re-generate the whole application from scratch.

---

## 1. PROJECT OVERVIEW

Build a **premium, responsive, multi-specialty paediatric (child care) clinic management and patient portal** web application. It is a full-stack, "from-scratch" blueprint that lets a parent/guardian manage their children's healthcare: book appointments, add child profiles, track vaccinations, view visit history, manage patient billing/invoices, and pay consultation fees online via **UPI QR codes**.

The app is a **patient portal** (single logged-in user perspective), not a hospital-admin back office. It emphasizes a polished, modern, dashboard-style UI with animated KPIs, charts, toasts, and premium styling.

### Goals
- Clear separation between **frontend** and **backend**.
- Simple deployment: **Netlify** (frontend), **Vercel** (backend).
- Keep **Supabase** logic centralized in the backend for security.
- Provide a complete **UPI QR payment** flow with dynamic QR rendering and webhook verification.

### Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES Modules) — no bundler/build step.
- **Backend:** Node.js + Express (REST API, CommonJS).
- **Database / Auth:** Supabase (PostgreSQL + Supabase Auth).
- **Deployment:** Netlify (static frontend), Vercel (Node API).
- **Key libraries:** express, cors, helmet, dotenv, joi (validation), jsonwebtoken, @supabase/supabase-js (service-role), qrcodejs (CDN for QR rendering).

---

## 2. MONOREPO STRUCTURE

```text
childcareclinicapp/
├── README.md                     # Project blueprint + payment feature docs
├── TODO.md                       # Current task notes (QR fix)
├── apps/
│   ├── web/                      # Frontend (static, Netlify)
│   │   ├── index.html            # Single-page app shell
│   │   ├── css/styles.css        # All styling (premium theme)
│   │   ├── images/mygpayqr.jpeg  # Static QR fallback image
│   │   ├── js/
│   │   │   ├── api.js            # Global API fetch wrapper (token auth)
│   │   │   ├── main.js           # Entry point (imports all UI modules)
│   │   │   ├── enhancements.js   # UI polish (ripple, charts, toasts, tables)
│   │   │   └── ui/
│   │   │       ├── router.js     # Lightweight hash-based SPA router
│   │   │       ├── dashboard.js  # Home/KPIs/appointments table/timeline
│   │   │       ├── booking.js    # Appointment booking form
│   │   │       ├── children.js   # Child profiles CRUD
│   │   │       ├── vaccinations.js # Vaccination trackerView
│   │   │       ├── visits.js     # Visit history viewer
│   │   │       ├── billing.js    # Invoices + print receipts
│   │   │       ├── support.js    # Contact / clinic details
│   │   │       └── payment.js    # UPI QR payment modal
│   │   └── check-css-tail.ps1    # PowerShell helper (CSS)
│   └── api/                      # Backend (Node/Express, Vercel)
│       ├── package.json
│       ├── src/
│       │   ├── index.js          # Express app entry + route mounting
│       │   ├── middleware/
│       │   │   ├── asyncHandler.js # Wrap async route handlers
│       │   │   └── requireAuth.js  # Auth guard (mock JWT user)
│       │   ├── lib/
│       │   │   ├── env.js          # Environment config (Supabase + UPI)
│       │   │   ├── supabaseAdmin.js# Service-role Supabase client
│       │   │   ├── paymentGateway.js # UPI URI + HMAC signing helpers
│       │   │   ├── validation.js   # Joi validation middleware
│       │   │   └── README.md
│       │   └── routes/
│       │       ├── dashboard.routes.js
│       │       ├── appointments.routes.js
│       │       ├── children.routes.js
│       │       ├── vaccinations.routes.js
│       │       ├── visits.routes.js
│       │       └── payments.routes.js
├── supabase/
│   ├── schema.sql                # Full DB schema + payment tables
│   ├── rls-policies.sql          # Row Level Security policies
│   └── migrations/
│       └── 002_add_payment_sessions_expires_at.sql # idempotent migrations
└── docs/
    ├── architecture.md           # Recommended monorepo architecture
    ├── deploy.md                 # GitHub → Netlify + Vercel workflow
    └── full-project-prompt.md    # THIS document
```

---

## 3. FRONTEND — USER INTERFACE

### 3.1 App Shell (`index.html`)
A single-page responsive layout composed of:
- **Sidebar** — brand logo, navigation links (Dashboard, Book Appointment, Children, Vaccinations, Visit History, Billing, Contact/Support), and a 24/7 Emergency card (phone `+91 98039 20203`).
- **Topbar** — mobile sidebar toggle, dynamic page heading + live date/time, global search, notifications button (with pulse dot), "Book Appointment" primary button, and a profile chip (Patient Portal · Premium Member).
- **Main content area** — route-based pages rendered by showing/hiding `<section data-page>` blocks.
- **Footer** — copyright.
- **Toast container** — for success/error/info/warning notifications.
- **Payment modal** — a hidden overlay for the UPI QR payment flow.

### 3.2 Routing (`js/ui/router.js`)
- Hash-based SPA navigation (`#dashboard`, `#booking`, …).
- `showPage(route)` toggles `.hidden` on page sections, updates active nav + topbar heading, and lazily invokes page loader functions when a route opens:
  - `dashboard` → `__loadDashboardPage`
  - `booking` → `__loadChildrenForSelect`
  - `children` → `__loadChildrenTable`
  - `vaccinations` → `__loadVaccinationsPage`
  - `visits` → `__loadVisitsPage`
  - `billing` → `__loadBillingPage`
- Supports `data-route-jump` buttons anywhere in the app to jump to a route.
- On `load`, reads the hash (or defaults to `#dashboard`) and sets the footer year.

### 3.3 API Wrapper (`js/api.js`)
- `API_BASE = 'http://localhost:3000/api'`.
- `apiFetch(endpoint, options)`:
  - Reads `localStorage.getItem('token')` and sends it as `Authorization: Bearer <token>`.
  - JSON-stringifies object bodies; parses JSON responses.
  - Throws an `Error` with the server's `error` message on non-OK responses.

### 3.4 Dashboard (`js/ui/dashboard.js`)
- Loads **appointments** (`GET /dashboard`) and **children** (`GET /children`), with a **localStorage fallback** if the API fetch fails.
- **KPIs:** Total Children, Total Appointments.
- Detects newly added appointments/children and shows a toast notification.
- Sorts appointments upcoming-first by date+time.
- Assigns a **stable sequential "Appt No."** based on booking timestamp so numbering is consistent across All/Scheduled/Paid/Pending filter tabs.
- Renders an **Upcoming Appointments table** with columns: #, Name, Date, Time, Status, Reason, Payment, Actions.
  - Payment badge: `badge-paid` (green) or `badge-pending` (amber).
  - For pending payments, a **"Pay Now"** button opens the payment modal with the appointment fee.
  - A **delete (×)** button removes the appointment via `DELETE /appointments/:id`.
- Renders a **Recent Activity timeline**, including both appointment status events AND "Payment Received" entries (with UTR and amount) for paid appointments.
- **Real-time updates:** listens for `appointments:changed`, `children:changed`, and `appointments:payment_updated` custom events; also polls every 10s while the dashboard is visible.

### 3.5 Booking (`js/ui/booking.js`)
- Loads children into the "Select Child" dropdown via `GET /children`.
- Form fields: Child (dropdown), Date, Time, Doctor Name, Reason (textarea).
- "Tomorrow" button pre-fills tomorrow's date.
- On submit → `POST /appointments` → success toast, resets form, dispatches `appointments:changed`, then navigates to `#dashboard`.

### 3.6 Children (`js/ui/children.js`)
- "Add Child" form (Full Name, DOB, Blood Group, Health Concerns) → `POST /children`.
- Renders a children table (Name, DOB, Blood, Concerns, Delete) via `GET /children`.
- Delete (×) → `DELETE /children/:id` → reloads table, refreshes booking/vaccination dropdowns, dispatches `children:changed`.

### 3.7 Vaccinations (`js/ui/vaccinations.js`)
- Loads children into a dropdown, then on "Load Records" renders a **standard immunization schedule**:
  - BCG (Birth Dose), Hepatitis B (Dose 1), Oral Polio OPV 0, Pentavalent (Dose 1), Rotavirus (Dose 1), Fractional IPV (Dose 1), Pneumococcal Conjugate (Dose 1), with due ages (At Birth / 6 Weeks).
- Each row has a **"Done"** button (`window.markDone`) that flips status from Pending → Completed.

### 3.8 Visits (`js/ui/visits.js`)
- Loads children into a dropdown; on "Load History" it fetches `/appointments` and filters by the selected child.
- Renders a Past Visits table (Date, Doctor, Reason, Time) with 24h→12h (AM/PM) time formatting.

### 3.9 Billing (`js/ui/billing.js`)
- Builds **bills** from appointment records (via `GET /appointments`), normalised by `toBill()`: id, childName, appointmentId, date/time, amount, status (paid/pending), txnId, paidAt.
- **Billing summary cards:** Total Billed (₹), Paid (count), Pending (count).
- **Invoices & Records table:** Patient Name, Appointment ID, Date, Amount, Payment Status (badge), Invoice button.
- **Search** by patient name and **filter chips** (All / Paid / Pending).
- **Invoice printing:** opens a new window with a styled, print-ready invoice (clinic header, bill-to details, charges, payment status, txn id, paid date) and Print/Save-PDF button.
- Auto-refreshes on `appointments:payment_updated` and `appointments:changed` events.

### 3.10 Support (`js/ui/support.js`) — static page in `index.html`
- **Clinic Details:** Address (Child Care Clinic, 20/14, Opp. to C.S.I Church, North Street, Kilakarai, Ramanathapuram-623517) and Phone (04567-243111 / +91 98039 20203).
- **Doctor Info:** Dr. Muhammed Hasheem, M.B.B.S., M.D., Paediatric Consultant; consulting hours Morning 11:30 AM–2:30 PM, Evening 7:00–10:30 PM.
- **Quick Actions:** WhatsApp (`wa.me/919803920203`), Call Phone, Copy Phone (clipboard).
- **Directions:** Embedded Google Map iframe of the clinic.

### 3.11 Payment Modal (`js/ui/payment.js`)
Opened via `window.__openPaymentModal(appointmentId, amount)` (also called automatically by booking after creation via dashboard "Pay Now").
- Loads payment config (`GET /payments/config`) for the TTL.
- Creates a payment session (`POST /payments/session`) and **renders a dynamic scannable QR** from `session.upi_uri` into `#payment-qr`:
  - Uses global `QRCode` (qrcodejs) rendered to canvas.
  - **Lazy-loads** qrcodejs if missing, then re-renders.
  - **Fallback:** encodes the UPI URI via the `api.qrserver.com` image API if the library can't load.
  - Clears the static image so the box is never blank.
- Sets UPI app deep links (Google Pay, PhonePe, Paytm) to the same `upi_uri`.
- **Countdown timer** on the QR hint showing seconds remaining before expiry.
- **Polls** `GET /payments/session/:id` every 2s — when `paid`, auto-verifies, shows a success toast, dispatches events, and closes; when `expired`, shows an error.
- **Dev "Simulate Payment"** button: calls `POST /payments/simulate/:id` to get a valid signed callback, then replays it into `POST /payments/webhook`.
- **Manual verification form** (fallback): user enters UPI Transaction ID/UTR + optional reference → `PATCH /appointments/:id/payment` with `payment_status: 'paid'`.
- "Pay Later" closes the modal (payment stays pending; can pay later from dashboard).

### 3.12 Enhancements (`js/enhancements.js`)
Pure visual/interaction layer (no API/data mutation):
1. Ripple effect on `.btn`, `.nav-link`, `.icon-btn`, `.chip`.
2. Scroll-reveal animation for `.reveal` elements (via IntersectionObserver).
3. Animated counters for `[data-count-to]` elements.
4. Live topbar date/time (updates every 30s).
5. **Canvas charts:** a teal gradient **area/line trend chart** (fake weekly data) and a **donut chart** (Scheduled / Completed / Pending) — enhanced for devicePixelRatio.
6. Table tools for the appointments table: search, filter chips, column sorting, **pagination** (6 per page), live results count, and a MutationObserver to re-apply filters on reload.
7. Global search that filters the visible table on the current page.
8. Mobile sidebar toggle + backdrop.
9. Notifications pulse dot.
10. **`window.showToast(title, message, type, duration)`** — a toast notification system (success/info/warning/error) used across the app.

---

## 4. BACKEND — REST API (Node.js + Express)

### 4.1 Server Entry (`apps/api/src/index.js`)
- Middleware: `helmet()`, `cors({ origin: "*" })`, `express.json()`.
- `GET /health` → `{ ok: true }`.
- Mounts routers under `/api/...`:
  - `/api/dashboard`, `/api/children`, `/api/appointments`, `/api/vaccinations`, `/api/visits`, `/api/payments`.
- A central error handler returns `{ error: message }` with the appropriate status code.
- Listens on `env.PORT` (default 3000).

### 4.2 Environment Config (`lib/env.js`)
Requires (throws if missing):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

Optional/defaulted:
- `PORT` (3000), `CORS_ORIGIN` (`*`).
- **UPI payment defaults:**
  - `UPI_ID` → `childcareclinic@upi`
  - `UPI_PAYEE_NAME` → `Child Care Clinic`
  - `UPI_PAYEE_NOTE` → `Appointment Fee`
  - `UPI_AMOUNT` → `250`
  - `UPI_CURRENCY` → `INR`
- `PAYMENT_WEBHOOK_SECRET` (dev fallback `dev-insecure-webhook-secret-change-me`).
- `PAYMENT_SESSION_TTL_MINUTES` (default 10).

### 4.3 Supabase Admin Client (`lib/supabaseAdmin.js`)
- Creates a server-side Supabase client using the **service-role key** (never exposed to the browser). `auth.persistSession: false`.

### 4.4 Payment Gateway (`lib/paymentGateway.js`)
- `generateTxnRef(appointmentId)` — builds a unique, single-use txn reference (`CCC` + short id + random hex).
- `buildUpiPayUri({ payeeName, upiId, amount, txnRef, note })` — builds a `upi://pay?pa=...&pn=...&am=...&cu=INR&tr=...&tn=...&purpose=P2P` URI for the QR.
- `signCallback(payload)` / `verifyCallback(payload, signature)` — HMAC-SHA256 signing using a canonical payload string `txn_ref|amount|status|gateway_transaction_id|timestamp`. Verification uses **constant-time comparison** (`crypto.timingSafeEqual`).

### 4.5 Validation (`lib/validation.js`)
- `validate(schema)` — Joi middleware that validates `req.body` (`abortEarly:false`, `stripUnknown:true`) and sets `req.body` to the sanitized value; returns 400 with error details on failure.

### 4.6 Middleware
- **`asyncHandler(fn)`** — wraps async route handlers to forward rejected promises to the error handler.
- **`requireAuth()`** — currently a **mock** that sets `req.user = { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', accessToken: 'mock-token' }`. (Production note: replace with real JWT/JWKS or Supabase Auth verification.)

### 4.7 Routes

#### Dashboard (`routes/dashboard.routes.js`)
- `GET /api/dashboard` (auth) → all appointments for the user, sorted by `appointment_date` ascending. Returns `{ appointments: [...] }`.

#### Children (`routes/children.routes.js`)
- `GET /` (auth) → all children for the user, newest first. Returns `{ children: [...] }`.
- `POST /` (auth) → create a child. Accepts `full_name`/`name`, `dob`/`date_of_birth`, `blood_group`, `health_concerns`. Requires a name. Returns `{ child }`.
- `DELETE /:id` (auth) → delete the user's child.

#### Appointments (`routes/appointments.routes.js`)
- `GET /` (auth) → all appointments for the user, ordered by date.
- `POST /` (auth) → book an appointment. Accepts `child_id`, `appointment_date`, `appointment_time`, `doctor_name`, `reason`, plus payment fields (`fee_amount`, `payment_status`, `upi_transaction_id`, `upi_transaction_ref`). Resolves the child's name, applies default fee from `UPI_AMOUNT`, sets `paid_at` if paid, and inserts. Returns `{ success, appointment }`.
- `PATCH /:id/payment` (auth) → update payment status (`pending`|`paid`); requires `upi_transaction_id` when marking paid; verifies the appointment belongs to the user; sets `paid_at`. Returns `{ appointment }`.
- `DELETE /:id` (auth) → delete the user's appointment.

#### Vaccinations (`routes/vaccinations.routes.js`)
- `GET /api/vaccinations?child_id=` (auth) → all vaccination records for the user, optionally filtered by child. Returns a plain array (or `[]` on error). *(Note: Frontend currently uses hardcoded standard vaccines, not this endpoint.)*

#### Visits (`routes/visits.routes.js`)
- `GET /api/visits?cid=` or `?child_id=` (auth) → appointments for a specific child, newest first. Returns `{ visits: [...] }`.

#### Payments (`routes/payments.routes.js`)
- `GET /api/payments/config` (auth) → public UPI config (upiId, payeeName, note, amount, currency, sessionTtlMinutes).
- `POST /api/payments/session` (auth) → creates a **short-lived payment session**:
  - Validates the appointment belongs to the user and is `pending` (rejects if already paid; 404 if missing).
  - Expires any stale pending sessions for that appointment.
  - Computes amount (body.amount → appointment.fee_amount → env.UPI_AMOUNT).
  - Generates txn ref + UPI URI, computes `expires_at` from TTL, inserts into `payment_sessions`, returns `{ session }`.
- `GET /api/payments/session/:id` (auth) → polls a session; auto-expires it if past `expires_at` while pending. Returns `{ session }`.
- `POST /api/payments/webhook` (NO auth — trusts signature) → the secure payment gateway callback:
  1. Verifies the HMAC signature (`X-Payment-Signature` header or body `signature`); 401 on failure.
  2. Ignores non-`success` statuses.
  3. Looks up the session by `txn_ref` (404 if unknown).
  4. Validates amount match (409 on mismatch).
  5. Rejects expired sessions (410).
  6. Idempotent — returns `alreadyPaid:true` if already paid.
  7. Marks the session `paid` (with gateway_transaction_id + signature).
  8. Updates the appointment to `paid` with txn id/ref and `paid_at`.
- `POST /api/payments/simulate/:id` (auth, dev-only) → generates a **valid signed callback** for a session so the entire flow can be proven end-to-end without a live bank. Returns `{ simulated, signature, payload, webhookUrl }`.

---

## 5. DATABASE — SUPABASE (PostgreSQL)

### 5.1 Tables (`supabase/schema.sql`)
- **`profile`** — user profile tied to `auth.users(id)`; fields: `token_status`, `token_last_updated_at`, `full_name`, `phone`, `role`, timestamps; `set_updated_at()` trigger.
- **`children`** — `user_id`, `full_name`, `dob`, `blood_group`, `health_concerns`; unique `(user_id, full_name, dob)`.
- **`appointments`** — `user_id`, `child_id`, `appointment_date`, `appointment_time`, `reason`, `status` (`scheduled|checked_in|completed|cancelled`), **payment fields** (`fee_amount`, `payment_status` `pending|paid`, `upi_transaction_id`, `upi_transaction_ref`, `paid_at`), `completed_at`; unique `(child_id, appointment_date, appointment_time)`. Idempotent `add column if not exists` for payment columns.
- **`vaccines`** — vaccine catalog (`name`, `description`, `due_in_days`, `is_active`).
- **`vaccination_records`** — `user_id`, `child_id`, `vaccine_id`, `vaccine_name`, `scheduled_date`, `due_date`, `administered_date`, `dose_number`, `notes`, `status` (`upcoming|due|completed`); unique `(child_id, vaccine_name, dose_number)`.
- **`visits`** — `user_id`, `child_id`, `appointment_id`, `visit_date`, `doctor_name`, `diagnosis`, `notes`.
- **`payment_sessions`** — `user_id`, `appointment_id`, `amount`, `txn_ref` (unique), `upi_uri`, `status` (`pending|paid|expired`), `created_at`, `expires_at`, `paid_at`, `gateway_transaction_id`, `gateway_signature`. Includes idempotent migration columns.
- **Indexes** on appointments (user/date/time, child), vaccination_records (child/due), visits (user/date), payment_sessions (appointment, txn_ref, status/expires).
- **`expire_payment_sessions()`** — stored function to mark stale pending sessions expired.

### 5.2 Migration (`supabase/migrations/002_add_payment_sessions_expires_at.sql`)
- Idempotently adds `expires_at` and other callback columns to `payment_sessions` if missing (for installations where the table pre-existed).

### 5.3 RLS Policies (`supabase/rls-policies.sql`)
- Enables RLS on all tables.
- **Ownership policies** (select/insert/update/delete) where `user_id = auth.uid()` for profile, children, appointments, vaccination_records, visits, payment_sessions (select/insert only).
- **vaccines**: read-only policy for authenticated users (no write policies).
- **payment_sessions**: users may select/insert their own, but **no update policy** — status transitions (`pending → paid/expired`) are done by the backend via the **service-role key** (bypasses RLS), preventing a client from marking its own payment as paid.

---

## 6. UPI QR PAYMENT FLOW (END TO END)

1. User books an appointment (or clicks **Pay Now** on a pending row).
2. Frontend opens the payment modal and calls `POST /api/payments/config` → gets amount, payee, currency, TTL.
3. Calls `POST /api/payments/session` → backend builds a unique `upi://pay` URI with a single-use `tr` (txn ref), stores a payment session (status `pending`, `expires_at` = now + TTL), and returns `{ session }`.
4. Frontend **renders a dynamic QR** from `session.upi_uri` (qrcodejs canvas, with image-API fallback), sets UPI app deep links, and shows a live countdown.
5. User scans/uses any UPI app (Google Pay, PhonePe, Paytm) and pays.
6. Frontend **polls** `GET /api/payments/session/:id` every 2s.
7. In production, the **payment gateway** calls `POST /api/payments/webhook` with a signed payload. The backend verifies the HMAC signature, matches the session by `txn_ref`, validates amount & expiry, marks the session and appointment `paid`, and records txn id/ref + `paid_at`.
8. The poll detects `paid` → success toast → dispatches `appointments:payment_updated` → dashboard tables/badges and billing refresh → modal closes.
9. **Dev-only simulation:** "Simulate Payment" asks `POST /api/payments/simulate/:id` for a valid signature, then replays it into the webhook to test the whole flow offline.

---

## 7. ENVIRONMENT VARIABLES

### Backend (`apps/api/.env` or Vercel)
```env
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
PORT=3000
CORS_ORIGIN=*

# UPI payment config
UPI_ID=childcareclinic@upi
UPI_PAYEE_NAME=Child Care Clinic
UPI_PAYEE_NOTE=Appointment Fee
UPI_AMOUNT=250
UPI_CURRENCY=INR

# Payment security
PAYMENT_WEBHOOK_SECRET=<long-random-secret>
PAYMENT_SESSION_TTL_MINUTES=10
```

### Frontend
- `API_BASE` in `apps/web/js/api.js` defaults to `http://localhost:3000/api` (or `window.API_BASE_URL` override).
- Auth token stored in `localStorage.getItem('token')` (`Authorization: Bearer ...`).

---

## 8. RUNNING & DEPLOYMENT

### Local development
```bash
# Backend
cd apps/api
npm install
npm run dev          # node --watch src/index.js → http://localhost:3000

# Frontend (open the static app)
# Open apps/web/index.html in a browser, or serve the folder.
```

### Deployment
- **Supabase:** create a project, run `supabase/schema.sql` and `supabase/rls-policies.sql`, optionally seed `vaccines`.
- **Backend → Vercel:** deploy `apps/api` with the env vars above (may need `vercel.json` / serverless adaptation for Express).
- **Frontend → Netlify:** publish dir `apps/web`; set `API_BASE_URL` for production.

### Production hardening (documented)
- Replace the mock `requireAuth.js` with proper JWT verification (JWKS) or Supabase auth helpers.
- Restrict CORS origins (no `*`).
- Wire a real Supabase Auth login flow (`sb_access_token`).
- Add rate limiting & stricter validation.

---

## 9. KEY CUSTOM EVENTS & GLOBAL FUNCTIONS

- Custom events dispatched app-wide:
  - `appointments:changed` — refresh dashboard + billing.
  - `appointments:payment_updated` — refresh dashboard + billing after a payment.
  - `children:changed` — refresh dashboard + dropdowns.
- Exposed on `window`:
  - `window.showToast(title, message, type, duration)`.
  - `window.__loadDashboardPage`, `__loadChildrenForSelect`, `__loadChildrenTable`, `__loadVaccinationsPage`, `__loadVisitsPage`, `__loadBillingPage`.
  - `window.__openPaymentModal(appointmentId, amount)` / `window.__closePaymentModal()`.
  - `window.markDone(key)` (vaccination complete toggle).

---

## 10. CURRENT OPEN TASK (from TODO.md)

**Goal:** Fix blank QR code display in the payment modal.
- Root cause: `payment.js` relied on a static image instead of rendering a dynamic QR from the fetched session's `upi_uri`.
- Fix implemented: added `renderQr(upiUri)` using the global `QRCode` (qrcodejs) with lazy-loading and an image-API fallback; wired it to `session.upi_uri` after creating the session; clears the `#payment-qr` container so the static image is replaced; CSS already styles `#payment-qr canvas` and `img` (180px, centered, white frame).

---

## 11. SUMMARY OF CAPABILITIES

A single-user patient portal offering:
- 📊 Dashboard with KPIs, charts, live appointments table, filters/sort/pagination, and activity timeline.
- 📅 Appointment booking (select child, date, time, doctor, reason).
- 👶 Child profile management (add/delete; name, DOB, blood group, health concerns).
- 💉 Vaccination schedule tracker.
- 🕑 Visit history viewer.
- 🧾 Billing/invoices with print-ready receipts.
- 💳 UPI QR payment (dynamic QR, verified webhook, dev simulation).
- 📞 Contact/support with clinic details, doctor info, WhatsApp/call, and Google Map directions.
- 🎨 Premium responsive UI with animations, toasts, and rich interactions.

