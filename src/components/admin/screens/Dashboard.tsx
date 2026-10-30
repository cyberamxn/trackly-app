"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, UserPlus, Crown, IndianRupee, Activity, Repeat, LogOut, FileText,
  StickyNote, Cloud, AlertTriangle, Server, Zap, Heart, TrendingUp, Eye,
} from "lucide-react";
import { PageHeader, KpiCard, AdminCard, LoadingState } from "../components/ui";
import { apiGet } from "@/lib/admin/api";
import { useAdminStore } from "@/lib/admin/store";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, Cell,
} from "recharts";

interface Stats {
  totalUsers: number;
  activeUsers: { today: number; week: number; month: number };
  newSignups: { today: number; month: number };
  premiumSubscribers: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  appOpens: { today: number; week: number };
  retentionRate: number;
  churnRate: number;
  totalExpensesLogged: number;
  totalHabitsTracked: number;
  totalNotesCreated: number;
  cloudStorageUsedMb: number;
  cloudStorageLimitMb: number;
  crashReports: number;
  apiStatus: string;
  serverHealth: string;
  openTickets: number;
  activeSubscriptions: number;
}

interface ActivityEvent {
  id: string;
  eventType: string;
  screen: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

const formatINR = (cents: number) => "₹" + (cents / 100).toLocaleString("en-IN");

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const setScreen = useAdminStore((s) => s.setScreen);

  useEffect(() => {
    Promise.all([
      apiGet("/api/admin/stats").catch(() => null),
      apiGet("/api/admin/activity?limit=10").catch(() => []),
    ]).then(([s, a]) => {
      if (s) setStats(s);
      if (Array.isArray(a)) setActivity(a);
      setLoading(false);
    });

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      apiGet("/api/admin/stats").then(setStats).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingState label="Loading dashboard..." />;

  // Build chart data from real activity (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const day = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    return { day, label, count: 0 };
  });
  const dauData = last7Days.map((d) => {
    const dayEvents = activity.filter((a) => a.createdAt.startsWith(d.day));
    const uniqueUsers = new Set(dayEvents.map((e) => e.user?.email ?? "anon"));
    return { ...d, count: uniqueUsers.size };
  });
  // If activity is sparse, show an honest empty-state hint instead of fabricating numbers.

  const eventTypeData = activity.reduce((acc, e) => {
    const type = e.eventType.replace(/_/g, " ");
    const existing = acc.find((x) => x.name === type);
    if (existing) existing.value++;
    else acc.push({ name: type, value: 1 });
    return acc;
  }, [] as { name: string; value: number }[]);
  // Top 6 events
  const topEvents = eventTypeData.sort((a, b) => b.value - a.value).slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time overview of the Trackly ecosystem"
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
            <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
            <span className="text-[12px] font-medium">Live · auto-refresh 30s</span>
          </div>
        }
      />

      {/* KPI Grid - Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard
          label="Total Users"
          value={stats?.totalUsers?.toLocaleString() ?? "—"}
          delta={`+${stats?.newSignups.today ?? 0} today`}
          trend="up"
          icon={<Users size={18} />}
          onClick={() => setScreen("users")}
        />
        <KpiCard
          label="Active Today"
          value={stats?.activeUsers.today.toLocaleString() ?? "—"}
          delta={`${stats?.activeUsers.week.toLocaleString() ?? "—"} this week`}
          trend="up"
          icon={<Activity size={18} />}
        />
        <KpiCard
          label="Premium Subscribers"
          value={stats?.premiumSubscribers.toLocaleString() ?? "—"}
          delta={`${stats?.totalUsers ? Math.round((stats.premiumSubscribers / stats.totalUsers) * 100) : 0}% conversion`}
          trend="up"
          icon={<Crown size={18} />}
        />
        <KpiCard
          label="Monthly Revenue"
          value={stats ? formatINR(stats.monthlyRevenue) : "—"}
          delta={`${stats?.revenueGrowth ?? 0}% vs last month`}
          trend={(stats?.revenueGrowth ?? 0) >= 0 ? "up" : "down"}
          icon={<IndianRupee size={18} />}
        />
      </div>

      {/* KPI Grid - Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard
          label="App Opens Today"
          value={stats?.appOpens.today.toLocaleString() ?? "—"}
          delta={`${stats?.appOpens.week.toLocaleString() ?? "—"} this week`}
          trend="up"
          icon={<Zap size={18} />}
        />
        <KpiCard
          label="Retention Rate"
          value={`${stats?.retentionRate ?? 0}%`}
          delta="7-day rolling"
          trend="neutral"
          icon={<Repeat size={18} />}
        />
        <KpiCard
          label="Churn Rate"
          value={`${stats?.churnRate ?? 0}%`}
          delta={stats && stats.churnRate < 50 ? "Healthy · 30d inactive" : "Users inactive 30+ days"}
          trend={stats && stats.churnRate < 50 ? "up" : "down"}
          icon={<LogOut size={18} />}
        />
        <KpiCard
          label="New Signups"
          value={stats?.newSignups.today ?? 0}
          delta={`${stats?.newSignups.month ?? 0} this month`}
          trend="up"
          icon={<UserPlus size={18} />}
        />
      </div>

      {/* ===== Live Supabase Stats — REAL app data ===== */}
      <LiveSupabaseStats />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* DAU chart */}
        <AdminCard className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-bold tracking-tight">Daily Active Users</h3>
              <p className="text-[12px] text-muted-foreground">Last 7 days</p>
            </div>
            <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <TrendingUp size={13} /> Live
            </div>
          </div>
          {dauData.every((d) => d.count === 0) ? (
            <div className="h-[220px] flex flex-col items-center justify-center text-center px-6">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Activity size={18} className="text-muted-foreground" />
              </div>
              <p className="text-[14px] font-semibold">No activity yet</p>
              <p className="text-[12px] text-muted-foreground mt-1 max-w-xs">
                Once users start using the app, their activity events will show up here as a daily-active-users chart.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dauData}>
                <defs>
                  <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  fill="url(#dauGrad)"
                  className="text-foreground"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </AdminCard>

        {/* Activity feed */}
        <AdminCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-bold tracking-tight">Live Activity</h3>
            <Eye size={14} className="text-muted-foreground" />
          </div>
          <div className="space-y-3 max-h-[220px] overflow-y-auto thin-scrollbar">
            {activity.length === 0 && (
              <p className="text-[13px] text-muted-foreground text-center py-8">No recent activity</p>
            )}
            {activity.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-2.5"
              >
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <ActivityIcon type={e.eventType} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] leading-tight">
                    <span className="font-semibold">{e.user?.name ?? "Unknown"}</span>{" "}
                    <span className="text-muted-foreground">{e.eventType.replace(/_/g, " ").toLowerCase()}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {e.screen ? `${e.screen} · ` : ""}{timeAgo(e.createdAt)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </AdminCard>
      </div>

      {/* Event distribution + KPIs row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <AdminCard className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-bold tracking-tight">Event Distribution</h3>
              <p className="text-[12px] text-muted-foreground">Recent activity breakdown</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topEvents} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {topEvents.map((_, i) => (
                  <Cell key={i} fill="currentColor" className="text-foreground" fillOpacity={1 - i * 0.12} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AdminCard>

        {/* Storage & Health */}
        <div className="space-y-4">
          <AdminCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Cloud size={16} />
              <h3 className="text-[14px] font-bold tracking-tight">Cloud Storage</h3>
            </div>
            <p className="text-[22px] font-bold text-display">
              {(stats?.cloudStorageUsedMb ?? 0).toLocaleString()} MB
            </p>
            <p className="text-[12px] text-muted-foreground">
              of {(stats?.cloudStorageLimitMb ?? 0).toLocaleString()} MB allocated
            </p>
            <div className="h-2 rounded-full bg-muted mt-3 overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all"
                style={{ width: `${Math.min(100, ((stats?.cloudStorageUsedMb ?? 0) / Math.max(1, stats?.cloudStorageLimitMb ?? 1)) * 100)}%` }}
              />
            </div>
          </AdminCard>

          <AdminCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Server size={16} />
              <h3 className="text-[14px] font-bold tracking-tight">System Health</h3>
            </div>
            <div className="space-y-2">
              <HealthRow label="API Status" value={stats?.apiStatus ?? "—"} ok />
              <HealthRow label="Server" value={stats?.serverHealth ?? "—"} ok />
              <HealthRow label="Crash Reports" value={`${stats?.crashReports ?? 0}`} ok={(stats?.crashReports ?? 0) < 10} />
              <HealthRow label="Open Tickets" value={`${stats?.openTickets ?? 0}`} ok={(stats?.openTickets ?? 0) < 5} />
            </div>
          </AdminCard>
        </div>
      </div>

      {/* KPI row 3 - Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Expenses Logged"
          value={(stats?.totalExpensesLogged ?? 0).toLocaleString()}
          icon={<FileText size={18} />}
        />
        <KpiCard
          label="Habits Tracked"
          value={(stats?.totalHabitsTracked ?? 0).toLocaleString()}
          icon={<Heart size={18} />}
        />
        <KpiCard
          label="Notes Created"
          value={(stats?.totalNotesCreated ?? 0).toLocaleString()}
          icon={<StickyNote size={18} />}
        />
        <KpiCard
          label="Active Subscriptions"
          value={(stats?.activeSubscriptions ?? 0).toLocaleString()}
          icon={<Crown size={18} />}
        />
      </div>
    </div>
  );
}

function HealthRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {ok !== undefined && (
          <div className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-foreground" : "bg-muted-foreground"}`} />
        )}
        <span className="text-[13px] font-medium">{value}</span>
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const Icon =
    type === "APP_OPEN" ? Zap :
    type === "EXPENSE_LOGGED" ? FileText :
    type === "HABIT_COMPLETED" ? Heart :
    type === "NOTE_CREATED" ? StickyNote :
    type === "SUBSCRIPTION_PURCHASED" ? Crown :
    type === "AI_QUERY" ? Eye :
    Activity;
  return <Icon size={12} />;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// ===== Live Supabase Stats Component =====
function LiveSupabaseStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/supabase-stats", { credentials: "include" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminCard className="p-5 mb-4 border-2 border-foreground/10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[16px] font-bold flex items-center gap-2">
            <Cloud size={16} /> Live Supabase Stats
          </h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Real-time data from production Supabase (auth.users + app tables)
          </p>
        </div>
        <button onClick={load} className="text-[12px] px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 font-medium">
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="text-[13px] text-muted-foreground">Loading live data…</div>
      ) : error ? (
        <div className="text-[13px] text-red-500">Error: {error}</div>
      ) : !data?.configured ? (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-[12px] text-amber-800 dark:text-amber-200">
              <p className="font-semibold mb-1">Supabase service role key not configured</p>
              <p>Add <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to .env</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatBox label="Total Auth Users" value={data.totalUsers} highlight />
            <StatBox label="New Today" value={data.newSignupsToday} />
            <StatBox label="New This Month" value={data.newSignupsThisMonth} />
            <StatBox label="Active This Week" value={data.activeThisWeek} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              App Table Row Counts (real user data)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {Object.entries(data.tableCounts || {}).map(([table, count]: any) => (
                <div key={table} className={`p-2 rounded-lg border ${count > 0 ? "bg-muted/40 border-foreground/10" : "bg-transparent border-border/50 opacity-60"}`}>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{table.replace(/_/g, " ")}</p>
                  <p className="text-[16px] font-bold tabular-nums">{count < 0 ? "—" : count.toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </div>
          {data.recentUsers?.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Recent Signups</p>
              <div className="space-y-1.5">
                {data.recentUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between text-[12px] py-1.5 px-2 rounded hover:bg-muted/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold shrink-0">
                        {(u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate font-medium">{u.email || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                      <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">{u.provider}</span>
                      <span>{new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 text-[10px] text-muted-foreground">
            Last fetched: {data.fetchedAt ? new Date(data.fetchedAt).toLocaleString("en-IN") : "—"}
          </div>
        </>
      )}
    </AdminCard>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? "bg-foreground text-background" : "bg-muted"}`}>
      <p className={`text-[10px] uppercase tracking-wider ${highlight ? "opacity-70" : "text-muted-foreground"}`}>{label}</p>
      <p className="text-[20px] font-bold tabular-nums mt-0.5">{value.toLocaleString("en-IN")}</p>
    </div>
  );
}
