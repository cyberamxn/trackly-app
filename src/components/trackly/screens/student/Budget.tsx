"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, TrendingDown, Utensils, Plane, BookOpen, Pencil,
  Home, PencilRuler, MoreHorizontal, PiggyBank, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData } from "@/lib/trackly/appData";
import { formatINR } from "@/lib/trackly/data";
import {
  ScreenHeader, ScreenWrapper, Card, SheetModal, ProgressBar,
} from "../../ui";

const STUDENT_BUDGET_KEY = "trackly-student-budget";
const POCKET_MONEY_KEY = "trackly-student-pocket-money";
const DEFAULT_BUDGET = 12000;
const DEFAULT_POCKET = 8000;

// Map appData expense categories to student-facing groups
const CATEGORY_GROUPS: { label: string; match: string[]; icon: typeof Utensils }[] = [
  { label: "Food", match: ["food"], icon: Utensils },
  { label: "Travel", match: ["travel", "fuel"], icon: Plane },
  { label: "Books", match: ["education"], icon: BookOpen },
  { label: "Stationery", match: ["shopping"], icon: PencilRuler },
  { label: "Hostel", match: ["rent", "bills"], icon: Home },
  { label: "Other", match: ["entertainment", "healthcare", "emi", "others"], icon: MoreHorizontal },
];

function groupFor(category: string): string {
  for (const g of CATEGORY_GROUPS) {
    if (g.match.includes(category)) return g.label;
  }
  return "Other";
}

function last7Days(): { label: string; date: string }[] {
  const days: { label: string; date: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      date: d.toISOString().slice(0, 10),
    });
  }
  return days;
}

export function Budget() {
  const { setScreen } = useTracklyStore();
  const expenses = useAppData((s) => s.expenses);

  // Load persisted values via lazy initial state (no effect needed)
  const [budget, setBudget] = useState<number>(() => readNumber(STUDENT_BUDGET_KEY, DEFAULT_BUDGET));
  const [pocketMoney, setPocketMoney] = useState<number>(() => readNumber(POCKET_MONEY_KEY, DEFAULT_POCKET));
  const [showBudget, setShowBudget] = useState(false);
  const [showPocket, setShowPocket] = useState(false);
  // Session counters — bump when opening so the sheet remounts with fresh state.
  const [budgetSession, setBudgetSession] = useState(0);
  const [pocketSession, setPocketSession] = useState(0);

  const monthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(monthStr)),
    [expenses, monthStr]
  );

  const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const savings = budget - totalSpent;
  const spentPct = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;
  const remainingPct = Math.max(0, 100 - spentPct);

  // Category breakdown
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthExpenses) {
      const g = groupFor(e.category);
      map[g] = (map[g] ?? 0) + e.amount;
    }
    return CATEGORY_GROUPS.map((g) => ({
      label: g.label,
      icon: g.icon,
      amount: map[g.label] ?? 0,
      pct: totalSpent > 0 ? Math.round(((map[g.label] ?? 0) / totalSpent) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);
  }, [monthExpenses, totalSpent]);

  // 7-day trend
  const trend = useMemo(() => {
    const days = last7Days();
    return days.map((d) => ({
      label: d.label,
      date: d.date,
      amount: expenses
        .filter((e) => e.date === d.date)
        .reduce((s, e) => s + e.amount, 0),
    }));
  }, [expenses]);
  const maxDay = Math.max(1, ...trend.map((t) => t.amount));

  const todaySpent = expenses
    .filter((e) => e.date === new Date().toISOString().slice(0, 10))
    .reduce((s, e) => s + e.amount, 0);

  const saveBudget = (v: number) => {
    setBudget(v);
    try { localStorage.setItem(STUDENT_BUDGET_KEY, String(v)); } catch { /* ignore */ }
    toast.success(`Budget set to ${formatINR(v)}`);
    setShowBudget(false);
  };

  const savePocket = (v: number) => {
    setPocketMoney(v);
    try { localStorage.setItem(POCKET_MONEY_KEY, String(v)); } catch { /* ignore */ }
    toast.success(`Pocket money set to ${formatINR(v)}`);
    setShowPocket(false);
  };

  const openBudget = () => { setBudgetSession((n) => n + 1); setShowBudget(true); };
  const openPocket = () => { setPocketSession((n) => n + 1); setShowPocket(true); };

  return (
    <ScreenWrapper>
      <ScreenHeader
        title="Student Budget"
        subtitle="Track spending & savings"
        onBack={() => setScreen("student-dashboard")}
      />

      {/* Monthly summary */}
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="bg-foreground text-background">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">This Month</p>
                <p className="text-[40px] font-bold tracking-tight mt-1 text-display">{formatINR(totalSpent)}</p>
                <p className="text-[12px] opacity-80 mt-0.5">spent of {formatINR(budget)} budget</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={openBudget}
                className="h-8 w-8 rounded-full bg-background/15 flex items-center justify-center"
                aria-label="Edit budget"
              >
                <Pencil size={14} />
              </motion.button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] mb-1.5 opacity-80">
                <span>{spentPct}% used</span>
                <span>{remainingPct}% left</span>
              </div>
              <div className="h-2.5 rounded-full bg-background/20 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, spentPct)}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  className="h-full bg-background rounded-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-background/10 rounded-2xl p-3">
                <p className="text-[10px] uppercase tracking-wider opacity-70 font-semibold flex items-center gap-1">
                  <ArrowUpRight size={11} /> Savings
                </p>
                <p className={`text-[18px] font-bold mt-0.5 tabular-nums ${savings >= 0 ? "" : "opacity-90"}`}>
                  {savings >= 0 ? formatINR(savings) : `−${formatINR(Math.abs(savings))}`}
                </p>
              </div>
              <div className="bg-background/10 rounded-2xl p-3">
                <p className="text-[10px] uppercase tracking-wider opacity-70 font-semibold flex items-center gap-1">
                  <ArrowDownRight size={11} /> Today
                </p>
                <p className="text-[18px] font-bold mt-0.5 tabular-nums">{formatINR(todaySpent)}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Pocket money */}
      <div className="px-5 mt-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
          <Card>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
                <PiggyBank size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Pocket Money</p>
                <p className="text-[20px] font-bold tabular-nums text-display">{formatINR(pocketMoney)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {pocketMoney > 0 ? `${Math.round((pocketMoney / Math.max(1, budget)) * 100)}% of budget` : "Set your monthly allowance"}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={openPocket}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                aria-label="Edit pocket money"
              >
                <Pencil size={14} />
              </motion.button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* 7-day trend */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={16} />
            <h2 className="text-[18px] font-bold tracking-tight">Last 7 Days</h2>
          </div>
          <span className="text-[12px] text-muted-foreground tabular-nums">
            Avg {formatINR(Math.round(trend.reduce((s, t) => s + t.amount, 0) / 7))}/d
          </span>
        </div>
        <Card>
          <div className="flex items-end justify-between gap-1.5 h-32">
            {trend.map((t, i) => {
              const h = Math.max(4, (t.amount / maxDay) * 100);
              const isToday = i === trend.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] tabular-nums text-muted-foreground font-medium">
                    {t.amount > 0 ? `${(t.amount / 1000).toFixed(1)}k` : ""}
                  </span>
                  <div className="w-full h-full flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 18, delay: i * 0.04 }}
                      className={`w-full rounded-md ${isToday ? "bg-foreground" : "bg-muted"}`}
                      style={{ minHeight: 4 }}
                    />
                  </div>
                  <span className={`text-[11px] font-semibold ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
                    {t.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Category breakdown */}
      <div className="px-5 mt-5 pb-32">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Wallet size={16} />
            <h2 className="text-[18px] font-bold tracking-tight">Categories</h2>
          </div>
          <span className="text-[12px] text-muted-foreground tabular-nums">{formatINR(totalSpent)}</span>
        </div>

        {totalSpent === 0 ? (
          <Card>
            <div className="py-4 text-center">
              <p className="text-[14px] font-semibold">No spending this month</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Add expenses to see breakdown</p>
            </div>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            {categoryTotals.map((c, i, arr) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className={`px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[14px] font-medium">{c.label}</p>
                        <p className="text-[14px] font-semibold tabular-nums">{formatINR(c.amount)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <ProgressBar value={c.pct} className="h-1.5 flex-1" />
                        <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">{c.pct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        {/* Savings card */}
        <div className="mt-5">
          <Card className={savings >= 0 ? "border-2 border-foreground" : ""}>
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${savings >= 0 ? "bg-foreground text-background" : "bg-muted"}`}>
                {savings >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {savings >= 0 ? "On track" : "Over budget"}
                </p>
                <p className="text-[20px] font-bold tabular-nums text-display">
                  {savings >= 0 ? formatINR(savings) : `−${formatINR(Math.abs(savings))}`}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {savings >= 0
                    ? `${Math.round((savings / Math.max(1, budget)) * 100)}% of budget saved`
                    : `${Math.round((Math.abs(savings) / Math.max(1, budget)) * 100)}% over budget`}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit budget sheet */}
      <AmountEditSheet
        key={`budget-${budgetSession}`}
        open={showBudget}
        title="Monthly Budget"
        onClose={() => setShowBudget(false)}
        initial={budget}
        onSave={saveBudget}
      />
      <AmountEditSheet
        key={`pocket-${pocketSession}`}
        open={showPocket}
        title="Pocket Money"
        onClose={() => setShowPocket(false)}
        initial={pocketMoney}
        onSave={savePocket}
      />
    </ScreenWrapper>
  );
}

function readNumber(key: string, fallback: number): number {
  try {
    if (typeof window === "undefined") return fallback;
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    const n = parseInt(v);
    return isNaN(n) ? fallback : n;
  } catch {
    return fallback;
  }
}

function AmountEditSheet({
  open,
  title,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  initial: number;
  onSave: (v: number) => void;
}) {
  const [val, setVal] = useState<string>(String(initial));

  return (
    <SheetModal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div>
          <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Amount (₹)</p>
          <input
            type="number"
            inputMode="numeric"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="0"
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[24px] font-bold outline-none placeholder:text-muted-foreground tabular-nums"
          />
          <p className="text-[12px] text-muted-foreground mt-2">
            Used for monthly budgeting calculations and savings tracking.
          </p>
        </div>
        <div className="flex gap-2">
          {[5000, 8000, 12000, 15000].map((preset) => (
            <motion.button
              key={preset}
              whileTap={{ scale: 0.95 }}
              onClick={() => setVal(String(preset))}
              className="flex-1 py-2 rounded-xl bg-muted text-[12px] font-semibold tabular-nums"
            >
              {formatINR(preset)}
            </motion.button>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            const v = parseInt(val);
            if (!isNaN(v) && v >= 0) onSave(v);
            else toast.error("Enter a valid amount");
          }}
          className="w-full h-12 rounded-2xl bg-foreground text-background text-[15px] font-semibold"
        >
          Save
        </motion.button>
      </div>
    </SheetModal>
  );
}
