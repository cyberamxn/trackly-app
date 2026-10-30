import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireActiveMember, logActivity, fetchProfiles, displayName } from "@/lib/groups/server";
import { validateExpenseInput } from "@/lib/groups/expenseInput";

export const dynamic = "force-dynamic";

/**
 * POST /api/groups/[id]/expenses
 * Add a group expense. Members may add expenses paid by themselves;
 * the admin may add an expense paid by any member.
 * Splits are (re)computed/validated on the server.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const membership = await requireActiveMember(id, user.id);
  if (!membership) return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });

  try {
    const group = await db.group.findUnique({ where: { id }, select: { archived: true, currency: true } });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    if (group.archived) return NextResponse.json({ error: "This group is archived — reopen it to add expenses" }, { status: 400 });

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

    const expense = await db.$transaction(async (tx) => {
      const created = await tx.groupExpense.create({
        data: {
          groupId: id,
          ...expenseData,
          currency: group.currency,
          createdBy: user.id,
        },
      });
      await tx.groupExpenseSplit.createMany({
        data: splitRows.map((r) => ({
          expenseId: created.id,
          userId: r.userId,
          amountPaise: r.amountPaise,
          shares: r.shares,
        })),
      });
      return created;
    });

    await logActivity(id, user.id, "expense_added", `${displayName(profile)} added "${validated.data.title}"`);

    return NextResponse.json({ ok: true, expenseId: expense.id }, { status: 201 });
  } catch (e: any) {
    console.error("[/api/groups/[id]/expenses POST]", e);
    return NextResponse.json({ error: "Failed to add expense" }, { status: 500 });
  }
}
