import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/refunds
 *
 * List all refunds, newest first. Supports optional filtering by status
 * (PENDING | APPROVED | COMPLETED | REJECTED) and userId.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const userId = url.searchParams.get("userId");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

  const where: any = {};
  if (status) where.status = status.toUpperCase();
  if (userId) where.userId = userId;

  const refunds = await db.refund.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Hydrate with user + subscription info if available
  const userIds = [...new Set(refunds.map((r) => r.userId).filter(Boolean))] as string[];
  let userMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const users = await db.appUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });
    userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  }

  const enriched = refunds.map((r) => ({
    ...r,
    user: r.userId ? userMap[r.userId] || null : null,
  }));

  return NextResponse.json(enriched);
}

/**
 * POST /api/admin/refunds
 *
 * Create a new refund request. Body:
 *   { userId, subscriptionId?, amountCents, reason }
 *
 * New refunds always start as PENDING. They must be approved/completed via
 * PATCH /api/admin/refunds/[id].
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { userId, subscriptionId, amountCents, reason } = body;

  if (!amountCents || amountCents <= 0) {
    return NextResponse.json({ error: "Valid amountCents required" }, { status: 400 });
  }
  if (!reason || reason.trim().length < 3) {
    return NextResponse.json({ error: "Reason required (min 3 chars)" }, { status: 400 });
  }

  // Verify user exists (if provided)
  if (userId) {
    const user = await db.appUser.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  }

  const refund = await db.refund.create({
    data: {
      amountCents: Math.round(amountCents),
      reason: reason.trim(),
      status: "PENDING",
      userId: userId || null,
      subscriptionId: subscriptionId || null,
      processedBy: session!.user.id,
    },
  });

  await logAction(session!.user.id, "CREATE_REFUND", "REFUND", refund.id, { userId, amountCents, reason });

  return NextResponse.json(refund, { status: 201 });
}
