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
  const plan = await db.plan.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.tier !== undefined && { tier: body.tier }),
      ...(body.billingPeriod !== undefined && { billingPeriod: body.billingPeriod }),
      ...(body.priceCents !== undefined && { priceCents: body.priceCents }),
      ...(body.currency !== undefined && { currency: body.currency }),
      ...(body.features !== undefined && { features: JSON.stringify(body.features) }),
      ...(body.trialDays !== undefined && { trialDays: body.trialDays }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  });
  await logAction(session!.user.id, "UPDATE_PLAN", "PLAN", id, body);
  return NextResponse.json(plan);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const { id } = await params;
  await db.plan.delete({ where: { id } });
  await logAction(session!.user.id, "DELETE_PLAN", "PLAN", id);
  return NextResponse.json({ success: true });
}
