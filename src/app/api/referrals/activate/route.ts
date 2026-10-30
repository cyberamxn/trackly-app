import { NextRequest, NextResponse } from "next/server";
import { getAppUser } from "@/lib/groups/server";
import { db } from "@/lib/db";
import {
  ensureReferralTables, refereeHasRealUsage, usageDayKey,
  REFEREE_COMPLETE_BONUS,
} from "@/lib/referrals/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/referrals/activate — called by the REFEREE's app (boot +
 * throttled retry) while their referral is PENDING. Completes the referral
 * only when the referee has REAL usage (first expense / task / note /
 * shopping / borrow-lend row, a habit with progress, or 3+ AI messages).
 * Body: { taskUsage?: boolean } — client-asserted signal that the referee
 * ticked/added a main-mode task (those live in localStorage only, the
 * server can never see them). Bare signups never complete — the referrer
 * earns nothing from empty accounts.
 *
 * Atomic: updateMany PENDING→COMPLETED so concurrent callers can't
 * double-complete or double-grant the referee's completion-day bonus.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAppUser(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (!(await ensureReferralTables())) {
      return NextResponse.json({ error: "Referral storage unavailable" }, { status: 503 });
    }

    const referral = await db.referral.findUnique({
      where: { refereeId: user.id },
      select: { id: true, status: true },
    });
    if (!referral) return NextResponse.json({ status: "none" });
    if (referral.status !== "PENDING") return NextResponse.json({ status: referral.status });

    // Real-usage gate — checked fresh on every attempt. taskUsage is the
    // client-asserted signal for main-mode tasks (localStorage-only, the
    // server can't see them — see refereeHasRealUsage for the trust model).
    const body = await req.json().catch(() => ({}));
    const clientTaskUsage = (body as any)?.taskUsage === true;
    if (!(await refereeHasRealUsage(user.id, clientTaskUsage))) {
      return NextResponse.json({ status: "PENDING" });
    }

    const today = usageDayKey();
    const upd = await db.referral.updateMany({
      where: { id: referral.id, status: "PENDING" },
      data: { status: "COMPLETED", completedAt: new Date(), rewardDayKey: today },
    });

    if (upd.count > 0) {
      return NextResponse.json({
        status: "COMPLETED",
        rewardBonus: REFEREE_COMPLETE_BONUS,
        message: `Referral complete 🎉 +${REFEREE_COMPLETE_BONUS} AI messages for you today — your friend earned their bonus too!`,
      });
    }
    // Lost the race with a concurrent call — it's already completed
    return NextResponse.json({ status: "COMPLETED", rewardBonus: 0 });
  } catch (e: any) {
    console.error("[/api/referrals/activate]", String(e?.message || e).slice(0, 200));
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
