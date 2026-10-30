import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/auth/check-username?username=xyz
 * Checks if a username is available (not taken by anyone)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const username = url.searchParams.get("username")?.trim().toLowerCase();

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }
    if (username.length < 4) {
      return NextResponse.json({ available: false, reason: "Minimum 4 characters required" });
    }
    if (username.length > 20) {
      return NextResponse.json({ available: false, reason: "Maximum 20 characters allowed" });
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json({ available: false, reason: "Only lowercase letters, numbers, and underscores allowed" });
    }

    const sb = supabaseServer as any;
    const { data, error } = await sb
      .from("profiles")
      .select("username")
      .eq("username", username)
      .limit(1);

    if (error) {
      // Table might not exist yet — allow the username
      return NextResponse.json({ available: true, warning: "Profile table not ready" });
    }

    if (data && data.length > 0) {
      return NextResponse.json({ available: false, reason: "Username already taken" });
    }

    return NextResponse.json({ available: true });
  } catch (error: any) {
    console.error("[/api/auth/check-username] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/auth/check-username
 * Body: { username }
 * Same check via POST (for convenience)
 */
export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    const clean = (username || "").trim().toLowerCase();

    if (!clean) return NextResponse.json({ error: "Username required" }, { status: 400 });
    if (clean.length < 4) return NextResponse.json({ available: false, reason: "Minimum 4 characters" });
    if (clean.length > 20) return NextResponse.json({ available: false, reason: "Maximum 20 characters" });
    if (!/^[a-z0-9_]+$/.test(clean)) return NextResponse.json({ available: false, reason: "Only a-z, 0-9, _" });

    const sb = supabaseServer as any;
    const { data, error } = await sb.from("profiles").select("username").eq("username", clean).limit(1);

    if (error) return NextResponse.json({ available: true, warning: "Table not ready" });
    if (data && data.length > 0) return NextResponse.json({ available: false, reason: "Already taken" });

    return NextResponse.json({ available: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
