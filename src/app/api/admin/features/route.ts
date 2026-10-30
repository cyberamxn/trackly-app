import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/features
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const flags = await db.featureFlag.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(flags);
}

// POST /api/admin/features — create new feature flag
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const body = await req.json();
  const flag = await db.featureFlag.create({
    data: {
      key: body.key,
      name: body.name,
      description: body.description || null,
      enabled: body.enabled ?? false,
      rolloutPercent: body.rolloutPercent ?? 0,
      minAppVersion: body.minAppVersion || null,
    },
  });
  await logAction(session!.user.id, "CREATE_FEATURE_FLAG", "FEATURE_FLAG", flag.id, { key: flag.key });
  return NextResponse.json(flag, { status: 201 });
}
