import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { tryGetSupabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/lib/db";

/**
 * GET /api/admin/stats — REAL stats from Supabase
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const supabaseAdmin = tryGetSupabaseAdmin();
  if (!supabaseAdmin) {
    const totalUsers = await db.appUser.count().catch(() => 0);
    return NextResponse.json({
      totalUsers, activeUsers: { today: 0, week: 0, month: 0 },
      newSignups: { today: 0, month: 0 }, premiumSubscribers: 0,
      monthlyRevenue: 0, revenueGrowth: 0, appOpens: { today: 0, week: 0 },
      retentionRate: 0, churnRate: 0, totalExpensesLogged: 0,
      totalHabitsTracked: 0, totalNotesCreated: 0,
      cloudStorageUsedMb: 0, cloudStorageLimitMb: totalUsers * 500,
      crashReports: 0, apiStatus: "OPERATIONAL", serverHealth: "HEALTHY",
      openTickets: await db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }).catch(() => 0),
      activeSubscriptions: 0, source: "prisma_fallback",
    });
  }

  const sb = supabaseAdmin as any;
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const inactive30Start = new Date(todayStart.getTime() - 30 * 86400000);

    // Single parallel batch — listUsers + table counts + premium + tickets/revenue
    // (pehle sequential chains the, isliye 6.7s lagta tha)
    //
    // NOTE: supabase-js listUsers() returns { data: { users, ... }, error } —
    // the user array lives under .data.users. (Bug fix: this route previously
    // read authRes?.users which is always undefined → every KPI showed 0.)
    const [listRes, counts, premiumUsersRes, openTickets, activeSubscriptions, monthRevenueAgg, lastMonthRevenueAgg, crashReports] =
      await Promise.all([
        (async () => {
          // Fetch up to 5 pages (5000 users safety cap) so totals stay correct
          // past the first page as the app grows.
          const first = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (first.error) return first;
          const all = [...(first.data?.users || [])];
          let nextPage = first.data?.nextPage ?? null;
          let p = 1;
          while (nextPage && p < 5) {
            p++;
            const nxt = await sb.auth.admin.listUsers({ page: p, perPage: 1000 });
            if (nxt.error) break;
            all.push(...(nxt.data?.users || []));
            nextPage = nxt.data?.nextPage ?? null;
          }
          return { data: { users: all }, error: null };
        })(),
        (async () => {
          const tables = ["expenses", "incomes", "shopping", "borrow_lend", "habits", "notes", "calendar_events"];
          const c: Record<string, number> = {};
          await Promise.all(tables.map(async (t) => {
            const { count } = await sb.from(t).select("*", { count: "exact", head: true });
            c[t] = count || 0;
          }));
          return c;
        })(),
        sb.from("user_settings").select("user_id,settings"),
        db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }).catch(() => 0),
        db.userSubscription.count({ where: { status: "ACTIVE" } }).catch(() => 0),
        db.userSubscription.aggregate({ _sum: { amountCents: true }, where: { status: "ACTIVE", startedAt: { gte: monthStart } } })
          .catch(() => ({ _sum: { amountCents: 0 } })),
        db.userSubscription.aggregate({ _sum: { amountCents: true }, where: { status: "ACTIVE", startedAt: { gte: lastMonthStart, lt: monthStart } } })
          .catch(() => ({ _sum: { amountCents: 0 } })),
        db.activityEvent.count({ where: { eventType: "APP_CRASH" } }).catch(() => 0),
      ]);

    if (listRes.error) throw new Error(listRes.error.message);
    const users = listRes?.data?.users || [];
    const totalUsers = users.length;

    // Real activity source: user_settings.lastActiveAt (app heartbeat) >
    // last_sign_in_at (sirf naye login par update hota hai) > created_at
    const settingsByUser = new Map<string, any>(
      (premiumUsersRes?.data || []).map((r: any) => [r.user_id, r.settings || {}])
    );
    const lastActiveOf = (u: any): string | null =>
      settingsByUser.get(u.id)?.lastActiveAt || u.last_sign_in_at || u.created_at;

    const newSignupsToday = users.filter((u: any) => new Date(u.created_at) >= todayStart).length;
    const newSignupsThisMonth = users.filter((u: any) => new Date(u.created_at) >= monthStart).length;
    const activeToday = users.filter((u: any) => new Date(lastActiveOf(u) || 0) >= todayStart).length;
    const activeThisWeek = users.filter((u: any) => new Date(lastActiveOf(u) || 0) >= weekStart).length;
    const activeThisMonth = users.filter((u: any) => new Date(lastActiveOf(u) || 0) >= monthStart).length;

    const premiumSubscribers = (premiumUsersRes?.data || []).filter((r: any) =>
      r.settings?.userPlan && r.settings.userPlan !== "" && r.settings.userPlan !== "free"
    ).length;

    const monthRevenue = monthRevenueAgg._sum.amountCents ?? 0;
    const lastMonthRevenue = lastMonthRevenueAgg._sum.amountCents ?? 0;
    const revenueGrowth = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : (monthRevenue > 0 ? 100 : 0);
    const retentionRate = totalUsers > 0 ? Math.round((activeThisWeek / totalUsers) * 100) : 0;
    // Honest churn: share of users with no activity in the last 30 days
    // (pehle formula retention se fake 100% dikha raha tha)
    const churnRate = totalUsers > 0
      ? Math.round((users.filter((u: any) => new Date(lastActiveOf(u) || 0) < inactive30Start).length / totalUsers) * 100)
      : 0;

    return NextResponse.json({
      totalUsers, activeUsers: { today: activeToday, week: activeThisWeek, month: activeThisMonth },
      newSignups: { today: newSignupsToday, month: newSignupsThisMonth },
      premiumSubscribers, monthlyRevenue: monthRevenue, revenueGrowth,
      appOpens: { today: activeToday, week: activeThisWeek },
      retentionRate, churnRate, totalExpensesLogged: counts.expenses || 0,
      totalHabitsTracked: counts.habits || 0, totalNotesCreated: counts.notes || 0,
      cloudStorageUsedMb: 0, cloudStorageLimitMb: totalUsers * 500,
      crashReports, apiStatus: "OPERATIONAL", serverHealth: "HEALTHY",
      openTickets, activeSubscriptions, source: "supabase_real",
    });
  } catch (error: any) {
    console.error("[/api/admin/stats] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
