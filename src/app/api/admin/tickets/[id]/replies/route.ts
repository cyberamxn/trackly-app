import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { db } from "@/lib/db";

// POST /api/admin/tickets/[id]/replies — add a reply to a ticket
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const body = await req.json();

  const reply = await db.ticketReply.create({
    data: {
      ticketId: id,
      authorId: session!.user.id,
      authorType: body.authorType || "ADMIN",
      body: body.body,
    },
  });

  // Auto-update ticket status if it was OPEN
  const ticket = await db.supportTicket.findUnique({ where: { id } });
  if (ticket?.status === "OPEN") {
    await db.supportTicket.update({ where: { id }, data: { status: "IN_PROGRESS" } });
  }

  return NextResponse.json(reply, { status: 201 });
}
