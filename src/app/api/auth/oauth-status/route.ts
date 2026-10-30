import { NextResponse } from "next/server";

/**
 * GET /api/auth/oauth-status?origin=<url>
 *
 * Self-diagnosis: kya Supabase is origin ko OAuth redirect allow-list me
 * accept karta hai? Server-side probe — browser CORS Location header nahi
 * padh sakta, isliye yahan se karte hain.
 *
 * Method: GoTrue /auth/v1/verify endpoint bogus token ke saath call karo.
 * 303 Location header me jo redirect_to wapas aata hai:
 *   - agar wahi origin jo bheja tha → allow-listed → Google OAuth theek hai
 *   - agar KUCH AUR (Site URL fallback) aaya → Google OAuth is origin se
 *     broken hai — user sign-in ke baad purani/wrong site pe jayega.
 *
 * Harmless: token invalid hota hai, koi session nahi banta.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const origin = url.searchParams.get("origin");

    if (!origin || !/^https?:\/\//.test(origin)) {
      return NextResponse.json({ error: "valid origin required" }, { status: 400 });
    }

    // Normalize: signInWithGoogle `${origin}/` (trailing slash) bhejta hai —
    // Supabase wildcard entries bare origin ko reject karti hain. Probe EXACTLY
    // wahi URL test kare jo real OAuth flow bhejta hai.
    const normalized = origin.endsWith("/") ? origin : `${origin}/`;

    const probe = new URL(`${SUPABASE_URL}/auth/v1/verify`);
    probe.searchParams.set("token", "0".repeat(40)); // bogus — sirf redirect chain dekhni hai
    probe.searchParams.set("type", "recovery");
    probe.searchParams.set("redirect_to", normalized);

    const res = await fetch(probe.toString(), {
      method: "GET",
      redirect: "manual",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      cache: "no-store",
    });

    const location = res.headers.get("location") || res.headers.get("Location") || "";
    if (!location) {
      // Non-303 response — status hi bata do
      return NextResponse.json({
        ok: false,
        status: res.status,
        redirect: null,
        detail: "no-redirect",
      });
    }

    // Location me redirect_to ya fallback hoga — origin match check
    const locUrl = new URL(location);
    const probedOrigin = new URL(normalized);
    const ok = locUrl.origin === probedOrigin.origin;

    return NextResponse.json({
      ok,
      redirect: `${locUrl.origin}${locUrl.pathname}`,
      detail: ok ? "allow-listed" : "fallback",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message, detail: "probe-failed" },
      { status: 200 } // client graceful handling ke liye 200 hi
    );
  }
}
