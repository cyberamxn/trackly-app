import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/settings
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const settings = await db.systemSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(settings);
}

// PUT /api/admin/settings — bulk update
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const body = await req.json();
  const updates = body.updates || []; // [{ key, value }]

  for (const u of updates) {
    await db.systemSetting.upsert({
      where: { key: u.key },
      update: { value: String(u.value), type: u.type || "STRING" },
      create: { key: u.key, value: String(u.value), type: u.type || "STRING" },
    });
  }

  return NextResponse.json({ success: true });
}

// POST /api/admin/settings — create new setting
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN"]);
  if (error) return error;
  const body = await req.json();
  const setting = await db.systemSetting.create({
    data: {
      key: body.key,
      value: String(body.value),
      type: body.type || "STRING",
    },
  });
  return NextResponse.json(setting, { status: 201 });
}
