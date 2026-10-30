import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";
import { tryGetSupabaseAdmin } from "@/lib/supabase/admin";

// GET /api/admin/notifications — list all notifications
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const notifications = await db.pushNotification.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notifications);
}

// POST /api/admin/notifications — create + send (or schedule)
// Writes to BOTH Prisma (admin panel state) AND Supabase (so users see it)
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();

  const { title, body: notifBody, target, targetValue, scheduledAt } = body;
  if (!title || !notifBody) {
    return NextResponse.json({ error: "Title and body required" }, { status: 400 });
  }
  if (title.length > 100) return NextResponse.json({ error: "Title too long (max 100 chars)" }, { status: 400 });
  if (notifBody.length > 500) return NextResponse.json({ error: "Body too long (max 500 chars)" }, { status: 400 });

  let status = "DRAFT";
  let sentAt: Date | null = null;
  let sentCount = 0;

  if (scheduledAt) {
    status = "SCHEDULED";
  } else if (body.sendNow) {
    status = "SENT";
    sentAt = new Date();
    const targetWhere: any = {};
    if (target === "PREMIUM") targetWhere.premium = true;
    else if (target === "FREE") targetWhere.premium = false;
    else if (target === "ACTIVE") targetWhere.status = "ACTIVE";
    sentCount = await db.appUser.count({ where: targetWhere });
  }

  const notification = await db.pushNotification.create({
    data: {
      title, body: notifBody, target: target || "ALL", targetValue: targetValue || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null, sentAt, status, sentCount,
      openedCount: 0, createdBy: session!.user.id,
    },
  });

  // Push to Supabase so app users see it
  let supabaseNotificationId: string | null = null;
  if (status === "SENT") {
    const supabaseAdmin = tryGetSupabaseAdmin();
    if (supabaseAdmin) {
      try {
        const { data: inserted, error: insertErr } = await (supabaseAdmin as any)
          .from("notifications").insert({
            title, body: notifBody, target: target || "ALL", target_value: targetValue || null,
            status: "SENT", sent_at: sentAt!.toISOString(),
            scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
            created_by: session!.user.id,
          }).select("id").single();
        if (insertErr) throw new Error(insertErr.message);
        if (inserted?.id) supabaseNotificationId = inserted.id;
      } catch (e: any) {
        console.error("[admin/notifications] Supabase insert failed:", e.message);
      }
    }
  }

  // Store Supabase ID back in Prisma for delete sync
  if (supabaseNotificationId) {
    try {
      await db.pushNotification.update({
        where: { id: notification.id },
        data: { targetValue: `supabase_id:${supabaseNotificationId}` },
      });
    } catch (e: any) {
      console.warn("[admin/notifications] Could not store Supabase ID:", e.message);
    }
  }

  await logAction(session!.user.id, "SEND_NOTIFICATION", "PUSH_NOTIFICATION", notification.id, { title, target, status });
  return NextResponse.json(notification, { status: 201 });
}
