# Deployment Workflow (GitHub → Netlify + Vercel)

## 1) Create GitHub Repo
From GitHub:
- Create a new repository: `childcareclinicapp`

From local:
```bash
# from repo root (childcareclinicapp)
git init
git add .
git commit -m "Initial blueprint"
git branch -M main
git remote add origin <YOUR_GITHUB_URL>
git push -u origin main
```

## 2) Supabase Setup
1. Create Supabase project.
2. Run SQL:
   - `supabase/schema.sql`
   - `supabase/rls-policies.sql`
3. Seed vaccines (optional):
   - Insert into `public.vaccines`
   - Insert vaccination_records per child as needed.

### Required Supabase env vars
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)

## 3) Backend (Vercel)
### Option A: Vercel Node API (Express)
1. Create a Vercel project pointing to this repo.
2. Configure framework/build:
   - Use `apps/api` as the root (Vercel supports monorepos; you may need `vercel.json` depending on UI).
3. Set Environment Variables in Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CORS_ORIGIN` (your Netlify URL)

### Install dependencies locally to confirm
```bash
cd apps/api
npm install
npm run dev
```
Then test:
- `GET http://localhost:3000/api/health` (not implemented above; health is at `/health`)
- `GET http://localhost:3000/health`

> Note: This blueprint uses `express`. Vercel may require custom server support or adaptation to serverless functions.
> If you hit issues, tell me and I’ll convert routes to Vercel serverless handlers.

## 4) Frontend (Netlify)
### Build settings
This frontend is **static** (no bundler) but uses ES modules in JS.
To make it work reliably on Netlify:
- Put `apps/web` content in Netlify site.

Netlify Setup:
1. Create Netlify site from Git.
2. Set Publish directory: `apps/web`
3. Environment variables:
   - Configure `API_BASE_URL` by editing code or using Netlify Build env + runtime injection.

Simplest approach for now (recommended):
- Replace in `apps/web/js/api.js`:
  - `API_BASE_URL` default `http://localhost:3000/api`

### If you want runtime env without rebuild
Use a `window.API_BASE_URL` injected script tag during build. (If you want this, I can add it.)

## 5) Auth Token Integration (important)
The frontend template expects:
- `localStorage.getItem('sb_access_token')`

So you must wire Supabase Auth login flow (or adapt the template to Supabase Auth helpers).

## 6) Production Hardening
- Replace `requireAuth.js` minimal JWT decode with proper JWT verification (JWKS) or use Supabase auth helpers.
- Consider backend CORS allowed origins (no `*` in production).
- Add rate limiting and stricter validation.

