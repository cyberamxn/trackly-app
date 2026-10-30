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
  const flag = await db.featureFlag.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      ...(body.rolloutPercent !== undefined && { rolloutPercent: body.rolloutPercent }),
      ...(body.minAppVersion !== undefined && { minAppVersion: body.minAppVersion }),
    },
  });
  await logAction(session!.user.id, "UPDATE_FEATURE_FLAG", "FEATURE_FLAG", id, body);
  return NextResponse.json(flag);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const { id } = await params;
  await db.featureFlag.delete({ where: { id } });
  await logAction(session!.user.id, "DELETE_FEATURE_FLAG", "FEATURE_FLAG", id);
  return NextResponse.json({ success: true });
}
