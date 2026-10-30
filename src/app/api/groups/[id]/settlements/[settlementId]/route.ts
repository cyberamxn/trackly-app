import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireActiveMember, logActivity, fetchProfiles, displayName } from "@/lib/groups/server";
import { formatMoney } from "@/lib/groups/calc";

export const dynamic = "force-dynamic";

/**
 * POST /api/groups/[id]/settlements/[settlementId]  { action: "confirm" | "reject" }
 * The RECEIVER of the repayment (or the admin) confirms or rejects it.
 * Only confirmed settlements move balances.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; settlementId: string }> }
) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id, settlementId } = await params;
  const membership = await requireActiveMember(id, user.id);
  if (!membership) return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });

  try {
    const { action } = await req.json();
    const settlement = await db.groupSettlement.findUnique({ where: { id: settlementId } });
    if (!settlement || settlement.groupId !== id) {
      return NextResponse.json({ error: "Repayment not found" }, { status: 404 });
    }
    if (settlement.status !== "pending") {
      return NextResponse.json({ error: "This repayment was already " + settlement.status }, { status: 400 });
    }
    // Only the receiver or the admin can confirm/reject
    if (settlement.toUserId !== user.id && membership.role !== "admin") {
      return NextResponse.json({ error: "Only the receiver or the admin can confirm this repayment" }, { status: 403 });
    }

    const profiles = await fetchProfiles([settlement.fromUserId, settlement.toUserId]);
    const fromName = displayName(profiles[settlement.fromUserId]);
    const toName = displayName(profiles[settlement.toUserId]);

    if (action === "confirm") {
      await db.groupSettlement.update({
        where: { id: settlementId },
        data: { status: "confirmed", confirmedBy: user.id, confirmedAt: new Date() },
      });
      await logActivity(
        id,
        user.id,
        "settlement_confirmed",
        `${toName} confirmed a repayment of ${formatMoney(settlement.amountPaise)} from ${fromName}`
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      await db.groupSettlement.update({ where: { id: settlementId }, data: { status: "rejected" } });
      await logActivity(
        id,
        user.id,
        "settlement_rejected",
        `${toName} rejected a repayment of ${formatMoney(settlement.amountPaise)} from ${fromName}`
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("[/api/groups/[id]/settlements/[settlementId]]", e);
    return NextResponse.json({ error: "Failed to update repayment" }, { status: 500 });
  }
}
