import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureReferralTables, normalizeCode } from "@/lib/referrals/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/referrals/validate?code=XXXXXXX — PUBLIC (no auth).
 * Used by the landing page to greet an invited visitor with the
 * referrer's display name. Returns only { valid, name } — no ids,
 * no emails, nothing enumerable.
 */
export async function GET(req: NextRequest) {
  try {
    const code = normalizeCode(new URL(req.url).searchParams.get("code"));
    if (!code) return NextResponse.json({ valid: false });

    if (!(await ensureReferralTables())) {
      return NextResponse.json({ valid: false });
    }

    const codeRow = await db.referralCode.findUnique({
      where: { code },
      select: { userId: true },
    });
    if (!codeRow) return NextResponse.json({ valid: false });

    // Best-effort display name via profiles (service role) — first name only
    let name: string | null = null;
    try {
      const supa = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const res = await fetch(
        `${supa}/rest/v1/profiles?user_id=eq.${codeRow.userId}&select=full_name,username&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      if (res.ok) {
        const rows = await res.json();
        const row = rows?.[0];
        const raw = row?.full_name || row?.username || "";
        if (raw) name = String(raw).split(" ")[0].slice(0, 24); // "Rahul Sharma" → "Rahul"
      }
    } catch { /* name is decorative — silent fallback */ }

    return NextResponse.json({ valid: true, ...(name ? { name } : {}) });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
