import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      user: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const body = await req.json();
  const ticket = await db.supportTicket.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || null }),
      ...(body.internalNotes !== undefined && { internalNotes: body.internalNotes }),
    },
  });
  await logAction(session!.user.id, "UPDATE_TICKET", "SUPPORT_TICKET", id, body);
  return NextResponse.json(ticket);
}
