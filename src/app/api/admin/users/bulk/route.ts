import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { tryGetSupabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/lib/db";

/**
 * POST /api/admin/users/bulk — bulk actions on multiple users at once.
 *
 * Body: { ids: string[], action: "delete", hard?: boolean }
 *   - action "delete" + hard:true  → permanently delete every user + wipe their data
 *   - action "delete" + hard:false → ban every user (soft delete)
 *
 * Processes users in small concurrent batches (4 at a time) so a big cleanup
 * finishes fast without hammering the Supabase API. Returns a per-user result
 * summary so the UI can show exactly what happened.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: any) => typeof x === "string" && x) : [];
  const hard = !!body.hard;

  if (body.action !== "delete") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: "No user ids provided" }, { status: 400 });
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: "Max 100 users per bulk operation" }, { status: 400 });
  }

  const supabaseAdmin = tryGetSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured." }, { status: 503 });
  }
  const sb = supabaseAdmin as any;

  const deleteOne = async (id: string): Promise<{ id: string; ok: boolean; error?: string }> => {
    try {
      if (hard) {
        const supaTables = [
          "expenses", "incomes", "shopping", "borrow_lend", "habits", "notes",
          "calendar_events", "user_settings", "profiles", "office_data",
          "student_data", "trip_history", "student_history", "office_history",
          "user_notification_reads",
        ];
        const cleanups = supaTables.map((t) => sb.from(t).delete().eq("user_id", id));
        cleanups.push(
          db.premiumUser.deleteMany({ where: { userId: id } }).catch(() => null),
          db.aiUsage.deleteMany({ where: { userId: id } }).catch(() => null),
          db.referralCode.deleteMany({ where: { userId: id } }).catch(() => null),
          db.referral.deleteMany({ where: { OR: [{ referrerId: id }, { refereeId: id }] } }).catch(() => null),
        );
        await Promise.allSettled(cleanups);

        const { error: delErr } = await sb.auth.admin.deleteUser(id);
        if (delErr) return { id, ok: false, error: delErr.message };
      } else {
        const { error: banErr } = await sb.auth.admin.updateUserById(id, { ban_duration: "87600h" });
        if (banErr) return { id, ok: false, error: banErr.message };
      }
      return { id, ok: true };
    } catch (e: any) {
      return { id, ok: false, error: e.message || "Unknown error" };
    }
  };

  // Process in chunks of 4 — fast without overwhelming the API
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (let i = 0; i < ids.length; i += 4) {
    const chunk = ids.slice(i, i + 4);
    const chunkResults = await Promise.all(chunk.map(deleteOne));
    results.push(...chunkResults);
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  await logAction(session!.user.id, "BULK_DELETE_USERS", "APP_USER", undefined, {
    requested: ids.length,
    succeeded,
    failed: failed.length,
    hard,
  });

  return NextResponse.json({
    success: failed.length === 0,
    succeeded,
    failed: failed.length,
    results,
  });
}
