import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/security/audit — list audit logs
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";
  const adminId = url.searchParams.get("adminId") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "30");

  const where: any = {};
  if (action) where.action = { contains: action };
  if (adminId) where.adminId = adminId;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { admin: { select: { id: true, name: true, email: true, role: true } } },
    }),
    db.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
}
