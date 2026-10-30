import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/config — list all remote config
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const configs = await db.remoteConfig.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(configs);
}

// POST /api/admin/config — create new config
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const body = await req.json();
  const config = await db.remoteConfig.create({
    data: {
      key: body.key,
      value: String(body.value),
      type: body.type || "STRING",
      description: body.description || null,
    },
  });
  return NextResponse.json(config, { status: 201 });
}
