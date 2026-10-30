import { NextRequest, NextResponse } from "next/server";
import { getAppUser } from "@/lib/groups/server";
import { db } from "@/lib/db";
import {
  ensureReferralTables, normalizeCode, hashDevice, hashIp, usageDayKey,
  REF_CLAIM_WINDOW_HOURS, REF_DEVICE_CAP, REF_IP_CAP, REFEREE_WELCOME_BONUS,
} from "@/lib/referrals/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/referrals/claim — body { code, deviceId? }
 * Called by the app once after signup/login when a stored ref code exists
 * (link clicked → localStorage 30d → signup → claim).
 *
 * ANTI-FRAUD (all server-side, "koi fayeda na utha sake"):
 *  1. invalid_code      — code must exist
 *  2. self_referral     — code owner ≠ claimer, AND claimer's device ≠
 *                         the owner's tracked device (same-phone farming)
 *  3. too_old           — account must be < 48h old (existing users can't
 *                         farm each other's codes)
 *  4. already_referred  — one claim per account, forever (unique refereeId)
 *  5. device_limit      — ≤ 2 referees per device hash
 *  6. ip_limit          — ≤ 10 referees per IP hash in the last 7 days
 *                         (CGNAT-safe: high ceiling, bulk-farm blocker)
 * Completion is SEPARATE — the referrer only earns after the referee's
 * first REAL usage (see /api/referrals/activate).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAppUser(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (!(await ensureReferralTables())) {
      return NextResponse.json({ error: "Referral storage unavailable" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const code = normalizeCode((body as any)?.code);
    if (!code) return NextResponse.json({ error: "invalid_code" }, { status: 404 });

    const codeRow = await db.referralCode.findUnique({ where: { code } });
    if (!codeRow) return NextResponse.json({ error: "invalid_code" }, { status: 404 });
    if (codeRow.userId === user.id) {
      return NextResponse.json({ error: "self_referral" }, { status: 400 });
    }

    // Account age window — only genuinely fresh accounts can be referees
    if (user.createdAt) {
      const ageH = (Date.now() - new Date(user.createdAt).getTime()) / 3600_000;
      if (Number.isFinite(ageH) && ageH > REF_CLAIM_WINDOW_HOURS) {
        return NextResponse.json({ error: "too_old" }, { status: 400 });
      }
    }

    // One referee account = one referral, forever
    const existing = await db.referral.findUnique({ where: { refereeId: user.id }, select: { status: true } });
    if (existing) {
      return NextResponse.json({ error: "already_referred", status: existing.status }, { status: 400 });
    }

    // Device id: X-Device-Id header (how the client sends it) or body fallback
    const deviceId = req.headers.get("x-device-id") || (body as any)?.deviceId || null;
    const deviceHash = hashDevice(deviceId);
    const ipHash = hashIp(req);

    // Self-referral by device: the claimer is on the code owner's phone
    if (deviceHash && codeRow.lastDeviceHash && deviceHash === codeRow.lastDeviceHash) {
      return NextResponse.json({ error: "self_referral" }, { status: 400 });
    }

    // Device + IP farming caps
    if (deviceHash) {
      const sameDevice = await db.referral.count({ where: { deviceHash } });
      if (sameDevice >= REF_DEVICE_CAP) {
        return NextResponse.json({ error: "device_limit" }, { status: 429 });
      }
    }
    if (ipHash) {
      const weekAgo = new Date(Date.now() - 7 * 86400_000);
      const sameIp = await db.referral.count({ where: { ipHash, createdAt: { gte: weekAgo } } });
      if (sameIp >= REF_IP_CAP) {
        return NextResponse.json({ error: "ip_limit" }, { status: 429 });
      }
    }

    await db.referral.create({
      data: {
        code,
        referrerId: codeRow.userId,
        refereeId: user.id,
        status: "PENDING",
        deviceHash,
        ipHash,
        welcomeDayKey: usageDayKey(), // referee's +10 applies to THIS usage-day
      },
    });

    return NextResponse.json({
      status: "PENDING",
      welcomeBonus: REFEREE_WELCOME_BONUS,
      message: `Welcome bonus active — +${REFEREE_WELCOME_BONUS} AI messages today 🎉`,
    });
  } catch (e: any) {
    console.error("[/api/referrals/claim]", String(e?.message || e).slice(0, 200));
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
