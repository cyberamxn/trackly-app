"use client";

import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Clock, Target, Wallet, CheckCircle2,
} from "lucide-react";
import { ScreenHeader, Card, ProgressBar, RingProgress } from "../../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { useOfficeData } from "@/lib/trackly/officeData";
import { useAppData } from "@/lib/trackly/appData";
import { formatINR } from "@/lib/trackly/data";

export function OfficeAnalytics() {
  const { setScreen } = useTracklyStore();
  const office = useOfficeData();
  const expenses = useAppData((s) => s.expenses);

  // This month expenses
  const now = new Date();
  const monthStr = now.toISOString().slice(0, 7);
  const monthExpenses = expenses.filter((e) => e.date.startsWith(monthStr));
  const monthSpending = monthExpenses.reduce((s, e) => s + e.amount, 0);

  // Last 7 days spending chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const amount = expenses.filter((e) => e.date === dateStr).reduce((s, e) => s + e.amount, 0);
    return { label: d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0), amount, isToday: i === 6 };
  });
  const maxChart = Math.max(...last7Days.map((d) => d.amount), 1);

  // Attendance %
  const recentAtt = office.attendance.slice(0, 22); // ~1 month
  const presentDays = recentAtt.filter((a) => a.status === "present" || a.status === "late").length;
  const attendancePct = recentAtt.length > 0 ? Math.round((presentDays / recentAtt.length) * 100) : 0;

  // Work hours (last 7 days)
  const recent7 = office.attendance.slice(0, 7);
  const totalWorkHours = recent7.reduce((s, a) => s + a.workHours, 0);
  const avgWorkHours = recent7.length > 0 ? totalWorkHours / recent7.length : 0;

  // Productivity score (based on tasks done + pomodoros + goals)
  const tasksDone = office.tasks.filter((t) => t.status === "done").length;
  const tasksTotal = office.tasks.length;
  const taskPct = tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0;
  const today = new Date().toISOString().slice(0, 10);
  const todayPomodoros = office.pomodoros.filter((p) => p.date === today && p.completed).length;
  const goals = office.dailyGoals.filter((g) => g.date === today);
  const goalPct = goals.length > 0 ? (goals.reduce((s, g) => s + g.done / g.target, 0) / goals.length) * 100 : 0;
  const productivityScore = Math.round((taskPct * 0.4 + Math.min(todayPomodoros * 10, 40) + goalPct * 0.2));

  // Savings
  const totalSaved = office.savingsGoals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = office.savingsGoals.reduce((s, g) => s + g.target, 0);
  const savingsPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader title="Analytics" subtitle="Your productivity insights" onBack={() => setScreen("office-dashboard")} />

      {/* Productivity Score Hero */}
      <div className="px-5 mt-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-foreground text-background p-5 flex items-center gap-4">
          <RingProgress value={productivityScore} size={80} stroke={6}>
            <div className="text-center">
              <div className="text-[20px] font-bold leading-none">{productivityScore}</div>
              <div className="text-[9px] opacity-70 uppercase">score</div>
            </div>
          </RingProgress>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Productivity Score</p>
            <h2 className="text-[20px] font-bold tracking-tight mt-0.5">
              {productivityScore >= 80 ? "Excellent!" : productivityScore >= 60 ? "Good work!" : productivityScore >= 40 ? "Keep going!" : "Let's improve!"}
            </h2>
            <p className="text-[12px] opacity-80 mt-0.5">
              {tasksDone}/{tasksTotal} tasks · {todayPomodoros} pomodoros · {Math.round(goalPct)}% goals
            </p>
          </div>
        </motion.div>
      </div>

      {/* Stats grid */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
            <Wallet size={14} /> Monthly Expenses
          </div>
          <p className="text-[20px] font-bold mt-1.5 text-display">{formatINR(monthSpending)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{monthExpenses.length} transactions</p>
        </Card>
        <Card>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
            <Clock size={14} /> Avg Work Hours
          </div>
          <p className="text-[20px] font-bold mt-1.5 text-display">{avgWorkHours.toFixed(1)}h</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">per day this week</p>
        </Card>
        <Card>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
            <CheckCircle2 size={14} /> Attendance
          </div>
          <p className="text-[20px] font-bold mt-1.5 text-display">{attendancePct}%</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{presentDays}/{recentAtt.length} days present</p>
        </Card>
        <Card>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
            <Target size={14} /> Savings
          </div>
          <p className="text-[20px] font-bold mt-1.5 text-display">{savingsPct}%</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{formatINR(totalSaved)} / {formatINR(totalTarget)}</p>
        </Card>
      </div>

      {/* 7-day spending chart */}
      <div className="px-5 mt-5">
        <h2 className="text-[18px] font-bold tracking-tight mb-2">Last 7 Days Spending</h2>
        <Card>
          <div className="flex items-end justify-between gap-2 h-32">
            {last7Days.map((d, i) => {
              const h = (d.amount / maxChart) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {d.amount > 0 ? `${d.amount > 999 ? `${(d.amount / 1000).toFixed(1)}k` : d.amount}` : ""}
                  </p>
                  <div className="w-full flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(h, 2)}%` }}
                      transition={{ delay: i * 0.06, type: "spring", stiffness: 120, damping: 18 }}
                      className={`w-full rounded-md ${d.isToday ? "bg-foreground" : "bg-muted"}`}
                      style={{ minHeight: d.amount > 0 ? 4 : 2 }}
                    />
                  </div>
                  <span className={`text-[11px] font-medium ${d.isToday ? "" : "text-muted-foreground"}`}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Work hours chart */}
      <div className="px-5 mt-5">
        <h2 className="text-[18px] font-bold tracking-tight mb-2">Work Hours (Last 7 Days)</h2>
        <Card>
          <div className="space-y-2">
            {recent7.slice().reverse().map((a) => {
              const d = new Date(a.date);
              const pct = Math.round((a.workHours / 10) * 100);
              return (
                <div key={a.id} className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground font-medium w-8 shrink-0">
                    {d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0)}
                  </span>
                  <div className="flex-1">
                    <ProgressBar value={pct} className="h-2.5" />
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums w-12 text-right shrink-0">{a.workHours.toFixed(1)}h</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
