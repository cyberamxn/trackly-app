import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/public/notifications/cleanup
 *
 * Lazy fallback for the 24h auto-delete. The primary mechanism is the
 * pg_cron job in scripts/enable-notifications-cleanup-cron.sql — but if
 * pg_cron isn't available or the user hasn't run that SQL yet, this
 * endpoint can be called periodically (e.g. by a Vercel Cron, GitHub
 * Action, or the first GET of the day from any client) to delete
 * notifications older than 24 hours.
 *
 * Public — safe to call without auth (the WHERE clause is deterministic
 * and only affects expired rows). Returns the count of deleted rows.
 */
export async function POST() {
  try {
    const sb = supabaseServer as any;
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await sb
      .from("notifications")
      .delete()
      .or(`sent_at.lt.${cutoff},and(sent_at.is.null,created_at.lt.${cutoff})`)
      .select("id");

    if (error) throw new Error(error.message);

    const deletedCount = Array.isArray(data) ? data.length : 0;
    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      cutoff,
    });
  } catch (error: any) {
    console.error("[/api/public/notifications/cleanup] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
