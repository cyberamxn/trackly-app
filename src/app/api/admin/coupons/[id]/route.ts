import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const { id } = await params;
  const body = await req.json();
  const coupon = await db.coupon.update({
    where: { id },
    data: {
      ...(body.code !== undefined && { code: body.code.toUpperCase() }),
      ...(body.discountPercent !== undefined && { discountPercent: body.discountPercent }),
      ...(body.maxRedemptions !== undefined && { maxRedemptions: body.maxRedemptions }),
      ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  await logAction(session!.user.id, "UPDATE_COUPON", "COUPON", id, body);
  return NextResponse.json(coupon);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const { id } = await params;
  await db.coupon.delete({ where: { id } });
  await logAction(session!.user.id, "DELETE_COUPON", "COUPON", id);
  return NextResponse.json({ success: true });
}
