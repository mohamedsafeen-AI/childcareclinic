const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Server-side Supabase client using the service role.
// IMPORTANT: Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

module.exports = { supabaseAdmin };

