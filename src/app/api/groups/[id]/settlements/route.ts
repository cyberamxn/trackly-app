import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireActiveMember, logActivity, fetchProfiles, displayName } from "@/lib/groups/server";
import { formatMoney } from "@/lib/groups/calc";

export const dynamic = "force-dynamic";

const MAX_AMOUNT_PAISE = 10_000_000_000;

/**
 * POST /api/groups/[id]/settlements  { fromUserId, toUserId, amountPaise, note? }
 * Record a repayment. A member records payments THEY made; the admin may
 * record on behalf of any member. Status starts as "pending" until the
 * receiver (or admin) confirms.
 * NOTE: a recorded repayment is a claim, not proof of a real transfer.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const membership = await requireActiveMember(id, user.id);
  if (!membership) return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const fromUserId = String(body.fromUserId ?? "");
    const toUserId = String(body.toUserId ?? "");
    const amountPaise = Math.round(Number(body.amountPaise));
    const note = String(body.note ?? "").slice(0, 200);

    if (!fromUserId || !toUserId || fromUserId === toUserId) {
      return NextResponse.json({ error: "Choose two different members" }, { status: 400 });
    }
    if (!Number.isFinite(amountPaise) || amountPaise <= 0 || amountPaise > MAX_AMOUNT_PAISE) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (fromUserId !== user.id && membership.role !== "admin") {
      return NextResponse.json({ error: "You can only record repayments you made yourself" }, { status: 403 });
    }

    // Both users must belong to this group's history (active, removed or left —
    // removed members may still legitimately settle outstanding dues)
    const members = await db.groupMember.findMany({ where: { groupId: id } });
    const memberIds = new Set(members.map((m) => m.userId));
    if (!memberIds.has(fromUserId) || !memberIds.has(toUserId)) {
      return NextResponse.json({ error: "Both users must be group members" }, { status: 400 });
    }

    const profiles = await fetchProfiles([fromUserId, toUserId]);
    const fromName = displayName(profiles[fromUserId]);
    const toName = displayName(profiles[toUserId]);

    // Duplicate prevention + create ATOMICALLY — a concurrent duplicate
    // either sees the row inside the transaction or hits the partial unique
    // index (uniq_pending_settlement) and fails with P2002. No double-count.
    let settlement;
    try {
      settlement = await db.$transaction(async (tx) => {
        const dup = await tx.groupSettlement.findFirst({
          where: { groupId: id, fromUserId, toUserId, amountPaise, status: "pending" },
        });
        if (dup) throw new Error("DUPLICATE_PENDING");
        return await tx.groupSettlement.create({
          data: { groupId: id, fromUserId, toUserId, amountPaise, note, createdBy: user.id },
        });
      });
    } catch (txErr: any) {
      if (txErr?.message === "DUPLICATE_PENDING" || txErr?.code === "P2002") {
        return NextResponse.json({ error: "This repayment is already recorded and awaiting confirmation" }, { status: 400 });
      }
      throw txErr;
    }
    await logActivity(
      id,
      user.id,
      "settlement_recorded",
      `${fromName} recorded a repayment of ${formatMoney(amountPaise)} to ${toName}`
    );

    return NextResponse.json({ ok: true, settlementId: settlement.id }, { status: 201 });
  } catch (e: any) {
    console.error("[/api/groups/[id]/settlements POST]", e);
    return NextResponse.json({ error: "Failed to record repayment" }, { status: 500 });
  }
}
