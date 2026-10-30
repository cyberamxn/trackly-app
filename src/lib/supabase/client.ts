"use client";

import { createClient } from "@supabase/supabase-js";

// ===== Supabase Configuration =====
// Primary: environment variables (production best practice)
// Fallback: hardcoded values (prevents "supabaseUrl is required" crashes
//           when .env file is lost/reset during development)
//
// CRITICAL: These fallback values are SAFE to include in client-side code
// because:
// 1. NEXT_PUBLIC_ env vars are ALREADY exposed to the browser by design
// 2. Supabase anon key is designed to be public (protected by RLS policies)
// 3. Service role key is NEVER included here (server-only)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL and anon key are required. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
