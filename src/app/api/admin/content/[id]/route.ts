import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN", "SUPPORT"]);
  if (error) return error;
  const { id } = await params;
  const body = await req.json();
  const content = await db.content.update({
    where: { id },
    data: {
      ...(body.type !== undefined && { type: body.type }),
      ...(body.key !== undefined && { key: body.key }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.metadata !== undefined && { metadata: JSON.stringify(body.metadata) }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });
  await logAction(session!.user.id, "UPDATE_CONTENT", "CONTENT", id, body);
  return NextResponse.json(content);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const { id } = await params;
  await db.content.delete({ where: { id } });
  await logAction(session!.user.id, "DELETE_CONTENT", "CONTENT", id);
  return NextResponse.json({ success: true });
}
