import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/content — list with optional type filter
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const where: any = {};
  if (type) where.type = type;
  const content = await db.content.findMany({ where, orderBy: { createdAt: "asc" } });
  return NextResponse.json(content);
}

// POST /api/admin/content — create
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN", "SUPPORT"]);
  if (error) return error;
  const body = await req.json();
  const content = await db.content.create({
    data: {
      type: body.type,
      key: body.key || null,
      title: body.title,
      body: body.body || "",
      metadata: JSON.stringify(body.metadata || {}),
      active: body.active ?? true,
    },
  });
  await logAction(session!.user.id, "CREATE_CONTENT", "CONTENT", content.id, { type: body.type, title: body.title });
  return NextResponse.json(content, { status: 201 });
}
