import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireActiveMember, logActivity, fetchProfiles, displayName } from "@/lib/groups/server";
import { validateExpenseInput } from "@/lib/groups/expenseInput";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/groups/[id]/expenses/[expenseId]
 * Edit an expense (creator or admin). Splits are fully replaced after
 * server-side validation.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id, expenseId } = await params;
  const membership = await requireActiveMember(id, user.id);
  if (!membership) return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });

  try {
    const expense = await db.groupExpense.findUnique({ where: { id: expenseId } });
    if (!expense || expense.groupId !== id) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    if (expense.deletedAt) return NextResponse.json({ error: "This expense was deleted" }, { status: 400 });
    if (expense.createdBy !== user.id && membership.role !== "admin") {
      return NextResponse.json({ error: "Only the creator or admin can edit this expense" }, { status: 403 });
    }

    const group = await db.group.findUnique({ where: { id }, select: { archived: true } });
    if (group?.archived) return NextResponse.json({ error: "This group is archived" }, { status: 400 });

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const validated = await validateExpenseInput(id, user.id, membership.role === "admin", body);
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: validated.status });

    const profile = (await fetchProfiles([user.id]))[user.id];
    const { splitRows, ...expenseData } = validated.data;

    await db.$transaction(async (tx) => {
      await tx.groupExpense.update({ where: { id: expenseId }, data: expenseData });
      await tx.groupExpenseSplit.deleteMany({ where: { expenseId } });
      await tx.groupExpenseSplit.createMany({
        data: splitRows.map((r) => ({
          expenseId,
          userId: r.userId,
          amountPaise: r.amountPaise,
          shares: r.shares,
        })),
      });
    });

    await logActivity(id, user.id, "expense_updated", `${displayName(profile)} updated "${validated.data.title}"`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/groups/[id]/expenses/[expenseId] PATCH]", e);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

/**
 * DELETE /api/groups/[id]/expenses/[expenseId]
 * Soft-delete (audit trail preserved). Creator or admin only.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id, expenseId } = await params;
  const membership = await requireActiveMember(id, user.id);
  if (!membership) return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });

  try {
    const expense = await db.groupExpense.findUnique({ where: { id: expenseId } });
    if (!expense || expense.groupId !== id) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    if (expense.deletedAt) return NextResponse.json({ error: "Already deleted" }, { status: 400 });
    if (expense.createdBy !== user.id && membership.role !== "admin") {
      return NextResponse.json({ error: "Only the creator or admin can delete this expense" }, { status: 403 });
    }

    const profile = (await fetchProfiles([user.id]))[user.id];

    await db.groupExpense.update({ where: { id: expenseId }, data: { deletedAt: new Date() } });
    await logActivity(id, user.id, "expense_deleted", `${displayName(profile)} deleted "${expense.title}"`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/groups/[id]/expenses/[expenseId] DELETE]", e);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
