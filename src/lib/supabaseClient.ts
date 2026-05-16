import { createClient } from '@supabase/supabase-js';

/**
 * App-owned Supabase client.
 *
 * This module is the single source of truth for the Supabase connection.
 * It intentionally uses env vars NOT managed by Lovable (VITE_APP_SUPABASE_*)
 * so the project can run against your own Supabase instance.
 *
 * Configure values in `.env.local` (git-ignored):
 *   VITE_APP_SUPABASE_URL=https://<your-project-ref>.supabase.co
 *   VITE_APP_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
 */

const url = import.meta.env.VITE_APP_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_APP_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_APP_SUPABASE_URL and VITE_APP_SUPABASE_ANON_KEY in .env.local',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
