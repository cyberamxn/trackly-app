import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key.
 * This bypasses RLS and is ONLY for use in API routes / server components.
 *
 * CRITICAL: NEVER import this in client components. The service role key
 * must never be exposed to the browser.
 *
 * Primary: environment variables
 * Fallback: hardcoded URL (safe — it's public), service role from env only
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
}

// Lazily create client — only fail when actually used AND key is missing
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required. Add it to .env (without NEXT_PUBLIC_ prefix). " +
      "Find it in Supabase Dashboard → Settings → API → service_role key."
    );
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

/**
 * Safe wrapper — returns null if service role not configured.
 * Useful for routes that should gracefully degrade.
 */
export function tryGetSupabaseAdmin() {
  if (!serviceRoleKey) return null;
  return getSupabaseAdmin();
}
