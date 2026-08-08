# Architecture (Recommended Monorepo)

## Goals
- Clear separation between **frontend** and **backend**
- Simple deployment to **Netlify** (frontend) and **Vercel** (backend)
- Keep Supabase logic centralized in the backend

## Folder Structure

```text
childcareclinicapp/
  apps/
    web/                  # Netlify frontend (static)
      public/
        index.html        # or /index.html at root depending on your choice
        assets/
      src/
        js/
          api.js          # frontend API wrapper
          router.js       # lightweight routing (optional)
          ui/             # page modules
            dashboard.js
            booking.js
            children.js
            vaccinations.js
            visits.js
            support.js
          main.js
        css/
          styles.css
    api/                   # Vercel backend API (Node.js)
      src/
        index.js           # server entry
        routes/
          dashboard.routes.js
          appointments.routes.js
          children.routes.js
          vaccinations.routes.js
          visits.routes.js
        lib/
          env.js
          supabaseAdmin.js
          auth.js          # verify JWT and return user
          validation.js    # shared validation helpers
        middleware/
          asyncHandler.js
          requireAuth.js
        utils/
          errors.js
      package.json
      vercel.json           # optional
      .env.example
  packages/
    shared/                # optional
      src/
        types.js           # shared types/constants
  supabase/
    schema.sql
    rls-policies.sql
  docs/
    deploy.md
  README.md
  TODO.md
```

## Data Flow (Suggested)
1. **Frontend** gets session/JWT from Supabase Auth (or from your own login screen).
2. Frontend calls **Backend API** with `Authorization: Bearer <access_token>`.
3. Backend verifies token and uses **service role** for secure DB access (especially writes).
4. Backend returns JSON data; frontend renders UI.

> If you prefer to use Supabase directly in the browser for some reads, you can, but keeping writes behind the API is cleaner for consistency and security.

