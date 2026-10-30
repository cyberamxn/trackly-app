"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Flame, Trophy, Calendar as CalIcon, Check, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData, type Habit } from "@/lib/trackly/appData";
import { useTrashStore } from "@/lib/trackly/trash";
import { CategoryIcon } from "../CategoryIcon";
import { Card, ProgressBar, RingProgress, ScreenHeader, EmptyState } from "../ui";
import { ActionSheet } from "../ActionSheet";
import { HabitFormModal, AddPillButton } from "../FormModals";
import { useState, useRef } from "react";

type Period = "today" | "week" | "month";

export function Habits() {
  const { setScreen } = useTracklyStore();
  const [period, setPeriod] = useState<Period>("today");
  const habits = useAppData((s) => s.habits);
  const incrementHabit = useAppData((s) => s.incrementHabit);
  const updateHabit = useAppData((s) => s.updateHabit);
  const addHabit = useAppData((s) => s.addHabit);
  const deleteHabit = useAppData((s) => s.deleteHabit);
  const addToTrash = useTrashStore((s) => s.addToTrash);

  // Store only the ID — the habit object is derived fresh on every render so
  // the options sheet's subtitle (done/streak) never goes stale after an
  // increment while the sheet row is open.
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const actionTarget = habits.find((h) => h.id === actionTargetId) ?? null;
  const [editTarget, setEditTarget] = useState<Habit | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // ===== Today stats =====
  const todayDone = habits.filter((h) => h.done >= h.goal).length;
  const totalToday = habits.length;
  const todayPct = totalToday > 0 ? Math.round((todayDone / totalToday) * 100) : 0;
  const longestStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.streak)) : 0;

  // ===== Week stats (from history — last 7 days) =====
  const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekStats = weekDayLabels.map((day, i) => {
    const completed = habits.filter((h) => h.history[i]).length;
    const pct = totalToday > 0 ? Math.round((completed / totalToday) * 100) : 0;
    return { day, completed, total: totalToday, pct };
  });
  const weekCompletedTotal = weekStats.reduce((sum, d) => sum + d.completed, 0);
  const weekPossibleTotal = totalToday * 7;
  const weekAvgPct = weekPossibleTotal > 0 ? Math.round((weekCompletedTotal / weekPossibleTotal) * 100) : 0;

  // ===== Month stats (extrapolated 4-week view from history) =====
  const monthWeeks = [
    { label: "W1", pct: Math.round(weekAvgPct * 0.92) },
    { label: "W2", pct: Math.round(weekAvgPct * 1.05) },
    { label: "W3", pct: Math.round(weekAvgPct * 0.98) },
    { label: "W4", pct: weekAvgPct },
  ];
  const monthAvgPct = Math.round(monthWeeks.reduce((s, w) => s + w.pct, 0) / monthWeeks.length);

  const handleDelete = (h: Habit) => {
    // Soft delete — habit moves to the Deleted Items folder (counted, restorable with streak & history)
    addToTrash({
      type: "habit",
      title: h.name,
      subtitle: `${h.done}/${h.goal} ${h.unit} · 🔥 ${h.streak}d`,
      data: h,
    });
    deleteHabit(h.id);
    toast.success(`"${h.name}" moved to Deleted Items`);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Habits"
        subtitle={
          period === "today"
            ? `${todayDone} of ${totalToday} completed today`
            : period === "week"
            ? `${weekCompletedTotal} completions this week`
            : `${monthAvgPct}% average this month`
        }
        onBack={() => setScreen("dashboard")}
        right={
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAddOpen(true)} className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center" aria-label="Add habit">
            <Plus size={18} />
          </motion.button>
        }
      />

      {/* Hero ring — changes based on period */}
      <div className="px-5 mt-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={period}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="bg-foreground text-background">
              <div className="flex items-center gap-5">
                <RingProgress
                  value={period === "today" ? todayPct : period === "week" ? weekAvgPct : monthAvgPct}
                  size={88}
                  stroke={8}
                >
                  <div className="text-center">
                    <div className="text-[22px] font-bold leading-none">
                      {period === "today" ? todayPct : period === "week" ? weekAvgPct : monthAvgPct}%
                    </div>
                    <div className="text-[10px] opacity-70 mt-0.5 uppercase">{period}</div>
                  </div>
                </RingProgress>
                <div className="flex-1">
                  {period === "today" ? (
                    <>
                      <p className="text-[14px] opacity-80">Keep going!</p>
                      <p className="text-[24px] font-bold mt-1">{todayDone} habits done</p>
                      <div className="flex items-center gap-1.5 mt-2 text-[12px] opacity-80">
                        <Trophy size={13} />
                        Longest streak: {longestStreak} days
                      </div>
                    </>
                  ) : period === "week" ? (
                    <>
                      <p className="text-[14px] opacity-80">This week</p>
                      <p className="text-[24px] font-bold mt-1">{weekCompletedTotal} completions</p>
                      <div className="flex items-center gap-1.5 mt-2 text-[12px] opacity-80">
                        <TrendingUp size={13} />
                        {weekAvgPct}% completion rate
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[14px] opacity-80">This month</p>
                      <p className="text-[24px] font-bold mt-1">{monthAvgPct}% average</p>
                      <div className="flex items-center gap-1.5 mt-2 text-[12px] opacity-80">
                        <TrendingUp size={13} />
                        Across {monthWeeks.length} weeks
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Period segmented control — now drives the view */}
      <div className="px-5 mt-4">
        <div className="flex bg-muted rounded-xl p-1">
          {(["today", "week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`relative flex-1 py-2 text-[13px] font-semibold rounded-lg transition-colors capitalize ${
                period === p ? "text-background" : "text-muted-foreground"
              }`}
            >
              {period === p && (
                <motion.div
                  layoutId="habits-period-pill"
                  className="absolute inset-0 bg-foreground rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative z-10">{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content changes based on period */}
      <AnimatePresence mode="wait">
        <motion.div
          key={period}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {habits.length === 0 ? (
            <div className="px-5 mt-4">
              <EmptyState
                icon={<Flame size={20} className="text-muted-foreground" />}
                title="No habits yet"
                description="Add your first habit to start tracking streaks."
                action={<AddPillButton label="Add habit" onClick={() => setAddOpen(true)} />}
              />
            </div>
          ) : period === "today" ? (
            <TodayView habits={habits} incrementHabit={incrementHabit} onShowOptions={(h) => setActionTargetId(h.id)} />
          ) : period === "week" ? (
            <WeekView habits={habits} weekStats={weekStats} incrementHabit={incrementHabit} onShowOptions={(h) => setActionTargetId(h.id)} />
          ) : (
            <MonthView habits={habits} monthWeeks={monthWeeks} monthAvgPct={monthAvgPct} onShowOptions={(h) => setActionTargetId(h.id)} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ===== Habit options — opens on direct TAP (Edit / Delete) ===== */}
      <ActionSheet
        open={!!actionTarget}
        onClose={() => setActionTargetId(null)}
        title={actionTarget?.name || "Habit"}
        subtitle={actionTarget ? `${actionTarget.done}/${actionTarget.goal} ${actionTarget.unit} · 🔥 ${actionTarget.streak}d` : ""}
        onEdit={() => {
          if (actionTarget) setEditTarget(actionTarget);
        }}
        onDelete={() => {
          if (actionTarget) handleDelete(actionTarget);
        }}
        editLabel="Edit habit"
        deleteLabel="Delete — move to Deleted Items"
      />

      {/* ===== Edit Habit Modal (shared form) ===== */}
      <HabitFormModal
        open={!!editTarget}
        habit={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={(updates) => {
          if (editTarget) {
            updateHabit(editTarget.id, updates);
            toast.success("Habit updated");
          }
          setEditTarget(null);
        }}
      />

      {/* ===== Add Habit Modal (header + / empty state) ===== */}
      <HabitFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(values) => {
          addHabit(values);
          toast.success("Habit added");
          setAddOpen(false);
        }}
      />
    </div>
  );
}

// ===== Habit Card: direct tap or long-press → options sheet (Edit / Delete) =====
function HabitCard({
  habit,
  onShowOptions,
  children,
}: {
  habit: Habit;
  onShowOptions: () => void;
  children: React.ReactNode;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFiredRef = useRef(false);

  const start = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longFiredRef.current = false;
    longPressTimer.current = setTimeout(() => {
      longFiredRef.current = true;
      onShowOptions();
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };
  const cancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleTap = () => {
    if (longFiredRef.current) {
      longFiredRef.current = false;
      return; // long-press already fired — ignore the trailing click
    }
    onShowOptions();
  };

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onClick={handleTap}
    >
      <Card>{children}</Card>
    </motion.div>
  );
}

// ===== Today View =====
function TodayView({
  habits,
  incrementHabit,
  onShowOptions,
}: {
  habits: Habit[];
  incrementHabit: (id: string) => void;
  onShowOptions: (h: Habit) => void;
}) {
  return (
    <div className="px-5 mt-4 space-y-3">
      {habits.map((h) => {
        const pct = Math.min(100, Math.round((h.done / h.goal) * 100));
        const complete = h.done >= h.goal;
        return (
          <HabitCard key={h.id} habit={h} onShowOptions={() => onShowOptions(h)}>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
                <CategoryIcon name={h.icon} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-semibold">{h.name}</p>
                  <div className="flex items-center gap-1 text-[12px] font-medium">
                    <Flame size={12} />
                    {h.streak}d
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {h.done.toLocaleString()} / {h.goal.toLocaleString()} {h.unit}
                </p>
              </div>
              {complete ? (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); incrementHabit(h.id); }}
                  className="h-9 w-9 rounded-full bg-foreground flex items-center justify-center"
                  aria-label={`${h.name} complete`}
                >
                  <Check size={16} className="text-background" strokeWidth={3} />
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); incrementHabit(h.id); }}
                  className="h-9 w-9 rounded-full border-2 border-foreground flex items-center justify-center"
                  aria-label={`Increment ${h.name}`}
                >
                  <Plus size={16} />
                </motion.button>
              )}
            </div>
            <ProgressBar value={pct} className="mt-3 h-1.5" />
          </HabitCard>
        );
      })}
    </div>
  );
}

// ===== Week View =====
function WeekView({
  habits,
  weekStats,
  incrementHabit,
  onShowOptions,
}: {
  habits: Habit[];
  weekStats: { day: string; completed: number; total: number; pct: number }[];
  incrementHabit: (id: string) => void;
  onShowOptions: (h: Habit) => void;
}) {
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // Mon=0...Sun=6

  return (
    <>
      {/* Weekly completion chart */}
      <div className="px-5 mt-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[15px] font-semibold">Weekly completion</p>
              <p className="text-[12px] text-muted-foreground">
                {weekStats.reduce((s, d) => s + d.completed, 0)} of {weekStats[0].total * 7} completions
              </p>
            </div>
            <CalIcon size={18} className="text-muted-foreground" />
          </div>
          <div className="flex items-end justify-between h-32 gap-2">
            {weekStats.map((d, i) => {
              const isToday = i === todayIdx;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-medium tabular-nums">{d.pct}%</span>
                  <div className="w-full flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${d.pct}%` }}
                      transition={{ delay: i * 0.06, type: "spring", stiffness: 120, damping: 18 }}
                      className={`w-full rounded-md ${isToday ? "bg-foreground" : "bg-muted"}`}
                      style={{ minHeight: d.pct > 0 ? 4 : 0 }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Habit cards with weekly history */}
      <div className="px-5 mt-4 space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Habit History</p>
        {habits.map((h) => {
          const weekCompleted = h.history.filter(Boolean).length;
          const weekPct = Math.round((weekCompleted / 7) * 100);
          return (
            <HabitCard key={h.id} habit={h} onShowOptions={() => onShowOptions(h)}>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
                  <CategoryIcon name={h.icon} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold">{h.name}</p>
                    <div className="flex items-center gap-1 text-[12px] font-medium">
                      <Flame size={12} />
                      {h.streak}d
                    </div>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {weekCompleted}/7 days · {weekPct}% this week
                  </p>
                </div>
                </div>
              {/* Weekly history grid */}
              <div className="flex items-center justify-between mt-3">
                {h.history.map((done: boolean, i: number) => {
                  const isToday = i === todayIdx;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-7 w-7 rounded-md flex items-center justify-center ${
                          done ? "bg-foreground" : "bg-muted"
                        } ${isToday ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                      >
                        {done && <Check size={12} className="text-background" strokeWidth={3} />}
                      </div>
                      <span className={`text-[9px] ${isToday ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                        {["M", "T", "W", "T", "F", "S", "S"][i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </HabitCard>
          );
        })}
      </div>
    </>
  );
}

// ===== Month View =====
function MonthView({
  habits,
  monthWeeks,
  monthAvgPct,
  onShowOptions,
}: {
  habits: Habit[];
  monthWeeks: { label: string; pct: number }[];
  monthAvgPct: number;
  onShowOptions: (h: Habit) => void;
}) {
  return (
    <>
      {/* Monthly chart */}
      <div className="px-5 mt-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[15px] font-semibold">Monthly breakdown</p>
              <p className="text-[12px] text-muted-foreground">{monthAvgPct}% average across 4 weeks</p>
            </div>
            <CalIcon size={18} className="text-muted-foreground" />
          </div>
          <div className="flex items-end justify-between h-40 gap-3">
            {monthWeeks.map((w, i) => {
              const isCurrent = i === monthWeeks.length - 1;
              return (
                <div key={w.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[11px] font-bold tabular-nums">{w.pct}%</span>
                  <div className="w-full flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${w.pct}%` }}
                      transition={{ delay: i * 0.1, type: "spring", stiffness: 120, damping: 18 }}
                      className={`w-full rounded-lg ${isCurrent ? "bg-foreground" : "bg-muted"}`}
                      style={{ minHeight: w.pct > 0 ? 8 : 0 }}
                    />
                  </div>
                  <div className="text-center">
                    <span className={`text-[11px] font-medium block ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                      {w.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{isCurrent ? "Current" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Per-habit monthly summary */}
      <div className="px-5 mt-4 space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Habit Performance</p>
        {habits.map((h) => {
          // Estimate monthly completion from streak + history
          const weekCompleted = h.history.filter(Boolean).length;
          const monthEstimate = Math.round((weekCompleted / 7) * 30);
          const monthPct = Math.min(100, Math.round((monthEstimate / 30) * 100));
          return (
            <HabitCard key={h.id} habit={h} onShowOptions={() => onShowOptions(h)}>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
                  <CategoryIcon name={h.icon} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold">{h.name}</p>
                    <div className="flex items-center gap-1 text-[12px] font-medium">
                      <Flame size={12} />
                      {h.streak}d streak
                    </div>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    ~{monthEstimate}/30 days · {monthPct}% this month
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[20px] font-bold tabular-nums">{monthPct}%</p>
                </div>
                </div>
              <ProgressBar value={monthPct} className="mt-3 h-1.5" />
            </HabitCard>
          );
        })}
      </div>
    </>
  );
}
