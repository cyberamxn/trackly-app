import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/coupons
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const coupons = await db.coupon.findMany({ include: { plan: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(coupons);
}

// POST /api/admin/coupons
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const body = await req.json();
  const coupon = await db.coupon.create({
    data: {
      code: body.code.toUpperCase(),
      discountPercent: body.discountPercent || 10,
      maxRedemptions: body.maxRedemptions || 100,
      redemptions: 0,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      active: body.active ?? true,
      notes: body.notes || null,
      planId: body.planId || null,
    },
  });
  await logAction(session!.user.id, "CREATE_COUPON", "COUPON", coupon.id, { code: coupon.code });
  return NextResponse.json(coupon, { status: 201 });
}
