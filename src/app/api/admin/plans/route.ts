import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/plans
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const plans = await db.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

  return NextResponse.json(plans);
}

// POST /api/admin/plans
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const plan = await db.plan.create({
    data: {
      name: body.name,
      tier: body.tier || "PREMIUM",
      billingPeriod: body.billingPeriod || "MONTHLY",
      priceCents: body.priceCents || 0,
      currency: body.currency || "INR",
      features: JSON.stringify(body.features || []),
      trialDays: body.trialDays || 0,
      active: body.active ?? true,
      sortOrder: body.sortOrder || 0,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
