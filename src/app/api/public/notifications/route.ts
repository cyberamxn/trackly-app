import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/groups/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/public/notifications?userId=<uuid>
 *
 * Returns all SENT notifications visible to this user, plus their read state.
 *
 * TTL: notifications older than 24 hours are EXCLUDED so the user's view
 * stays clean — the admin-side list (Prisma) keeps the historical record.
 *
 * Auth: caller's Supabase JWT must match the requested userId (audit fix —
 * previously anyone could read/mark another user's notification state).
 */
export async function GET(req: NextRequest) {
  try {
    const caller = await getAppUser(req);
    if (!caller) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    if (userId !== caller.id) {
      return NextResponse.json({ error: "userId does not match the authenticated user" }, { status: 403 });
    }

    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    // Cast to any — we don't have generated types for the new notifications table
    const sb = supabaseServer as any;

    // 24-hour cutoff — auto-expire old notifications from the user-facing view
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [notifRes, readsRes] = await Promise.all([
      sb
        .from("notifications")
        .select("id,title,body,target,sent_at,created_at")
        .eq("status", "SENT")
        .gte("sent_at", cutoff)
        .order("sent_at", { ascending: false })
        .limit(50),
      sb
        .from("user_notification_reads")
        .select("notification_id,read_at")
        .eq("user_id", userId),
    ]);

    if (notifRes.error) throw new Error(notifRes.error.message);
    if (readsRes.error) throw new Error(readsRes.error.message);

    const reads = new Map((readsRes.data || []).map((r: any) => [r.notification_id, r.read_at]));

    const notifications = (notifRes.data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      target: n.target,
      sentAt: n.sent_at,
      read: reads.has(n.id),
      readAt: reads.get(n.id) || null,
    }));

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((n: any) => !n.read).length,
    });
  } catch (error: any) {
    console.error("[/api/public/notifications] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/public/notifications
 *
 * Body variants:
 *   { userId, notificationId }                       — mark ONE notification as read
 *   { userId, markAllRead: true }                    — mark ALL unread notifications as read
 *   { userId, markAllRead: true, notificationIds: [] } — mark only the given IDs as read
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await getAppUser(req);
    if (!caller) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const { userId, notificationId, markAllRead, notificationIds } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    if (userId !== caller.id) {
      return NextResponse.json({ error: "userId does not match the authenticated user" }, { status: 403 });
    }

    const sb = supabaseServer as any;

    // ===== Mark ALL as read =====
    if (markAllRead) {
      // Either use the supplied list of IDs, or fetch all unread SENT
      // notifications in the 24h window and mark every one of them read.
      let idsToMark: string[] = Array.isArray(notificationIds) ? notificationIds : [];

      if (idsToMark.length === 0) {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: allRows, error: listErr } = await sb
          .from("notifications")
          .select("id")
          .eq("status", "SENT")
          .gte("sent_at", cutoff);
        if (listErr) throw new Error(listErr.message);
        idsToMark = (allRows || []).map((r: any) => r.id);
      }

      if (idsToMark.length === 0) {
        return NextResponse.json({ success: true, marked: 0 });
      }

      const rows = idsToMark.map((id: string) => ({
        user_id: userId,
        notification_id: id,
        read_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await sb
        .from("user_notification_reads")
        .upsert(rows, { onConflict: "user_id,notification_id" });

      if (upsertErr) throw new Error(upsertErr.message);
      return NextResponse.json({ success: true, marked: idsToMark.length });
    }

    // ===== Mark ONE as read (legacy path) =====
    if (!notificationId) {
      return NextResponse.json({ error: "notificationId or markAllRead required" }, { status: 400 });
    }

    const { error } = await sb
      .from("user_notification_reads")
      .upsert({
        user_id: userId,
        notification_id: notificationId,
        read_at: new Date().toISOString(),
      }, { onConflict: "user_id,notification_id" });

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[/api/public/notifications] POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
