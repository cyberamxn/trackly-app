import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";

/**
 * PATCH /api/admin/refunds/[id]
 *
 * Update a refund's status. Body: { status: "APPROVED" | "COMPLETED" | "REJECTED" }
 *
 * Flow: PENDING → APPROVED → COMPLETED  (or PENDING → REJECTED)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  const allowedStatuses = ["APPROVED", "COMPLETED", "REJECTED"];
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status. Use APPROVED, COMPLETED, or REJECTED" }, { status: 400 });
  }

  const existing = await db.refund.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Refund not found" }, { status: 404 });
  }

  // Enforce flow: can't go from REJECTED back to APPROVED, etc.
  if (existing.status === "COMPLETED" && status !== "COMPLETED") {
    return NextResponse.json({ error: "Completed refunds cannot be modified" }, { status: 400 });
  }
  if (existing.status === "REJECTED" && status !== "REJECTED") {
    return NextResponse.json({ error: "Rejected refunds cannot be modified" }, { status: 400 });
  }

  const updated = await db.refund.update({
    where: { id },
    data: { status },
  });

  await logAction(session!.user.id, `REFUND_${status}`, "REFUND", id, { previousStatus: existing.status, newStatus: status });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/admin/refunds/[id]
 *
 * Permanently delete a refund (only allowed if still PENDING).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const existing = await db.refund.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Refund not found" }, { status: 404 });
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending refunds can be deleted" }, { status: 400 });
  }

  await db.refund.delete({ where: { id } });
  await logAction(session!.user.id, "DELETE_REFUND", "REFUND", id, {});

  return NextResponse.json({ success: true });
}
