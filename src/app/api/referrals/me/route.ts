import { NextRequest, NextResponse } from "next/server";
import { getAppUser, fetchProfiles } from "@/lib/groups/server";
import { db } from "@/lib/db";
import {
  ensureReferralTables, getOrCreateCode, hashDevice,
  SITE_URL, bonusSummary,
} from "@/lib/referrals/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/referrals/me — the caller's referral code, live stats and the
 * people they invited (last 20). Creates the code on first call.
 * Tracks the caller's latest device (X-Device-Id) for self-referral
 * detection at claim time.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAppUser(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (!(await ensureReferralTables())) {
      return NextResponse.json({ error: "Referral storage unavailable" }, { status: 503 });
    }

    const code = await getOrCreateCode(user.id);
    if (!code) return NextResponse.json({ error: "Could not create code" }, { status: 500 });

    // Track the code owner's latest device — a claim arriving from the SAME
    // device is a self-referral attempt and gets rejected in /claim.
    const deviceHash = hashDevice(req.headers.get("x-device-id"));
    try {
      await db.referralCode.update({
        where: { userId: user.id },
        data: { lastSeenAt: new Date(), ...(deviceHash ? { lastDeviceHash: deviceHash } : {}) },
      });
    } catch { /* non-fatal — stats still serve */ }

    const [completed, pending, invites] = await Promise.all([
      db.referral.count({ where: { referrerId: user.id, status: "COMPLETED" } }),
      db.referral.count({ where: { referrerId: user.id, status: "PENDING" } }),
      db.referral.findMany({
        where: { referrerId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { refereeId: true, status: true, createdAt: true, completedAt: true },
      }),
    ]);

    // Referee display names via the service-role profiles lookup
    const profiles = await fetchProfiles(invites.map((i) => i.refereeId));
    const inviteList = invites.map((i) => {
      const p = profiles[i.refereeId];
      const name = p?.fullName || p?.username || (p?.email ? p.email.split("@")[0] : "Friend");
      return { name, status: i.status, invitedAt: i.createdAt, completedAt: i.completedAt };
    });

    return NextResponse.json({
      code,
      link: `${SITE_URL}/r/${code}`,
      stats: { ...bonusSummary(completed), pending },
      invites: inviteList,
    });
  } catch (e: any) {
    console.error("[/api/referrals/me]", String(e?.message || e).slice(0, 200));
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
