import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/subscriptions — list with filters
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const q = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const where: any = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { transactionId: { contains: q } },
      { user: { email: { contains: q } } },
      { user: { name: { contains: q } } },
    ];
  }

  const [subs, total] = await Promise.all([
    db.userSubscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: true, plan: true },
    }),
    db.userSubscription.count({ where }),
  ]);

  return NextResponse.json({ subscriptions: subs, total, page, limit, totalPages: Math.ceil(total / limit) });
}
