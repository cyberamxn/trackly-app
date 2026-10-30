import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { tryGetSupabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const supabaseAdmin = tryGetSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({
      configured: false,
      message: "SUPABASE_SERVICE_ROLE_KEY not set.",
      prismaFallback: { totalUsers: await db.appUser.count().catch(() => 0) },
    });
  }

  const sb = supabaseAdmin as any;
  try {
    const { data: authUsers, error: authErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authErr) throw new Error(authErr.message);

    const totalUsers = authUsers?.users?.length ?? 0;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const newSignupsToday = (authUsers?.users ?? []).filter((u: any) => new Date(u.created_at) >= todayStart).length;
    const newSignupsThisMonth = (authUsers?.users ?? []).filter((u: any) => new Date(u.created_at) >= monthStart).length;

    const tables = ["expenses", "incomes", "shopping", "borrow_lend", "habits", "notes", "calendar_events", "user_settings", "office_data", "student_data", "trip_history", "student_history", "office_history", "notifications"];
    // Table counts + recent notifications + user_settings (activity) ek hi parallel batch me
    const [tableCountsRes, recentNotifsRes, settingsRowsRes] = await Promise.all([
      (async () => {
        const counts: Record<string, number> = {};
        await Promise.all(tables.map(async (t) => {
          try {
            const { count } = await sb.from(t).select("*", { count: "exact", head: true });
            counts[t] = count ?? 0;
          } catch { counts[t] = -1; }
        }));
        return counts;
      })(),
      sb.from("notifications").select("id,title,body,target,status,sent_at,created_at").order("created_at", { ascending: false }).limit(5),
      sb.from("user_settings").select("user_id,settings"),
    ]);
    const counts = tableCountsRes;
    const recentNotifs = recentNotifsRes?.data || [];

    // Real activity: user_settings.lastActiveAt (app heartbeat) > last_sign_in_at > created_at
    const settingsByUser = new Map<string, any>(
      (settingsRowsRes?.data || []).map((r: any) => [r.user_id, r.settings || {}])
    );
    const lastActiveOf = (u: any): string | null =>
      settingsByUser.get(u.id)?.lastActiveAt || u.last_sign_in_at || u.created_at;
    const activeThisWeek = (authUsers?.users ?? []).filter((u: any) => new Date(lastActiveOf(u) || 0) >= weekStart).length;
    const activeThisMonth = (authUsers?.users ?? []).filter((u: any) => new Date(lastActiveOf(u) || 0) >= monthStart).length;

    const recentUsers = (authUsers?.users ?? []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map((u: any) => ({
      id: u.id, email: u.email, createdAt: u.created_at, lastSignInAt: u.last_sign_in_at, provider: u.app_metadata?.provider || "email",
    }));

    return NextResponse.json({
      configured: true,
      totalUsers, newSignupsToday, newSignupsThisMonth, activeThisWeek, activeThisMonth,
      tableCounts: counts, recentUsers, recentNotifications: recentNotifs || [],
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[/api/admin/supabase-stats] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
