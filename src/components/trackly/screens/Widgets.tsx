"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Plus, Wallet, CheckCircle2, Flame, TrendingDown } from "lucide-react";
import { Card, ScreenHeader, RingProgress } from "../ui";
import { formatINR, monthlyBudget as defaultBudget } from "@/lib/trackly/data";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData } from "@/lib/trackly/appData";
import { istDate, istMonth } from "@/lib/trackly/ist";
import { loadRoutines } from "@/lib/trackly/routine";

const BUDGET_KEY = "trackly-monthly-budget";

export function Widgets() {
  const { setScreen, openQuickAdd } = useTracklyStore();

  // ===== REAL data (no demo) =====
  const expenses = useAppData((s) => s.expenses);
  const incomes = useAppData((s) => s.incomes);
  const habits = useAppData((s) => s.habits);
  const borrowLend = useAppData((s) => s.borrowLend);

  // Real routine tasks (shared v2 storage — starts empty)
  const [taskStats, setTaskStats] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  useEffect(() => {
    const all = loadRoutines().flatMap((r) => r.tasks);
    setTaskStats({ done: all.filter((t) => t.done).length, total: all.length });
  }, []);

  // Real spending in IST
  const todayStr = istDate(new Date());
  const monthStr = istMonth(new Date());
  const todaySpending = expenses
    .filter((e) => e.date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);
  const monthSpending = expenses
    .filter((e) => e.date.startsWith(monthStr))
    .reduce((sum, e) => sum + e.amount, 0);
  const monthIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const lentOut = borrowLend
    .filter((b) => b.type === "lent")
    .reduce((sum, b) => sum + (b.amount - b.paid), 0);

  // Editable budget (same key the Dashboard uses)
  const [monthlyBudget, setMonthlyBudget] = useState(defaultBudget);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(BUDGET_KEY) : null;
    if (saved) setMonthlyBudget(parseInt(saved, 10) || defaultBudget);
  }, []);

  const budgetPct = monthlyBudget > 0 ? Math.round((monthSpending / monthlyBudget) * 100) : 0;
  const habitsDone = habits.filter((h) => h.done >= h.goal).length;
  const longestStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.streak)) : 0;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader title="Widgets" subtitle="Home & Lock Screen" onBack={() => setScreen("dashboard")} />

      <SectionTitle>Home Screen</SectionTitle>

      {/* Large widget */}
      <div className="px-5">
        <p className="text-[12px] text-muted-foreground mb-2 font-medium">Large · 2x4</p>
        <motion.div whileTap={{ scale: 0.98 }}>
          <Card className="bg-foreground text-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] opacity-70 font-medium">TODAY'S SPENDING</p>
                <p className="text-[36px] font-bold mt-0.5 text-display">{formatINR(todaySpending)}</p>
                <p className="text-[12px] opacity-70 mt-1">{formatINR(Math.max(0, monthlyBudget - monthSpending))} left this month</p>
              </div>
              <RingProgress value={Math.min(100, budgetPct)} size={70} stroke={6}>
                <div className="text-center">
                  <div className="text-[14px] font-bold leading-none">{budgetPct}%</div>
                  <div className="text-[8px] opacity-70 mt-0.5">USED</div>
                </div>
              </RingProgress>
            </div>
            <div className="h-px bg-background/20 my-3" />
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Income" value={formatINR(monthIncome)} />
              <Stat label="Expense" value={formatINR(monthSpending)} />
              <Stat label="Lent Out" value={formatINR(lentOut)} />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Medium widgets */}
      <div className="px-5 mt-4">
        <p className="text-[12px] text-muted-foreground mb-2 font-medium">Medium · 2x2</p>
        <div className="grid grid-cols-2 gap-3">
          <WidgetCard title="Today's Habits" big={`${habitsDone}/${habits.length}`} sub="completed">
            <Flame size={20} className="mb-2" />
          </WidgetCard>
          <WidgetCard title="Budget Left" big={formatINR(Math.max(0, monthlyBudget - monthSpending))} sub="this month">
            <Wallet size={20} className="mb-2" />
          </WidgetCard>
          <WidgetCard title="Quick Add" big="+" sub="tap to add">
            <Plus size={20} className="mb-2" />
          </WidgetCard>
          <WidgetCard title="Streak" big={`${longestStreak}d`} sub="longest">
            <TrendingDown size={20} className="mb-2 rotate-180" />
          </WidgetCard>
        </div>
      </div>

      {/* Small widgets */}
      <div className="px-5 mt-4">
        <p className="text-[12px] text-muted-foreground mb-2 font-medium">Small · 2x2</p>
        <div className="grid grid-cols-2 gap-3">
          <Card className="aspect-square flex flex-col justify-between p-3">
            <CheckCircle2 size={18} />
            <div>
              <p className="text-[11px] text-muted-foreground">Today's Tasks</p>
              <p className="text-[20px] font-bold">{taskStats.done}/{taskStats.total}</p>
            </div>
          </Card>
          <Card className="aspect-square flex flex-col justify-between p-3">
            <Wallet size={18} />
            <div>
              <p className="text-[11px] text-muted-foreground">Spending</p>
              <p className="text-[20px] font-bold">{formatINR(todaySpending)}</p>
            </div>
          </Card>
        </div>
      </div>

      <SectionTitle>Lock Screen</SectionTitle>
      <div className="px-5">
        <p className="text-[12px] text-muted-foreground mb-2 font-medium">Lock Screen · Inline</p>
        <div className="space-y-2">
          <Card className="bg-foreground text-background p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={16} />
              <span className="text-[13px] font-medium">Today</span>
            </div>
            <span className="text-[16px] font-bold tabular-nums">{formatINR(todaySpending)}</span>
          </Card>
          <Card className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame size={16} />
              <span className="text-[13px] font-medium">Habits</span>
            </div>
            <span className="text-[16px] font-bold tabular-nums">{habitsDone}/{habits.length}</span>
          </Card>
          <Card className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span className="text-[13px] font-medium">Tasks</span>
            </div>
            <span className="text-[16px] font-bold tabular-nums">{taskStats.done}/{taskStats.total}</span>
          </Card>
        </div>
      </div>

      <SectionTitle>Live Activity</SectionTitle>
      <div className="px-5">
        <motion.div whileTap={{ scale: 0.97 }} onClick={openQuickAdd}>
          <Card className="bg-foreground text-background p-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-background/20 flex items-center justify-center">
                <Plus size={18} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold">Quick Add Ready</p>
                <p className="text-[11px] opacity-70">Tap to add expense, habit or note</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider opacity-70">Now</span>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold px-7 mt-6 mb-2">{children}</p>;
}

function WidgetCard({ title, big, sub, children }: { title: string; big: string; sub: string; children: React.ReactNode }) {
  return (
    <motion.div whileTap={{ scale: 0.97 }}>
      <Card className="aspect-square p-3 flex flex-col">
        {children}
        <div className="mt-auto">
          <p className="text-[11px] text-muted-foreground">{title}</p>
          <p className="text-[22px] font-bold leading-tight text-display">{big}</p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
      </Card>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] opacity-70 uppercase tracking-wider">{label}</p>
      <p className="text-[14px] font-semibold mt-0.5">{value}</p>
    </div>
  );
}
