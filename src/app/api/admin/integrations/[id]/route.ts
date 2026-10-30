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
  const integration = await db.integration.update({
    where: { id },
    data: {
      ...(body.connected !== undefined && { connected: body.connected }),
      ...(body.config !== undefined && { config: JSON.stringify(body.config) }),
      ...(body.connected && { lastSyncedAt: new Date() }),
    },
  });
  await logAction(session!.user.id, "UPDATE_INTEGRATION", "INTEGRATION", id, { connected: body.connected });
  return NextResponse.json(integration);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN"]);
  if (error) return error;
  const { id } = await params;
  await db.integration.update({
    where: { id },
    data: { connected: false, config: "{}", lastSyncedAt: null },
  });
  await logAction(session!.user.id, "DISCONNECT_INTEGRATION", "INTEGRATION", id);
  return NextResponse.json({ success: true });
}
