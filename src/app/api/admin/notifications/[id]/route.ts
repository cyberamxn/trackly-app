import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";
import { tryGetSupabaseAdmin } from "@/lib/supabase/admin";

// DELETE /api/admin/notifications/[id] — delete from BOTH Prisma and Supabase
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  // Look up Prisma record to find linked Supabase notification ID
  let supabaseNotifId: string | null = null;
  try {
    const notif = await db.pushNotification.findUnique({ where: { id } });
    if (notif?.targetValue?.startsWith("supabase_id:")) {
      supabaseNotifId = notif.targetValue.replace("supabase_id:", "");
    }
  } catch (e: any) {
    console.warn("[admin/notifications/delete] Could not look up Prisma record:", e.message);
  }

  // Delete from Supabase
  const supabaseAdmin = tryGetSupabaseAdmin();
  if (supabaseAdmin && supabaseNotifId) {
    try {
      const { error: supaErr } = await (supabaseAdmin as any).from("notifications").delete().eq("id", supabaseNotifId);
      if (supaErr) console.error("[admin/notifications/delete] Supabase delete failed:", supaErr.message);
    } catch (e: any) {
      console.error("[admin/notifications/delete] Supabase delete error:", e.message);
    }
  } else if (supabaseAdmin && !supabaseNotifId) {
    try {
      const notif = await db.pushNotification.findUnique({ where: { id } });
      if (notif) await (supabaseAdmin as any).from("notifications").delete().eq("title", notif.title);
    } catch (e: any) {
      console.warn("[admin/notifications/delete] Fallback title-based delete failed:", e.message);
    }
  }

  // Delete from Prisma
  try {
    await db.pushNotification.delete({ where: { id } });
  } catch (e: any) {
    if (!e.message.includes("Record to delete does not exist")) throw e;
  }

  await logAction(session!.user.id, "DELETE_NOTIFICATION", "PUSH_NOTIFICATION", id);
  return NextResponse.json({ success: true });
}
