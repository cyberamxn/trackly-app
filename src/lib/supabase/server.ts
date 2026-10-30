import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the anon key.
 * Safe for use in API routes — RLS still applies, so this respects
 * user-scoped policies (no service role bypass).
 *
 * Primary: environment variables
 * Fallback: hardcoded values (prevents crashes when .env is lost/reset)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL and anon key are required");
}

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
