API uses Supabase service role for DB access. Auth middleware decodes JWT to set req.user.id.

Production note:
- Replace requireAuth.js minimal decoder with proper JWT verification (JWKS) or supabase auth helpers.
- Keep service role key server-only.

