"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Search, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronRight,
  Flame, CheckCircle2, Circle, Calendar as CalendarIcon, Sparkles,
  X, Check, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useSync } from "@/lib/trackly/sync";
import {
  useAppData,
  monthlyBudget as defaultBudget,
} from "@/lib/trackly/appData";
import { CategoryIcon } from "../CategoryIcon";
import { Card, ProgressBar, RingProgress, EmptyState } from "../ui";
import { TaskFormModal, HabitFormModal, AddPillButton, addTaskToRoutine } from "../FormModals";
import { formatINR, type Routine } from "@/lib/trackly/data";
import { istDate, istMonth, to12hr } from "@/lib/trackly/ist";
import { EMPTY_ROUTINES, loadRoutines, saveRoutines } from "@/lib/trackly/routine";

type Period = "today" | "week" | "month" | "all";

const BUDGET_KEY = "trackly-monthly-budget";

export function Dashboard() {
  const { setScreen, openSearch, openQuickAdd, unreadNotifCount } = useTracklyStore();
  const [period, setPeriod] = useState<Period>("today");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Check if we're in demo mode — demo uses a separate budget key
  const demoMode = useSync((s) => s.demoMode);
  const budgetKey = demoMode ? "trackly-demo-monthly-budget" : BUDGET_KEY;

  // Editable monthly budget (localStorage-backed) — lazy init from localStorage
  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    if (typeof window === "undefined") return defaultBudget;
    const saved = localStorage.getItem(budgetKey);
    if (saved) {
      const n = parseInt(saved, 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    return defaultBudget;
  });
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const handleSaveBudget = () => {
    const n = parseInt(budgetInput.replace(/[^\d]/g, ""), 10);
    if (!n || n <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setMonthlyBudget(n);
    if (typeof window !== "undefined") {
      localStorage.setItem(budgetKey, String(n));
    }
    toast.success(`Budget set to ${formatINR(n)}`);
    setShowBudgetEdit(false);
    setBudgetInput("");
  };

  // Live data from store
  const expenses = useAppData((s) => s.expenses);
  const incomes = useAppData((s) => s.incomes);
  const borrowLendItems = useAppData((s) => s.borrowLend);
  const shoppingItems = useAppData((s) => s.shopping);
  const notes = useAppData((s) => s.notes);
  const calendarEvents = useAppData((s) => s.calendarEvents);
  const habits = useAppData((s) => s.habits);
  const addHabit = useAppData((s) => s.addHabit);

  // Quick-add modals (tasks & habits can be added straight from the Dashboard)
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addHabitOpen, setAddHabitOpen] = useState(false);

  // ===== Period-aware computations =====
  const now = new Date();
  // IST-based today/month — UTC dates are 5:30 off for Indian users
  const todayStr = istDate(now);
  const weekAgoMs = now.getTime() - 7 * 86400000;
  const monthStr = istMonth(now);

  const periodExpenses = expenses.filter((e) => {
    if (period === "today") return e.date === todayStr;
    if (period === "week") return new Date(e.date).getTime() >= weekAgoMs;
    if (period === "month") return e.date.startsWith(monthStr);
    return true;
  });

  const periodIncomes = incomes.filter((i) => {
    if (period === "today") return i.date === todayStr;
    if (period === "week") return new Date(i.date).getTime() >= weekAgoMs;
    if (period === "month") return i.date.startsWith(monthStr);
    return true;
  });

  const spending = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const income = periodIncomes.reduce((s, i) => s + i.amount, 0);

  // Budget is monthly — only meaningful for "month" / "all"
  const monthSpending = expenses
    .filter((e) => e.date.startsWith(monthStr))
    .reduce((s, e) => s + e.amount, 0);
  const budgetPct = Math.round((monthSpending / monthlyBudget) * 100);
  const remaining = monthlyBudget - monthSpending;

  const totalLentOut = borrowLendItems
    .filter((b) => b.type === "lent")
    .reduce((s, b) => s + (b.amount - b.paid), 0);

  // Recent transactions in period
  const recentTx = periodExpenses.slice(0, 4);

  // Pending shopping items
  const pendingShopping = shoppingItems.filter((s) => s.status === "pending").length;

  // ===== Today's Tasks — real data shared with the Routine screen (v2, starts empty) =====
  const [routineData, setRoutineData] = useState<Routine[]>(EMPTY_ROUTINES);
  useEffect(() => {
    const refresh = () => setRoutineData(loadRoutines());
    refresh();
    // QuickAdd (task) and Trash (restore task) write to routine storage —
    // listen for changes so this card updates instantly.
    window.addEventListener("trackly-routines-changed", refresh);
    return () => window.removeEventListener("trackly-routines-changed", refresh);
  }, []);
  const routineTasks = useMemo(() => {
    const all = routineData.flatMap((r) => r.tasks.map((t) => ({ label: t.label, done: t.done, routineId: r.id, taskId: t.id })));
    // Pending tasks first — the most useful thing to see on the dashboard
    return [...all].sort((a, b) => Number(a.done) - Number(b.done));
  }, [routineData]);
  const doneTasks = routineTasks.filter((t) => t.done).length;
  const totalTasks = routineTasks.length;

  // Toggle a task's done state straight from the Dashboard (persists to Routine storage)
  const toggleTaskFromDashboard = (routineId: string, taskId: string) => {
    setRoutineData((prev) => {
      const updated = prev.map((r) =>
        r.id === routineId
          ? { ...r, tasks: r.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
          : r
      );
      saveRoutines(updated);
      return updated;
    });
  };

  // ===== Weekly chart data — based on period =====
  const chartData = (() => {
    if (period === "today") {
      // Hourly breakdown for today
      const hours = Array.from({ length: 8 }, (_, i) => {
        const h = i * 3;
        return { label: `${h}h`, amount: 0 };
      });
      periodExpenses.forEach((e) => {
        const hour = parseInt(e.time?.split(":")[0] || "12", 10);
        const bucket = Math.min(7, Math.floor(hour / 3));
        hours[bucket].amount += e.amount;
      });
      return hours;
    }
    if (period === "week" || period === "all") {
      // Last 7 days — compute from actual expenses
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const today = new Date();
      const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Monday
      return days.map((label, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - dayOfWeek + i);
        const dateStr = istDate(d);
        const amount = periodExpenses.filter((e) => e.date === dateStr).reduce((s, e) => s + e.amount, 0);
        return { label, amount };
      });
    }
    // month: last 4 weeks aggregated from actual data
    const now = new Date();
    const weeks = ["W1", "W2", "W3", "W4"];
    return weeks.map((label, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (3 - i) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const amount = periodExpenses
        .filter((e) => {
          const ed = new Date(e.date);
          return ed >= weekStart && ed < weekEnd;
        })
        .reduce((s, e) => s + e.amount, 0);
      return { label, amount };
    });
  })();

  const maxChart = Math.max(...chartData.map((d) => d.amount), 1);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Scrollable content */}
      <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      {/* Header */}
      <div className="px-5 pt-2 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground font-medium">
            {mounted ? now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" }) : ""}
          </p>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-1">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => openSearch("dashboard")} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center" aria-label="Search">
            <Search size={18} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setScreen("notifications")} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center relative" aria-label="Notifications">
            <Bell size={18} />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center">
                {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* ===== Period Filter ===== */}
      <div className="px-5 mt-3">
        <div className="flex bg-muted rounded-xl p-1">
          {(["today", "week", "month", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`relative flex-1 py-2 text-[13px] font-semibold rounded-lg transition-colors ${
                period === p ? "text-background" : "text-muted-foreground"
              }`}
            >
              {period === p && (
                <motion.div
                  layoutId="period-pill"
                  className="absolute inset-0 bg-foreground rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative z-10 capitalize">{p === "all" ? "All" : p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== Hero: Spending ===== */}
      <div className="px-5 mt-3">
        <motion.div
          key={period}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-foreground text-background p-5" dataTour="today-spending">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] opacity-70 font-medium capitalize">{period === "all" ? "Total" : period} Spending</p>
                <p className="text-[40px] font-bold tracking-tight mt-1 text-display">{formatINR(spending)}</p>
                <div className="flex items-center gap-1.5 mt-2 text-[13px] opacity-80">
                  <TrendingDown size={13} />
                  <span>{periodExpenses.length} transactions</span>
                </div>
              </div>
              <RingProgress value={budgetPct} size={64} stroke={5}>
                <div className="text-center">
                  <div className="text-[15px] font-bold leading-none">{budgetPct}%</div>
                  <div className="text-[8px] opacity-70 mt-0.5 uppercase">used</div>
                </div>
              </RingProgress>
            </div>
            <div className="h-px bg-background/20 my-4" />
            <div className="flex items-center justify-between">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setBudgetInput(String(monthlyBudget));
                  setShowBudgetEdit(true);
                }}
                className="text-left"
                data-tour="budget-remaining"
              >
                <p className="text-[12px] opacity-70">Budget remaining (month)</p>
                <p className="text-[17px] font-semibold mt-0.5">{formatINR(remaining)}</p>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setScreen("reports")}
                className="text-[13px] font-medium opacity-80 flex items-center gap-0.5"
              >
                View report <ChevronRight size={14} />
              </motion.button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Quick stats row */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        <StatCard
          label="Income"
          value={formatINR(income)}
          trend={`${periodIncomes.length} sources`}
          icon={<ArrowDownRight size={14} />}
          onClick={() => setScreen("expenses")}
        />
        <StatCard
          label="Lent Out"
          value={formatINR(totalLentOut)}
          trend={`${borrowLendItems.filter((b) => b.type === "lent" && b.amount > b.paid).length} active`}
          icon={<ArrowUpRight size={14} />}
          onClick={() => setScreen("borrow")}
        />
      </div>

      {/* ===== Recent Transactions (period-aware) ===== */}
      <Section title="Recent Transactions" onTitle={() => setScreen("expenses")} dataTour="recent-transactions">
        {recentTx.length === 0 ? (
          <EmptyState
            title={period === "all" ? "No transactions yet" : period === "today" ? "No transactions yet today" : `No transactions this ${period}`}
            description="Tap the + button below to add your first entry."
          />
        ) : (
          <Card className="p-0 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {recentTx.map((e, i, arr) => (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setScreen("expenses")}
                  className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <CategoryIcon name={expenseCat(e.category)} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium truncate">{e.title}</p>
                    <p className="text-[12px] text-muted-foreground truncate">{e.merchant} · {to12hr(e.time)}</p>
                  </div>
                  <p className="text-[15px] font-semibold tabular-nums">−{formatINR(e.amount)}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </Card>
        )}
      </Section>

      {/* Today's Tasks */}
      <Section title="Today's Tasks" onTitle={() => setScreen("routine")}>
        {routineTasks.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            description="Add your first task and it will show up here."
            action={<AddPillButton label="Add task" onClick={() => setAddTaskOpen(true)} />}
          />
        ) : (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div>
              <p className="text-[15px] font-semibold">Routine progress</p>
              <p className="text-[12px] text-muted-foreground">{doneTasks} of {totalTasks} completed</p>
            </div>
            <span className="text-[20px] font-bold tabular-nums">{totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%</span>
          </div>
          <ProgressBar value={totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0} className="mx-4 mb-3" />
          <div className="px-2 pb-2">
            {routineTasks.slice(0, 3).map((t, i, arr) => (
              <motion.div
                key={`${i}-${t.label}`}
                whileTap={{ scale: 0.99 }}
                onClick={() => setScreen("routine")}
                className={`flex items-center gap-3 py-2.5 px-2 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
              >
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (t.taskId) toggleTaskFromDashboard(t.routineId, t.taskId);
                    else setScreen("routine");
                  }}
                  aria-label={t.done ? `Mark "${t.label}" pending` : `Mark "${t.label}" done`}
                  className="shrink-0"
                >
                  {t.done ? <CheckCircle2 size={20} className="text-foreground" /> : <Circle size={20} className="text-muted-foreground" />}
                </motion.button>
                <span className={`text-[14px] ${t.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{t.label}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
      </Section>

      {/* Habits */}
      <Section title="Habit Progress" onTitle={() => setScreen("habits")} dataTour="habit-progress">
        {habits.length === 0 ? (
          <EmptyState
            title="No habits yet"
            description="Add your first habit to start tracking streaks."
            action={<AddPillButton label="Add habit" onClick={() => setAddHabitOpen(true)} />}
          />
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
            {habits.slice(0, 4).map((h) => {
              const pct = Math.min(100, Math.round((h.done / h.goal) * 100));
              return (
                <motion.div
                  key={h.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setScreen("habits")}
                  className="shrink-0 w-[140px] bg-card rounded-2xl p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <CategoryIcon name={h.icon} size={16} />
                    </div>
                    <div className="flex items-center gap-0.5 text-[11px] font-medium">
                      <Flame size={11} />
                      {h.streak}
                    </div>
                  </div>
                  <p className="text-[13px] font-semibold mt-2.5">{h.name}</p>
                  <p className="text-[11px] text-muted-foreground">{h.done}/{h.goal} {h.unit}</p>
                  <ProgressBar value={pct} className="mt-2 h-1.5" />
                </motion.div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Shopping + Quick Notes */}
      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        <motion.div whileTap={{ scale: 0.97 }} onClick={() => setScreen("shopping")}>
          <Card className="h-full">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-muted-foreground font-medium">Shopping</p>
              <span className="text-[11px] font-medium bg-muted px-1.5 py-0.5 rounded">{pendingShopping}</span>
            </div>
            <p className="text-[22px] font-bold mt-1 text-display">{pendingShopping}</p>
            <p className="text-[11px] text-muted-foreground">items pending</p>
            {shoppingItems[0] && (
              <div className="flex -space-x-1.5 mt-3">
                {shoppingItems.slice(0, 3).map((s) => (
                  <div key={s.id} className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-[9px] font-bold">{s.name[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div whileTap={{ scale: 0.97 }} onClick={() => setScreen("notes")}>
          <Card className="h-full">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-muted-foreground font-medium">Quick Notes</p>
              <Sparkles size={14} className="text-muted-foreground" />
            </div>
            {notes[0] ? (
              <>
                <p className="text-[14px] font-semibold mt-1 line-clamp-2 leading-snug">{notes[0].title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notes[0].preview}</p>
              </>
            ) : (
              <p className="text-[12px] text-muted-foreground mt-1">No notes yet</p>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Upcoming */}
      <Section title="Upcoming" action="Calendar" onAction={() => setScreen("calendar")}>
        {calendarEvents.length === 0 ? (
          <EmptyState title="No upcoming events" description="Your scheduled events will appear here." />
        ) : (
          <Card className="p-0">
            {calendarEvents.slice(0, 3).map((e, i, arr) => (
              <div key={e.id} className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <div className="h-10 w-10 rounded-xl bg-muted flex flex-col items-center justify-center">
                  <CalendarIcon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium truncate">{e.title}</p>
                  <p className="text-[12px] text-muted-foreground capitalize">{e.type} · {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            ))}
          </Card>
        )}
      </Section>

      {/* Chart */}
      <Section title={period === "today" ? "Today's Breakdown" : period === "month" ? "Weekly Trend" : "Weekly Statistics"} action="Reports" onAction={() => setScreen("reports")}>
        <Card>
          {chartData.every((d) => d.amount === 0) ? (
            <EmptyState title="No data for this period" description="Add transactions to see the chart." />
          ) : (
            <div className="flex items-end justify-between h-32 gap-2">
              {chartData.map((d, i) => {
                const h = (d.amount / maxChart) * 100;
                const isLast = i === chartData.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[10px] font-medium tabular-nums">
                      {d.amount >= 1000 ? `${(d.amount / 1000).toFixed(1)}k` : d.amount > 0 ? d.amount : ""}
                    </span>
                    <div className="w-full flex-1 flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.06, type: "spring", stiffness: 120, damping: 18 }}
                        className={`w-full rounded-md ${isLast ? "bg-foreground" : "bg-muted"}`}
                        style={{ minHeight: d.amount > 0 ? 4 : 0 }}
                      />
                    </div>
                    <span className={`text-[11px] font-medium ${isLast ? "" : "text-muted-foreground"}`}>{d.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Section>

      {/* Pro tip */}
      <div className="px-5 mt-5">
        <motion.button whileTap={{ scale: 0.98 }} onClick={openQuickAdd} className="w-full rounded-2xl border border-dashed border-border p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-semibold">Try Quick Add</p>
            <p className="text-[12px] text-muted-foreground">Tap to add an expense in under 3 seconds</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </motion.button>
      </div>
      </div>{/* end scrollable content */}

      {/* Budget Edit Modal — absolute positioning (sibling of scrollable div)
          so it stays within the app frame and slides up from bottom like QuickAdd. */}
      <AnimatePresence>
        {showBudgetEdit && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBudgetEdit(false)}
              className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute bottom-0 left-0 right-0 z-50 rounded-t-[32px] bg-background pb-8 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-5 pt-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[20px] font-bold">Set Monthly Budget</h2>
                  <button
                    onClick={() => setShowBudgetEdit(false)}
                    className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="rounded-2xl bg-foreground text-background p-4 flex items-center gap-3 mb-4">
                  <div className="h-11 w-11 rounded-2xl bg-background/15 flex items-center justify-center shrink-0">
                    <Wallet size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Current budget</p>
                    <p className="text-[20px] font-bold tracking-tight">{formatINR(monthlyBudget)}</p>
                  </div>
                </div>

                <label className="text-[12px] text-muted-foreground font-medium">New budget amount (₹)</label>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && budgetInput.trim()) handleSaveBudget();
                  }}
                  placeholder="e.g. 30000"
                  className="w-full mt-1 h-14 px-4 rounded-xl bg-muted text-[20px] font-bold outline-none placeholder:text-muted-foreground tabular-nums"
                />

                {/* Preset chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[10000, 20000, 30000, 50000, 80000, 100000].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setBudgetInput(String(preset))}
                      className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${
                        budgetInput === String(preset)
                          ? "bg-foreground text-background border-foreground"
                          : "border-border"
                      }`}
                    >
                      ₹{preset.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveBudget}
                  disabled={!budgetInput.trim()}
                  className="w-full h-[52px] mt-4 rounded-2xl bg-foreground text-background font-semibold text-[16px] disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Save Budget
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Quick Add Task (empty-state button) ===== */}
      <TaskFormModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onSubmit={(label, period) => {
          if (addTaskToRoutine(label, period)) {
            toast.success(`Task added to ${period}`);
            setAddTaskOpen(false);
          }
        }}
      />

      {/* ===== Quick Add Habit (empty-state button) ===== */}
      <HabitFormModal
        open={addHabitOpen}
        onClose={() => setAddHabitOpen(false)}
        onSave={(values) => {
          addHabit(values);
          toast.success("Habit added");
          setAddHabitOpen(false);
        }}
      />
    </div>
  );
}

function StatCard({ label, value, trend, icon, onClick }: { label: string; value: string; trend: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} onClick={onClick}>
      <Card>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
          {icon}
          {label}
        </div>
        <p className="text-[20px] font-bold mt-1.5 text-display">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{trend}</p>
      </Card>
    </motion.div>
  );
}

function Section({ title, action, onAction, onTitle, children, dataTour }: { title: string; action?: string; onAction?: () => void; onTitle?: () => void; children: React.ReactNode; dataTour?: string }) {
  return (
    <div className="mt-6" data-tour={dataTour}>
      <div className="px-5 flex items-center justify-between mb-2.5">
        {onTitle ? (
          <motion.button whileTap={{ scale: 0.98 }} onClick={onTitle} className="flex items-center gap-0.5 text-left">
            <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
            <ChevronRight size={15} className="text-muted-foreground mt-1" />
          </motion.button>
        ) : (
          <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
        )}
        {action && (
          <button onClick={onAction} className="text-[13px] text-muted-foreground font-medium">
            {action}
          </button>
        )}
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}

function expenseCat(id: string): string {
  const map: Record<string, string> = {
    food: "utensils", fuel: "fuel", rent: "home", emi: "credit-card",
    shopping: "shopping-bag", bills: "receipt", travel: "plane",
    entertainment: "film", healthcare: "heart-pulse", education: "graduation-cap",
    others: "more-horizontal",
  };
  return map[id] ?? "more-horizontal";
}
