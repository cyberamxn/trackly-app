"use client";

// ===================================================================
// PWA Google Sign-In — Safari bridge + relay pairing
// ===================================================================
// PROBLEM (iPhone, installed PWA / "Add to Home Screen"):
// The PWA (standalone WKWebView) has its OWN cookie jar — Google has no
// session cookies inside it. So the Google OAuth screen opened INSIDE the
// PWA never shows the account picker; it forces the full email+password
// form instead (what the user reported).
//
// FIX (device-pairing style flow):
// 1. PWA generates a one-time random `ticket`.
// 2. Google OAuth is opened in the REAL browser (Safari/Chrome) via
//    window.open — Google's cookies live there → account picker shows.
// 3. The OAuth redirect lands on /app/auth/bridge/<ticket> IN THE BROWSER,
//    which POSTs the session tokens to /api/public/pwa-relay with the ticket.
// 4. The PWA polls the relay with its ticket, receives the tokens and
//    calls supabase.auth.setSession() → signed in inside the PWA.
//
// The implicit OAuth flow is used for this path (tokens in the URL hash),
// because PKCE code exchange needs a code-verifier that only exists in the
// PWA's localStorage — which the browser cannot access.
// ===================================================================

import { createClient } from "@supabase/supabase-js";
import { supabase } from "./client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Separate client ONLY for generating the implicit-flow OAuth URL.
// (The main client stays on the safer PKCE flow for normal browser sign-in.)
let _implicitClient: ReturnType<typeof createClient> | null = null;
function getImplicitClient() {
  if (!_implicitClient) {
    _implicitClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit" as const,
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _implicitClient;
}

/** Is this page running as an installed standalone PWA? */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function randomTicket(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    // fallback for older WebKit
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Google sign-in for the installed PWA. Opens the real browser for the
 * account picker, then transfers the session back into the PWA through the
 * relay. Resolves when the PWA session is set, or with an error string.
 */
export async function googleSignInViaBrowser(options?: {
  onStatus?: (msg: string) => void;
}): Promise<{ error: string | null }> {
  const onStatus = options?.onStatus ?? (() => {});
  try {
    const ticket = randomTicket();
    const redirectTo = `${window.location.origin}/app/auth/bridge/${ticket}`;

    const client = getImplicitClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      return { error: error?.message ?? "Could not start Google sign-in" };
    }

    // Open Google in the user's real browser (Safari/Chrome) — the account
    // picker works there because Google's cookies exist.
    const opened = window.open(data.url, "_blank");
    if (!opened) {
      return {
        error:
          "Popup blocked. Allow popups for Trackly and tap Continue with Google again.",
      };
    }
    onStatus("Finish Google sign-in in your browser, then come back to Trackly…");

    // Poll the relay — the bridge page (in the browser) posts the tokens.
    // Wait up to ~3 minutes (user may type a password / 2FA).
    for (let i = 0; i < 90; i++) {
      await sleep(2000);
      try {
        const res = await fetch(`/api/public/pwa-relay?ticket=${ticket}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const body = await res.json();
          const session = body?.session as
            | { access_token: string; refresh_token: string }
            | undefined;
          if (session?.access_token && session?.refresh_token) {
            const { error: setErr } = await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });
            if (setErr) return { error: setErr.message };
            return { error: null };
          }
        }
        // 404/204 = not ready yet — keep polling
      } catch {
        // network hiccup — keep polling
      }
    }
    return {
      error:
        "Sign-in timed out. Make sure you completed Google sign-in in the browser, then try again.",
    };
  } catch (e: any) {
    return { error: e?.message ?? "Google sign-in failed" };
  }
}
