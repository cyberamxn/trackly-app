"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  RefreshCw, Users, CalendarDays, Crown, Bell, Globe, Smartphone,
  TrendingUp, BarChart3, PieChart as PieChartIcon, Monitor, Layers,
  AlertTriangle, Activity as ActivityIcon, Loader2,
} from "lucide-react";
import {
  PageHeader, KpiCard, AdminCard, EmptyState, LoadingState,
} from "../components/ui";
import { apiGet } from "@/lib/admin/api";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, LineChart, Line, CartesianGrid, Cell,
  PieChart, Pie,
} from "recharts";

// ===== Types =====
interface AnalyticsData {
  dau: number;
  wau: number;
  mau: number;
  dauSeries: { day: string; count: number }[];
  eventTypeCounts: { type: string; count: number }[];
  screenCounts: { screen: string; count: number }[];
  countryCounts: { country: string; count: number }[];
  deviceCounts: { device: string; count: number }[];
  versionCounts: { version: string; count: number }[];
  conversionRate: number;
  notifOpenRate: number;
  retention: { day: string; pct: number }[];
  totalUsers: number;
  premiumUsers: number;
}

// ===== Helpers =====
const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const chartTooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 13,
  color: "var(--foreground)",
};

function formatDayShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function humanizeEventType(type: string): string {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeScreen(screen: string | null): string {
  if (!screen) return "Unknown";
  return screen
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ===== Component =====
export function AnalyticsScreen() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiGet<AnalyticsData>(`/api/admin/analytics?days=${days}`);
      setData(d);
    } catch (e: any) {
      setError(e.message);
      toast.error("Failed to load analytics: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived data
  const topEvents = (data?.eventTypeCounts ?? []).slice(0, 8).map((e) => ({
    name: humanizeEventType(e.type),
    value: e.count,
  }));
  const topScreens = (data?.screenCounts ?? []).slice(0, 8).map((s) => ({
    name: humanizeScreen(s.screen),
    value: s.count,
  }));
  const topCountries = (data?.countryCounts ?? []).slice(0, 8);
  const maxCountry = topCountries.length > 0 ? topCountries[0].count : 0;
  const deviceData = (data?.deviceCounts ?? []).slice(0, 6).map((d) => ({
    device: d.device || "Unknown",
    count: d.count,
  }));
  const topVersions = (data?.versionCounts ?? []).slice(0, 6);
  const maxVersion = topVersions.length > 0 ? topVersions[0].count : 0;
  const dauSeries = (data?.dauSeries ?? []).map((d) => ({
    ...d,
    label: formatDayShort(d.day),
  }));

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Deep insights into user behavior and engagement"
        actions={
          <>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
              {RANGES.map((r) => (
                <motion.button
                  key={r.value}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDays(r.value)}
                  className={`px-3 h-8 rounded-lg text-[13px] font-semibold transition-colors ${
                    days === r.value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </motion.button>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={load}
              disabled={loading}
              className="h-10 px-4 rounded-xl border border-border text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-muted transition-colors disabled:opacity-40"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </motion.button>
          </>
        }
      />

      {loading && !data ? (
        <LoadingState label="Loading analytics…" />
      ) : error && !data ? (
        <EmptyState
          icon={<AlertTriangle size={20} />}
          title="Something went wrong"
          description={error}
          action={
            <button
              onClick={load}
              className="h-10 px-4 rounded-xl bg-foreground text-background text-[14px] font-semibold"
            >
              Try again
            </button>
          }
        />
      ) : !data ? (
        <EmptyState
          icon={<BarChart3 size={20} />}
          title="No analytics data"
          description="Analytics data will appear here once users start interacting with the app."
        />
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <KpiCard
              label="Daily Active Users"
              value={data.dau.toLocaleString()}
              delta={`${data.mau > 0 ? Math.round((data.dau / data.mau) * 100) : 0}% of MAU`}
              trend="neutral"
              icon={<ActivityIcon size={18} />}
              loading={loading}
            />
            <KpiCard
              label="Weekly Active Users"
              value={data.wau.toLocaleString()}
              delta={`${data.mau > 0 ? Math.round((data.wau / data.mau) * 100) : 0}% of MAU`}
              trend="neutral"
              icon={<CalendarDays size={18} />}
              loading={loading}
            />
            <KpiCard
              label="Monthly Active Users"
              value={data.mau.toLocaleString()}
              delta={`${data.totalUsers > 0 ? Math.round((data.mau / data.totalUsers) * 100) : 0}% of total users`}
              trend="up"
              icon={<Users size={18} />}
              loading={loading}
            />
            <KpiCard
              label="Conversion Rate"
              value={`${data.conversionRate}%`}
              delta={`${data.premiumUsers.toLocaleString()} of ${data.totalUsers.toLocaleString()} users`}
              trend="up"
              icon={<Crown size={18} />}
              loading={loading}
            />
          </div>

          {/* DAU Trend + Retention */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* DAU Trend — 2 cols */}
            <AdminCard className="lg:col-span-2 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold tracking-tight">DAU Trend</h3>
                  <p className="text-[12px] text-muted-foreground">
                    Daily active users · last {days} days
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <TrendingUp size={13} />
                  <span className="tabular-nums">
                    Avg {dauSeries.length > 0
                      ? Math.round(dauSeries.reduce((a, b) => a + b.count, 0) / dauSeries.length).toLocaleString()
                      : 0}
                  </span>
                </div>
              </div>
              {dauSeries.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-[13px] text-muted-foreground">
                  No DAU data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dauSeries} margin={{ left: -16, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--foreground)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--foreground)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="var(--foreground)"
                      strokeWidth={2.5}
                      fill="url(#dauGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: "var(--foreground)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </AdminCard>

            {/* Retention curve — 1 col */}
            <AdminCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold tracking-tight">Retention</h3>
                  <p className="text-[12px] text-muted-foreground">Cohort retention curve</p>
                </div>
                <RefreshCw size={14} className="text-muted-foreground" />
              </div>
              {data.retention.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-[13px] text-muted-foreground">
                  No retention data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.retention} margin={{ left: -16, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(v: any) => [`${v}%`, "Retention"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="pct"
                      stroke="var(--foreground)"
                      strokeWidth={2.5}
                      dot={{ fill: "var(--foreground)", r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "var(--foreground)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </AdminCard>
          </div>

          {/* Event Distribution + Screen Usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Event Distribution */}
            <AdminCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold tracking-tight">Event Distribution</h3>
                  <p className="text-[12px] text-muted-foreground">Top event types</p>
                </div>
                <BarChart3 size={14} className="text-muted-foreground" />
              </div>
              {topEvents.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-[13px] text-muted-foreground">
                  No events recorded
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topEvents} layout="vertical" margin={{ left: 20, right: 16, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {topEvents.map((_, i) => (
                        <Cell
                          key={i}
                          fill="var(--foreground)"
                          fillOpacity={Math.max(0.2, 1 - i * 0.1)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </AdminCard>

            {/* Screen Usage */}
            <AdminCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold tracking-tight">Screen Usage</h3>
                  <p className="text-[12px] text-muted-foreground">Most viewed screens</p>
                </div>
                <Layers size={14} className="text-muted-foreground" />
              </div>
              {topScreens.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-[13px] text-muted-foreground">
                  No screen data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topScreens} layout="vertical" margin={{ left: 20, right: 16, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {topScreens.map((_, i) => (
                        <Cell
                          key={i}
                          fill="var(--foreground)"
                          fillOpacity={Math.max(0.2, 1 - i * 0.1)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </AdminCard>
          </div>

          {/* Country + Device + Version */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Country Distribution */}
            <AdminCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold tracking-tight">Countries</h3>
                  <p className="text-[12px] text-muted-foreground">Users by country</p>
                </div>
                <Globe size={14} className="text-muted-foreground" />
              </div>
              {topCountries.length === 0 ? (
                <p className="text-[13px] text-muted-foreground py-8 text-center">No country data</p>
              ) : (
                <div className="space-y-3">
                  {topCountries.map((c, i) => {
                    const pct = maxCountry > 0 ? (c.count / maxCountry) * 100 : 0;
                    return (
                      <div key={c.country + i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px] font-medium">
                            {c.country || "Unknown"}
                          </span>
                          <span className="text-[12px] text-muted-foreground tabular-nums">
                            {c.count.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-foreground rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              opacity: Math.max(0.25, 1 - i * 0.08),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </AdminCard>

            {/* Device Distribution — Donut */}
            <AdminCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold tracking-tight">Devices</h3>
                  <p className="text-[12px] text-muted-foreground">By device model</p>
                </div>
                <Smartphone size={14} className="text-muted-foreground" />
              </div>
              {deviceData.length === 0 ? (
                <p className="text-[13px] text-muted-foreground py-8 text-center">No device data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={deviceData}
                        dataKey="count"
                        nameKey="device"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {deviceData.map((_, i) => (
                          <Cell
                            key={i}
                            fill="var(--foreground)"
                            fillOpacity={Math.max(0.15, 1 - i * 0.18)}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">
                    {deviceData.map((d, i) => (
                      <div key={d.device + i} className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{
                            background: "var(--foreground)",
                            opacity: Math.max(0.15, 1 - i * 0.18),
                          }}
                        />
                        <span className="text-[11px] truncate">{d.device}</span>
                        <span className="text-[11px] text-muted-foreground ml-auto tabular-nums shrink-0">
                          {d.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </AdminCard>

            {/* App Version Distribution */}
            <AdminCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold tracking-tight">App Versions</h3>
                  <p className="text-[12px] text-muted-foreground">Version distribution</p>
                </div>
                <Monitor size={14} className="text-muted-foreground" />
              </div>
              {topVersions.length === 0 ? (
                <p className="text-[13px] text-muted-foreground py-8 text-center">No version data</p>
              ) : (
                <div className="space-y-3">
                  {topVersions.map((v, i) => {
                    const pct = maxVersion > 0 ? (v.count / maxVersion) * 100 : 0;
                    return (
                      <div key={v.version + i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px] font-medium font-mono">
                            {v.version || "Unknown"}
                          </span>
                          <span className="text-[12px] text-muted-foreground tabular-nums">
                            {v.count.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-foreground rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              opacity: Math.max(0.25, 1 - i * 0.1),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </AdminCard>
          </div>

          {/* Bottom KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="Notification Open Rate"
              value={`${data.notifOpenRate}%`}
              delta="Across all sent notifications"
              trend="neutral"
              icon={<Bell size={18} />}
            />
            <KpiCard
              label="Total Users"
              value={data.totalUsers.toLocaleString()}
              delta="All registered users"
              trend="up"
              icon={<Users size={18} />}
            />
            <KpiCard
              label="Premium Users"
              value={data.premiumUsers.toLocaleString()}
              delta={`${data.conversionRate}% conversion rate`}
              trend="up"
              icon={<Crown size={18} />}
            />
          </div>
        </>
      )}
    </div>
  );
}
