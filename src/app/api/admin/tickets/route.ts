import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/tickets — list with filters
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const priority = url.searchParams.get("priority") || "";
  const q = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (q) {
    where.OR = [
      { subject: { contains: q } },
      { ticketNumber: { contains: q } },
      { userEmail: { contains: q } },
    ];
  }

  const [tickets, total] = await Promise.all([
    db.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { replies: true } },
      },
    }),
    db.supportTicket.count({ where }),
  ]);

  return NextResponse.json({ tickets, total, page, limit, totalPages: Math.ceil(total / limit) });
}

// POST /api/admin/tickets — create ticket on behalf of user
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const ticketNumber = `TK-${String(Date.now()).slice(-6)}`;
  const ticket = await db.supportTicket.create({
    data: {
      ticketNumber,
      userEmail: body.userEmail,
      subject: body.subject,
      body: body.body,
      status: "OPEN",
      priority: body.priority || "NORMAL",
      category: body.category || "GENERAL",
      userId: body.userId || null,
    },
  });
  return NextResponse.json(ticket, { status: 201 });
}
