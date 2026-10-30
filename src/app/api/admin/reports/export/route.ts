import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/reports/export?type=users|revenue|subscriptions|tickets|activity&format=csv|json
export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "users";
  const format = url.searchParams.get("format") || "csv";

  let data: any[] = [];
  let filename = `${type}-report-${new Date().toISOString().slice(0, 10)}`;

  switch (type) {
    case "users": {
      data = await db.appUser.findMany({
        orderBy: { signupAt: "desc" },
        select: {
          id: true, email: true, name: true, country: true, status: true,
          premium: true, deviceModel: true, appVersion: true,
          totalExpenses: true, totalHabits: true, totalNotes: true,
          storageUsedMb: true, signupAt: true, lastActiveAt: true,
        },
      });
      break;
    }
    case "subscriptions": {
      data = await db.userSubscription.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, name: true } }, plan: { select: { name: true, tier: true } } },
      });
      data = data.map((s) => ({
        id: s.id, transactionId: s.transactionId, userEmail: s.user?.email,
        userName: s.user?.name, plan: s.plan?.name, tier: s.plan?.tier,
        status: s.status, amountCents: s.amountCents, currency: s.currency,
        paymentMethod: s.paymentMethod, startedAt: s.startedAt, currentPeriodEnd: s.currentPeriodEnd,
      }));
      break;
    }
    case "tickets": {
      data = await db.supportTicket.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, name: true } }, assignedTo: { select: { name: true } } },
      });
      data = data.map((t) => ({
        id: t.id, ticketNumber: t.ticketNumber, userEmail: t.userEmail,
        subject: t.subject, status: t.status, priority: t.priority, category: t.category,
        assignedTo: t.assignedTo?.name, createdAt: t.createdAt,
      }));
      break;
    }
    case "activity": {
      data = await db.activityEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
        include: { user: { select: { email: true } } },
      });
      data = data.map((e) => ({
        id: e.id, eventType: e.eventType, screen: e.screen,
        userEmail: e.user?.email, createdAt: e.createdAt,
      }));
      break;
    }
    case "revenue": {
      const subs = await db.userSubscription.findMany({
        where: { status: "ACTIVE" },
        include: { plan: true, user: { select: { email: true, name: true } } },
      });
      data = subs.map((s) => ({
        transactionId: s.transactionId, userEmail: s.user?.email, userName: s.user?.name,
        plan: s.plan?.name, amountCents: s.amountCents, currency: s.currency,
        paymentMethod: s.paymentMethod, startedAt: s.startedAt,
      }));
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  }

  if (format === "json") {
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  }

  // CSV format
  if (data.length === 0) {
    return new NextResponse("No data", { status: 200 });
  }
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const v = (row as any)[h];
        if (v === null || v === undefined) return "";
        if (v instanceof Date) return v.toISOString();
        const s = String(v);
        if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      }).join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
