"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { ReactNode } from "react";
import {
  RefreshCw, Download, FileJson, IndianRupee, Users,
  Crown, Receipt, BarChart3, Headphones, Zap,
  Calendar, Clock, Loader2, AlertTriangle, FileDown,
  History,
} from "lucide-react";
import {
  PageHeader, KpiCard, AdminCard, AdminButton, AdminInput,
  EmptyState, LoadingState, Badge,
} from "../components/ui";
import { apiGet } from "@/lib/admin/api";

// ===== Types =====
interface Stats {
  totalUsers: number;
  activeUsers: { today: number; week: number; month: number };
  newSignups: { today: number; month: number };
  premiumSubscribers: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  totalExpensesLogged: number;
  totalHabitsTracked: number;
  totalNotesCreated: number;
  crashReports: number;
  apiStatus: string;
  serverHealth: string;
  openTickets: number;
  activeSubscriptions: number;
  retentionRate: number;
  churnRate: number;
}

interface Analytics {
  dau: number;
  wau: number;
  mau: number;
  conversionRate: number;
  notifOpenRate: number;
}

interface DownloadRecord {
  type: string;
  format: "csv" | "json";
  timestamp: string;
  label: string;
}

// ===== Helpers =====
const formatINR = (cents: number) =>
  "₹" + (cents / 100).toLocaleString("en-IN");

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// ===== Report Definitions =====
interface ReportType {
  key: string; // export type param
  name: string;
  description: string;
  icon: ReactNode;
  statLabel: string;
  statValue: (s: Stats | null, a: Analytics | null) => string;
  statDelta?: (s: Stats | null, a: Analytics | null) => string;
}

const REPORTS: ReportType[] = [
  {
    key: "revenue",
    name: "Revenue Report",
    description: "All active subscription revenue transactions with payment details.",
    icon: <IndianRupee size={18} />,
    statLabel: "Monthly Revenue",
    statValue: (s) => (s ? formatINR(s.monthlyRevenue) : "—"),
    statDelta: (s) => (s ? `${s.revenueGrowth >= 0 ? "+" : ""}${s.revenueGrowth}% vs last month` : ""),
  },
  {
    key: "users",
    name: "Users Report",
    description: "Complete user directory with device, activity, and storage data.",
    icon: <Users size={18} />,
    statLabel: "Total Users",
    statValue: (s) => (s ? s.totalUsers.toLocaleString() : "—"),
    statDelta: (s) => (s ? `+${s.newSignups.month} this month` : ""),
  },
  {
    key: "subscriptions",
    name: "Premium Growth",
    description: "Subscription records with plan, status, and transaction details.",
    icon: <Crown size={18} />,
    statLabel: "Premium Subscribers",
    statValue: (s) => (s ? s.premiumSubscribers.toLocaleString() : "—"),
    statDelta: (s, a) =>
      s ? `${a?.conversionRate ?? 0}% conversion rate` : "",
  },
  {
    key: "activity",
    name: "Expenses Report",
    description: "User activity events including expense logging and habits.",
    icon: <Receipt size={18} />,
    statLabel: "Total Expenses Logged",
    statValue: (s) => (s ? s.totalExpensesLogged.toLocaleString() : "—"),
    statDelta: (s) =>
      s && s.totalUsers > 0
        ? `${Math.round(s.totalExpensesLogged / s.totalUsers)} avg per user`
        : "",
  },
  {
    key: "activity",
    name: "Analytics Report",
    description: "User engagement events, screen views, and app opens.",
    icon: <BarChart3 size={18} />,
    statLabel: "Active Users (DAU / WAU / MAU)",
    statValue: (_s, a) =>
      a ? `${a.dau} / ${a.wau} / ${a.mau}` : "—",
    statDelta: (_s, a) => (a ? `${a.notifOpenRate}% notification open rate` : ""),
  },
  {
    key: "tickets",
    name: "Support Report",
    description: "All support tickets with status, priority, and assignment.",
    icon: <Headphones size={18} />,
    statLabel: "Open Tickets",
    statValue: (s) => (s ? s.openTickets.toLocaleString() : "—"),
    statDelta: (s) => (s ? `${s.activeSubscriptions} active subscriptions` : ""),
  },
  {
    key: "activity",
    name: "App Performance",
    description: "Crash reports, app opens, and system health events.",
    icon: <Zap size={18} />,
    statLabel: "Crash Reports",
    statValue: (s) => (s ? s.crashReports.toLocaleString() : "—"),
    statDelta: (s) => (s ? `API: ${s.apiStatus}` : ""),
  },
];

// Deduplicate report keys for "Generate All" — each unique export type once
const UNIQUE_TYPES = Array.from(new Set(REPORTS.map((r) => r.key)));

// ===== Component =====
export function ReportsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [lastGenerated, setLastGenerated] = useState<Record<string, string>>({});
  const [downloadingAll, setDownloadingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, a] = await Promise.all([
        apiGet<Stats>("/api/admin/stats").catch(() => null),
        apiGet<Analytics>("/api/admin/analytics?days=30").catch(() => null),
      ]);
      setStats(s);
      setAnalytics(a);
    } catch (e: any) {
      setError(e.message);
      toast.error("Failed to load stats: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buildUrl = (type: string, format: "csv" | "json") => {
    const params = new URLSearchParams({ type, format });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/admin/reports/export?${params.toString()}`;
  };

  const download = (report: ReportType, format: "csv" | "json") => {
    const url = buildUrl(report.key, format);
    window.open(url);
    const now = new Date().toISOString();
    setDownloads((prev) =>
      [
        {
          type: report.key,
          format,
          timestamp: now,
          label: report.name,
        },
        ...prev,
      ].slice(0, 15)
    );
    setLastGenerated((prev) => ({ ...prev, [report.key]: now }));
    toast.success(`${report.name} (${format.toUpperCase()}) download started`);
  };

  const downloadAll = async () => {
    setDownloadingAll(true);
    toast.info(`Generating ${UNIQUE_TYPES.length} reports…`);
    for (const type of UNIQUE_TYPES) {
      const report = REPORTS.find((r) => r.key === type)!;
      const url = buildUrl(type, "csv");
      window.open(url);
      const now = new Date().toISOString();
      setDownloads((prev) =>
        [
          {
            type,
            format: "csv" as const,
            timestamp: now,
            label: report.name,
          },
          ...prev,
        ].slice(0, 15)
      );
      setLastGenerated((prev) => ({ ...prev, [type]: now }));
      // Small delay so browser doesn't block multiple downloads
      await new Promise((res) => setTimeout(res, 350));
    }
    toast.success("All reports queued for download");
    setDownloadingAll(false);
  };

  const clearHistory = () => {
    setDownloads([]);
    toast.success("Download history cleared");
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate and download reports"
        actions={
          <>
            <AdminButton
              variant="outline"
              size="md"
              onClick={load}
              loading={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />{" "}
              Refresh
            </AdminButton>
            <AdminButton
              variant="primary"
              size="md"
              onClick={downloadAll}
              loading={downloadingAll}
            >
              <FileDown size={14} /> Generate All Reports
            </AdminButton>
          </>
        }
      />

      {/* Date Range Picker */}
      <AdminCard className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-[12px] font-semibold mb-1.5 flex items-center gap-1.5">
              <Calendar size={12} className="text-muted-foreground" />
              From Date
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[12px] font-semibold mb-1.5 flex items-center gap-1.5">
              <Calendar size={12} className="text-muted-foreground" />
              To Date
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors"
            />
          </div>
          {(from || to) && (
            <button
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="h-10 px-3 rounded-xl border border-border text-[14px] font-medium hover:bg-muted transition-colors"
            >
              Clear
            </button>
          )}
          <div className="text-[12px] text-muted-foreground sm:pb-2.5">
            Reporting period — appended to export URLs
          </div>
        </div>
      </AdminCard>

      {loading ? (
        <LoadingState label="Loading report summaries…" />
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle size={20} />}
          title="Something went wrong"
          description={error}
          action={
            <AdminButton variant="outline" onClick={load}>
              Try again
            </AdminButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {REPORTS.map((report, i) => (
            <ReportCard
              key={report.name}
              report={report}
              stats={stats}
              analytics={analytics}
              lastGenerated={lastGenerated[report.key]}
              onDownload={(fmt) => download(report, fmt)}
            />
          ))}
        </div>
      )}

      {/* Summary KPIs */}
      {!loading && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Total Revenue"
            value={formatINR(stats.monthlyRevenue)}
            delta={`${stats.revenueGrowth >= 0 ? "+" : ""}${stats.revenueGrowth}% growth`}
            trend={stats.revenueGrowth >= 0 ? "up" : "down"}
            icon={<IndianRupee size={18} />}
          />
          <KpiCard
            label="Total Users"
            value={stats.totalUsers.toLocaleString()}
            delta={`+${stats.newSignups.month} this month`}
            trend="up"
            icon={<Users size={18} />}
          />
          <KpiCard
            label="Premium Users"
            value={stats.premiumSubscribers.toLocaleString()}
            delta={`${analytics?.conversionRate ?? 0}% conversion`}
            trend="up"
            icon={<Crown size={18} />}
          />
          <KpiCard
            label="Active Today"
            value={stats.activeUsers.today.toLocaleString()}
            delta={`${stats.activeUsers.week.toLocaleString()} this week`}
            trend="up"
            icon={<BarChart3 size={18} />}
          />
        </div>
      )}

      {/* Recent Downloads History */}
      <AdminCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={16} />
            <h3 className="text-[16px] font-bold tracking-tight">
              Recent Downloads
            </h3>
            {downloads.length > 0 && (
              <Badge variant="outline">{downloads.length}</Badge>
            )}
          </div>
          {downloads.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Clear history
            </button>
          )}
        </div>
        {downloads.length === 0 ? (
          <div className="py-8 text-center">
            <Download
              size={24}
              className="mx-auto text-muted-foreground/40 mb-2"
            />
            <p className="text-[13px] text-muted-foreground">
              No downloads yet. Generate a report to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto thin-scrollbar">
            {downloads.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {d.format === "csv" ? (
                    <FileDown size={14} />
                  ) : (
                    <FileJson size={14} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{d.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.type} · {d.format.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                  <Clock size={10} />
                  {timeAgo(d.timestamp)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

// ===== Report Card =====
function ReportCard({
  report,
  stats,
  analytics,
  lastGenerated,
  onDownload,
}: {
  report: ReportType;
  stats: Stats | null;
  analytics: Analytics | null;
  lastGenerated?: string;
  onDownload: (format: "csv" | "json") => void;
}) {
  const statValue = report.statValue(stats, analytics);
  const statDelta = report.statDelta?.(stats, analytics);

  return (
    <motion.div whileTap={{ scale: 0.99 }} className="h-full">
      <AdminCard className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            {report.icon}
          </div>
          <Badge variant="outline">{report.key}</Badge>
        </div>

        {/* Name + description */}
        <h3 className="text-[16px] font-bold tracking-tight">{report.name}</h3>
        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
          {report.description}
        </p>

        {/* Summary stat */}
        <div className="mt-4 rounded-xl bg-muted/50 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            {report.statLabel}
          </p>
          <p className="text-[20px] font-bold tracking-tight mt-1 tabular-nums">
            {statValue}
          </p>
          {statDelta && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{statDelta}</p>
          )}
        </div>

        {/* Download buttons */}
        <div className="flex gap-2 mt-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onDownload("csv")}
            className="flex-1 h-9 rounded-xl border border-border text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted transition-colors"
          >
            <Download size={13} /> CSV
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onDownload("json")}
            className="flex-1 h-9 rounded-xl border border-border text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted transition-colors"
          >
            <FileJson size={13} /> JSON
          </motion.button>
        </div>

        {/* Last generated */}
        <div className="mt-3 pt-3 border-t border-border">
          {lastGenerated ? (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Clock size={10} />
              Last generated {timeAgo(lastGenerated)}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
              <Clock size={10} />
              Not yet generated
            </p>
          )}
        </div>
      </AdminCard>
    </motion.div>
  );
}
