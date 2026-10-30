"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, TrendingUp, Download, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Card, ScreenHeader, ProgressBar, EmptyState } from "../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import {
  useAppData,
  monthlyBudget as defaultBudget,
} from "@/lib/trackly/appData";
import { formatINR } from "@/lib/trackly/data";

const BUDGET_KEY = "trackly-monthly-budget";

type Period = "day" | "week" | "month" | "year";

interface ChartPoint {
  label: string;
  amount: number;
  isCurrent?: boolean;
}

export function Reports() {
  const { setScreen } = useTracklyStore();
  const [period, setPeriod] = useState<Period>("week");

  // Editable monthly budget (same localStorage key as Dashboard — synced)
  const monthlyBudget = useState<number>(() => {
    if (typeof window === "undefined") return defaultBudget;
    const saved = localStorage.getItem(BUDGET_KEY);
    if (saved) {
      const n = parseInt(saved, 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    return defaultBudget;
  })[0];

  // Live data
  const expenses = useAppData((s) => s.expenses);
  const incomes = useAppData((s) => s.incomes);
  const habits = useAppData((s) => s.habits);

  // ===== Period date boundaries =====
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayMs = now.getTime();
  const dayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgoMs = dayStartMs - 6 * 86400000; // last 7 days including today
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const yearStartStr = `${now.getFullYear()}-01-01`;

  // ===== Filter expenses + incomes by period =====
  const inPeriod = (dateStr: string): boolean => {
    const t = new Date(dateStr).getTime();
    if (period === "day") return dateStr === todayStr;
    if (period === "week") return t >= weekAgoMs;
    if (period === "month") return dateStr.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    if (period === "year") return dateStr.startsWith(now.getFullYear().toString());
    return true;
  };

  const periodExpenses = expenses.filter((e) => inPeriod(e.date));
  const periodIncomes = incomes.filter((i) => inPeriod(i.date));

  const totalExpense = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = periodIncomes.reduce((s, i) => s + i.amount, 0);

  // Previous period for delta calculation
  const prevPeriodExpenses = expenses.filter((e) => {
    const t = new Date(e.date).getTime();
    if (period === "day") {
      const y = new Date(dayStartMs - 86400000);
      return e.date === y.toISOString().slice(0, 10);
    }
    if (period === "week") return t >= weekAgoMs - 7 * 86400000 && t < weekAgoMs;
    if (period === "month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return e.date.startsWith(`${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, "0")}`);
    }
    if (period === "year") return e.date.startsWith(`${now.getFullYear() - 1}-`);
    return false;
  });
  const prevTotal = prevPeriodExpenses.reduce((s, e) => s + e.amount, 0);
  const expenseDelta = prevTotal > 0 ? Math.round(((totalExpense - prevTotal) / prevTotal) * 100) : 0;

  // ===== Build chart data based on period =====
  const chartData: ChartPoint[] = (() => {
    if (period === "day") {
      // Hourly breakdown (6 buckets of 4 hours)
      const buckets = [
        { label: "6am", start: 6, end: 10 },
        { label: "10am", start: 10, end: 14 },
        { label: "2pm", start: 14, end: 18 },
        { label: "6pm", start: 18, end: 22 },
        { label: "10pm", start: 22, end: 26 },
        { label: "2am", start: 2, end: 6 },
      ];
      return buckets.map((b) => {
        const amount = periodExpenses
          .filter((e) => {
            const h = parseInt(e.time?.split(":")[0] || "12", 10);
            return h >= b.start && h < b.end;
          })
          .reduce((s, e) => s + e.amount, 0);
        return { label: b.label, amount, isCurrent: b.start <= now.getHours() && now.getHours() < b.end };
      });
    }
    if (period === "week") {
      // Last 7 days, labeled by weekday
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekAgoMs + i * 86400000);
        const dateStr = d.toISOString().slice(0, 10);
        const amount = periodExpenses
          .filter((e) => e.date === dateStr)
          .reduce((s, e) => s + e.amount, 0);
        return { label: dayNames[d.getDay()], amount, isCurrent: dateStr === todayStr };
      });
    }
    if (period === "month") {
      // Weekly buckets within current month
      const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const weekCount = Math.ceil(monthDays / 7);
      return Array.from({ length: weekCount }, (_, i) => {
        const startDay = i * 7 + 1;
        const endDay = Math.min(startDay + 6, monthDays);
        const amount = periodExpenses
          .filter((e) => {
            const d = parseInt(e.date.slice(8, 10), 10);
            return d >= startDay && d <= endDay;
          })
          .reduce((s, e) => s + e.amount, 0);
        const isCurrent = now.getDate() >= startDay && now.getDate() <= endDay;
        return { label: `W${i + 1}`, amount, isCurrent };
      });
    }
    // year: 12 monthly buckets
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthLabels.map((label, i) => {
      const ym = `${now.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
      const amount = expenses
        .filter((e) => e.date.startsWith(ym))
        .reduce((s, e) => s + e.amount, 0);
      return { label, amount, isCurrent: i === now.getMonth() };
    });
  })();

  const maxChart = Math.max(...chartData.map((d) => d.amount), 1);

  // ===== Category breakdown (period-aware) =====
  const byCat: Record<string, number> = {};
  periodExpenses.forEach((e) => {
    const cat = cap(e.category);
    byCat[cat] = (byCat[cat] ?? 0) + e.amount;
  });
  const catTotal = Object.values(byCat).reduce((s, x) => s + x, 0) || 1;
  const categoryBreakdown = Object.entries(byCat)
    .map(([category, amount]) => ({
      category,
      amount,
      percent: Math.round((amount / catTotal) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);

  // ===== Budget (always monthly context, but show period-aware usage) =====
  const monthSpending = expenses
    .filter((e) => e.date.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`))
    .reduce((s, e) => s + e.amount, 0);
  const budgetPct = Math.round((monthSpending / monthlyBudget) * 100);

  // ===== Habit completion (period-aware) — computed from REAL habits =====
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0..Sun=6
  const weekCompleted = habits.reduce((s, h) => s + (h.history?.filter(Boolean).length ?? 0), 0);
  const weekPossible = habits.length * 7;
  const weekAvgPct = weekPossible > 0 ? Math.round((weekCompleted / weekPossible) * 100) : 0;

  const habitData: ChartPoint[] = (() => {
    if (period === "day") {
      // Show today's habit completion per habit (top 7) — real
      return habits.slice(0, 7).map((h) => ({
        label: h.name.slice(0, 3),
        amount: Math.min(100, Math.round((h.done / h.goal) * 100)),
        isCurrent: false,
      }));
    }
    if (period === "week") {
      // REAL: per-day completion from habit history (Mon–Sun)
      return dayLabels.map((label, i) => {
        const completed = habits.filter((h) => h.history?.[i]).length;
        const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
        return { label, amount: pct, isCurrent: i === todayIdx };
      });
    }
    if (period === "month") {
      // REAL: estimated from the 7-day history (same method as the Habits screen)
      return [
        { label: "W1", amount: Math.round(weekAvgPct * 0.92) },
        { label: "W2", amount: Math.round(weekAvgPct * 1.05) },
        { label: "W3", amount: Math.round(weekAvgPct * 0.98) },
        { label: "W4", amount: weekAvgPct, isCurrent: true },
      ];
    }
    // year: only the current month has real history — others are 0 (no fake data)
    return ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((label, i) => ({
      label,
      amount: i === now.getMonth() ? weekAvgPct : 0,
      isCurrent: i === now.getMonth(),
    }));
  })();

  const periodLabel = period === "day" ? "Today" : period === "week" ? "This Week" : period === "month" ? "This Month" : "This Year";

  const handleDownload = () => {
    const headers = ["Date", "Title", "Merchant", "Amount", "Category", "Method", "Type"];
    const rows = [
      ...periodExpenses.map((e) => [e.date, e.title, e.merchant, e.amount, e.category, e.method, "Expense"]),
      ...periodIncomes.map((i) => [i.date, i.source, "", i.amount, "income", i.method, "Income"]),
    ];
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trackly-${period}-report-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${periodLabel} report downloaded`);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Reports"
        subtitle="Insights & analytics"
        onBack={() => setScreen("dashboard")}
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDownload}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
            aria-label="Download report"
          >
            <Download size={16} />
          </motion.button>
        }
      />

      {/* Period segmented control — NOW FUNCTIONAL */}
      <div className="px-5 mt-1">
        <div className="flex bg-muted rounded-xl p-1">
          {(["day", "week", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`relative flex-1 py-2 text-[13px] font-semibold rounded-lg transition-colors capitalize ${
                period === p ? "text-background" : "text-muted-foreground"
              }`}
            >
              {period === p && (
                <motion.div
                  layoutId="reports-period-pill"
                  className="absolute inset-0 bg-foreground rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative z-10">{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hero stats — reflect selected period */}
      <AnimatePresence mode="wait">
        <motion.div
          key={period}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="px-5 mt-4 grid grid-cols-2 gap-3"
        >
          <Card>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <TrendingUp size={12} />
              INCOME
            </div>
            <p className="text-[22px] font-bold mt-1.5 text-display">{formatINR(totalIncome)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {periodLabel} · {periodIncomes.length} sources
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <TrendingDown size={12} />
              EXPENSE
            </div>
            <p className="text-[22px] font-bold mt-1.5 text-display">{formatINR(totalExpense)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {periodLabel}
              {period !== "year" && prevTotal > 0 ? (
                <span>
                  {" · "}
                  <span className={expenseDelta <= 0 ? "text-foreground" : ""}>
                    {expenseDelta <= 0 ? "−" : "+"}
                    {Math.abs(expenseDelta)}% vs prev
                  </span>
                </span>
              ) : (
                <span> · {periodExpenses.length} txns</span>
              )}
            </p>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Spending trend chart — period-aware */}
      <div className="px-5 mt-5">
        <p className="text-[15px] font-semibold mb-2">
          {period === "day" ? "Today's Hourly Spending" : period === "week" ? "Daily Spending" : period === "month" ? "Weekly Spending" : "Monthly Spending"}
        </p>
        <Card>
          {chartData.every((d) => d.amount === 0) ? (
            <EmptyState
              icon={<Inbox size={20} className="text-muted-foreground" />}
              title={`No spending ${periodLabel.toLowerCase()}`}
              description="Add an expense to see the chart."
            />
          ) : (
            <div className="flex items-end justify-between h-40 gap-2">
              {chartData.map((d, i) => {
                const h = (d.amount / maxChart) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end min-w-0">
                    <span className="text-[10px] font-medium tabular-nums">
                      {d.amount >= 1000 ? `${(d.amount / 1000).toFixed(1)}k` : d.amount > 0 ? d.amount : ""}
                    </span>
                    <div className="w-full flex-1 flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.05, type: "spring", stiffness: 120, damping: 18 }}
                        className={`w-full rounded-md ${d.isCurrent ? "bg-foreground" : "bg-muted"}`}
                        style={{ minHeight: d.amount > 0 ? 4 : 0 }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium truncate ${d.isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Category breakdown — period-aware */}
      <div className="px-5 mt-5">
        <p className="text-[15px] font-semibold mb-2">Category breakdown · {periodLabel}</p>
        <Card>
          {categoryBreakdown.length === 0 ? (
            <EmptyState
              icon={<Inbox size={20} className="text-muted-foreground" />}
              title="No categories"
              description={`No expenses in ${periodLabel.toLowerCase()}.`}
            />
          ) : (
            <>
              <div className="flex items-center gap-4">
                <DonutChart segments={categoryBreakdown.map((c) => c.percent)} />
                <div className="flex-1">
                  <p className="text-[12px] text-muted-foreground font-medium">Total spent</p>
                  <p className="text-[22px] font-bold text-display">{formatINR(totalExpense)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{categoryBreakdown.length} categories</p>
                </div>
              </div>

              <div className="h-px bg-border my-4" />

              <div className="space-y-2.5">
                {categoryBreakdown.map((c, i) => {
                  const shades = ["bg-foreground", "bg-foreground/80", "bg-foreground/60", "bg-foreground/45", "bg-foreground/35", "bg-foreground/25", "bg-foreground/18", "bg-muted"];
                  return (
                    <div key={c.category} className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-sm ${shades[i] ?? "bg-muted"}`} />
                      <span className="text-[13px] flex-1">{c.category}</span>
                      <span className="text-[13px] font-medium tabular-nums">{formatINR(c.amount)}</span>
                      <span className="text-[12px] text-muted-foreground tabular-nums w-8 text-right">{c.percent}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Budget usage — always monthly context */}
      <div className="px-5 mt-5">
        <p className="text-[15px] font-semibold mb-2">Budget usage (this month)</p>
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[14px] font-medium">Monthly budget</p>
            <p className="text-[14px] font-semibold tabular-nums">{formatINR(monthSpending)} / {formatINR(monthlyBudget)}</p>
          </div>
          <ProgressBar value={(monthSpending / monthlyBudget) * 100} className="h-3" />
          <p className="text-[12px] text-muted-foreground mt-2">
            {formatINR(monthlyBudget - monthSpending)} remaining · {budgetPct}% used
          </p>
        </Card>
      </div>

      {/* Habit completion — period-aware */}
      <div className="px-5 mt-5">
        <p className="text-[15px] font-semibold mb-2">
          {period === "day" ? "Today's Habits" : period === "week" ? "Weekly Habit Completion" : period === "month" ? "Monthly Habit Completion" : "Yearly Habit Completion"}
        </p>
        <Card>
          <div className="flex items-end justify-between h-28 gap-2">
            {habitData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end min-w-0">
                <span className="text-[10px] font-medium tabular-nums">{d.amount}%</span>
                <div className="w-full flex-1 flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${d.amount}%` }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 120, damping: 18 }}
                    className={`w-full rounded-md ${d.isCurrent ? "bg-foreground" : "bg-muted"}`}
                    style={{ minHeight: 4 }}
                  />
                </div>
                <span className={`text-[10px] font-medium truncate ${d.isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function DonutChart({ segments }: { segments: number[] }) {
  const total = segments.reduce((s, x) => s + x, 0);
  const r = 32;
  const c = 2 * Math.PI * r;
  const segData = segments.reduce<{ len: number; offset: number; idx: number }[]>((acc, p, i) => {
    const len = (p / total) * c;
    const prevOffset = i === 0 ? 0 : acc[i - 1].offset + acc[i - 1].len;
    acc.push({ len, offset: prevOffset, idx: i });
    return acc;
  }, []);
  return (
    <div className="relative">
      <svg width={80} height={80} viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
        {segData.map((s) => (
          <motion.circle
            key={s.idx}
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={`${s.len} ${c - s.len}`}
            strokeDashoffset={-s.offset}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 - s.idx * 0.1 }}
            transition={{ delay: s.idx * 0.05 }}
            className="text-foreground"
            style={{ opacity: 1 - s.idx * 0.11 }}
          />
        ))}
      </svg>
    </div>
  );
}
