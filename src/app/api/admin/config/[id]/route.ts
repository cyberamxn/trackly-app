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
  const config = await db.remoteConfig.update({
    where: { id },
    data: {
      ...(body.value !== undefined && { value: String(body.value) }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.description !== undefined && { description: body.description }),
    },
  });
  await logAction(session!.user.id, "UPDATE_REMOTE_CONFIG", "REMOTE_CONFIG", id, body);
  return NextResponse.json(config);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const { id } = await params;
  await db.remoteConfig.delete({ where: { id } });
  await logAction(session!.user.id, "DELETE_REMOTE_CONFIG", "REMOTE_CONFIG", id);
  return NextResponse.json({ success: true });
}
