"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal, ArrowDownLeft, ArrowUpRight,
  Search as SearchIcon, X, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData } from "@/lib/trackly/appData";
import { CategoryIcon } from "../CategoryIcon";
import { Card, SegmentedControl, Chip, ScreenHeader, EmptyState, SheetModal } from "../ui";
import { ActionSheet } from "../ActionSheet";
import { expenseCategories, paymentMethods, formatINR } from "@/lib/trackly/data";
import { istDate, istMonth, to12hr } from "@/lib/trackly/ist";
import { useTrashStore } from "@/lib/trackly/trash";
import { useSync as useAdminSync } from "@/lib/trackly/sync";

type Filter = "all" | "expense" | "income";
type Period = "today" | "week" | "month" | "all";

// Unified transaction shape for the list (expenses + incomes combined)
interface TxRow {
  id: string;
  kind: "expense" | "income";
  title: string;
  subtitle: string;
  amount: number; // always positive; sign comes from `kind`
  category: string;
  date: string;
  time: string;
  method: string;
}

export function Expenses() {
  const { setScreen, openSearch } = useTracklyStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [actionTarget, setActionTarget] = useState<TxRow | null>(null);
  const [editTarget, setEditTarget] = useState<TxRow | null>(null);

  // Admin-controlled categories (live from Admin Panel)
  const adminCategories = useAdminSync((s) => s.categories);

  // Live data from store
  const expenses = useAppData((s) => s.expenses);
  const incomes = useAppData((s) => s.incomes);
  const archiveExpense = useAppData((s) => s.archiveExpense);
  const archiveIncome = useAppData((s) => s.archiveIncome);
  const updateExpense = useAppData((s) => s.updateExpense);
  const updateIncome = useAppData((s) => s.updateIncome);
  const deleteExpense = useAppData((s) => s.deleteExpense);
  const deleteIncome = useAppData((s) => s.deleteIncome);
  const addToTrash = useTrashStore((s) => s.addToTrash);

  // ===== Period filtering =====
  const now = new Date();
  // IST-based today/month — UTC dates are 5:30 off for Indian users
  const todayStr = istDate(now);
  const weekAgoMs = now.getTime() - 7 * 86400000;
  const monthStr = istMonth(now);

  const inPeriod = (dateStr: string): boolean => {
    if (period === "today") return dateStr === todayStr;
    if (period === "week") return new Date(dateStr).getTime() >= weekAgoMs;
    if (period === "month") return dateStr.startsWith(monthStr);
    return true; // all
  };

  const periodExpenses = expenses.filter((e) => inPeriod(e.date));
  const periodIncomes = incomes.filter((i) => inPeriod(i.date));

  const totalExpense = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = periodIncomes.reduce((s, i) => s + i.amount, 0);

  // ===== Per-category breakdown (for the header card when a category is selected) =====
  const categoryBreakdown = expenseCategories.map((c) => {
    const catExpenses = periodExpenses.filter((e) => e.category === c.id);
    return {
      id: c.id,
      label: c.label,
      icon: c.icon,
      total: catExpenses.reduce((s, e) => s + e.amount, 0),
      count: catExpenses.length,
    };
  }).filter((c) => c.count > 0);

  const selectedCat = catFilter ? categoryBreakdown.find((c) => c.id === catFilter) : null;

  // ===== Build unified transaction list based on `filter` =====
  const buildTxList = (): TxRow[] => {
    const expRows: TxRow[] = periodExpenses.map((e) => ({
      id: e.id,
      kind: "expense" as const,
      title: e.title,
      subtitle: `${e.merchant} · ${e.method}`,
      amount: e.amount,
      category: e.category,
      date: e.date,
      time: e.time,
      method: e.method,
    }));

    const incRows: TxRow[] = periodIncomes.map((i) => ({
      id: i.id,
      kind: "income" as const,
      title: i.source,
      subtitle: `Income · ${i.method}`,
      amount: i.amount,
      category: "income",
      date: i.date,
      time: "",
      method: i.method,
    }));

    let rows: TxRow[] = [];
    if (filter === "expense") rows = expRows;
    else if (filter === "income") rows = incRows;
    else rows = [...expRows, ...incRows];

    // Category filter (only applies to expenses)
    if (catFilter && filter !== "income") {
      rows = rows.filter((r) => r.kind === "income" || r.category === catFilter);
    }

    // Sort: newest first
    rows.sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const db = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return db - da;
    });

    return rows;
  };

  const filtered = buildTxList();

  // Split today vs earlier
  const todayItems = filtered.filter((r) => r.date === todayStr);
  const earlierItems = filtered.filter((r) => r.date !== todayStr);

  const handleEdit = (row: TxRow) => setEditTarget(row);

  const handleDelete = (row: TxRow) => {
    // Soft delete — the item moves to the Deleted Items folder (counted, restorable)
    if (row.kind === "income") {
      const full = incomes.find((i) => i.id === row.id);
      if (full) {
        addToTrash({
          type: "income",
          title: full.source,
          subtitle: `Income · ${full.method}`,
          data: full,
        });
      }
      deleteIncome(row.id);
      toast.success("Income moved to Deleted Items");
    } else {
      const full = expenses.find((e) => e.id === row.id);
      if (full) {
        addToTrash({
          type: "expense",
          title: full.title,
          subtitle: `${full.merchant} · ${full.method}`,
          icon: full.category,
          data: full,
        });
      }
      deleteExpense(row.id);
      toast.success("Expense moved to Deleted Items");
    }
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Money"
        subtitle="Track expenses & income"
        onBack={() => setScreen("dashboard")}
        right={
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => openSearch("expenses")}
              className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
              aria-label="Search"
            >
              <SearchIcon size={16} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`h-9 w-9 rounded-full flex items-center justify-center ${showFilters ? "bg-foreground text-background" : "bg-muted"}`}
              aria-label="Filters"
            >
              <SlidersHorizontal size={16} />
            </motion.button>
          </div>
        }
      />

      {/* Search bar — tap opens the full search screen (Recent / Trending / Categories) */}
      <div className="px-5 mt-1">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => openSearch("expenses")}
          className="w-full bg-muted rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-left"
          aria-label="Open search"
        >
          <SearchIcon size={16} className="text-muted-foreground shrink-0" />
          <span className="text-[14px] text-muted-foreground">Search transactions…</span>
        </motion.button>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 mt-3 overflow-hidden"
          >
            <div className="bg-muted rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Period</p>
              <div className="flex gap-2 flex-wrap">
                {(["today", "week", "month", "all"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium capitalize transition-colors ${
                      period === p ? "bg-foreground text-background" : "bg-background text-muted-foreground"
                    }`}
                  >
                    {p === "all" ? "All Time" : p}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary — reflects period filter; switches to per-category card when a category is selected */}
      {selectedCat ? (
        <div className="px-5 mt-1">
          <Card className="bg-foreground text-background">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-xl bg-background/15 flex items-center justify-center">
                <CategoryIcon name={selectedCat.icon} size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">{selectedCat.label} · {period === "all" ? "All time" : period}</p>
                <p className="text-[28px] font-bold tracking-tight mt-0.5">{formatINR(selectedCat.total)}</p>
              </div>
              <button
                onClick={() => setCatFilter(null)}
                className="h-8 w-8 rounded-full bg-background/15 flex items-center justify-center"
                aria-label="Clear category filter"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-background/15">
              <div>
                <p className="text-[11px] opacity-70 uppercase tracking-wider font-semibold">Transactions</p>
                <p className="text-[20px] font-bold mt-0.5">{selectedCat.count}</p>
              </div>
              <div>
                <p className="text-[11px] opacity-70 uppercase tracking-wider font-semibold">Avg per tx</p>
                <p className="text-[20px] font-bold mt-0.5">{selectedCat.count > 0 ? formatINR(Math.round(selectedCat.total / selectedCat.count)) : "—"}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="px-5 mt-1 grid grid-cols-2 gap-3">
          <Card>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <ArrowDownLeft size={12} />
              INCOME
            </div>
            <p className="text-[22px] font-bold mt-1.5 text-display text-foreground">{formatINR(totalIncome)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{period === "all" ? "All time" : period}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <ArrowUpRight size={12} className="rotate-180" />
              EXPENSE
            </div>
            <p className="text-[22px] font-bold mt-1.5 text-display">{formatINR(totalExpense)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{period === "all" ? "All time" : period}</p>
          </Card>
        </div>
      )}

      {/* Type filter — All / Expense / Income (NOW FUNCTIONAL) */}
      <div className="px-5 mt-4">
        <SegmentedControl
          options={[
            { label: "All", value: "all" },
            { label: "Expense", value: "expense" },
            { label: "Income", value: "income" },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {/* Category chips — uses admin-controlled categories when synced.
          Always shows "All" first; tapping a category shows per-category totals above. */}
      {filter !== "income" && (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar px-5 pb-1">
            <Chip label="All" active={!catFilter} onClick={() => setCatFilter(null)} />
            {(adminCategories.length > 0
              ? adminCategories.map((label: string, i: number) => ({ id: label.toLowerCase().replace(/\s+/g, "_"), label, icon: "tag" }))
              : expenseCategories
            ).map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                active={catFilter === c.id}
                onClick={() => setCatFilter(c.id === catFilter ? null : c.id)}
              />
            ))}
          </div>

          {/* Per-category breakdown grid (shown when no specific category is selected and there are expenses) */}
          {!catFilter && categoryBreakdown.length > 0 && (
            <div className="px-5 mt-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Category breakdown</p>
              <div className="grid grid-cols-2 gap-2">
                {categoryBreakdown.map((c) => (
                  <motion.button
                    key={c.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setCatFilter(c.id)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border text-left"
                  >
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <CategoryIcon name={c.icon} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium truncate">{c.label}</p>
                      <p className="text-[14px] font-bold tabular-nums">{formatINR(c.total)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.count} tx{c.count > 1 ? "s" : ""}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Transactions list */}
      <div className="px-5 mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox size={20} className="text-muted-foreground" />}
            title="No transactions found"
            description={
              filter === "income"
                ? "No income entries in this period. Tap + to add one."
                : filter === "expense"
                ? catFilter
                  ? `No ${catFilter} expenses in this period.`
                  : "No expenses in this period. Tap + to add one."
                : "Tap the + button below to add your first transaction."
            }
          />
        ) : (
          <>
            {todayItems.length > 0 && (
              <>
                <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Today</p>
                <Card className="p-0 overflow-hidden">
                  {todayItems.map((r, i, arr) => (
                    <TransactionRow key={`${r.kind}-${r.id}`} r={r} i={i} arr={arr} onShowOptions={setActionTarget} />
                  ))}
                </Card>
              </>
            )}

            {earlierItems.length > 0 && (
              <>
                <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 mt-5">Earlier</p>
                <Card className="p-0 overflow-hidden">
                  {earlierItems.map((r, i, arr) => (
                    <TransactionRow key={`${r.kind}-${r.id}`} r={r} i={i} arr={arr} showDate onShowOptions={setActionTarget} />
                  ))}
                </Card>
              </>
            )}
          </>
        )}
      </div>

      {/* ===== Transaction options — opens on direct TAP (Edit / Archive / Delete) ===== */}
      <ActionSheet
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={actionTarget?.title || "Transaction"}
        subtitle={actionTarget ? `${actionTarget.kind === "income" ? "+" : "−"}${formatINR(actionTarget.amount)}` : ""}
        onEdit={() => {
          if (actionTarget) handleEdit(actionTarget);
        }}
        onArchive={() => {
          if (!actionTarget) return;
          if (actionTarget.kind === "income") {
            archiveIncome(actionTarget.id);
            toast.success("Income archived");
          } else {
            archiveExpense(actionTarget.id);
            toast.success("Expense archived");
          }
        }}
        onDelete={() => {
          if (!actionTarget) return;
          handleDelete(actionTarget);
        }}
        editLabel="Edit transaction"
        archiveLabel="Archive (hide from view)"
        deleteLabel="Delete — move to Deleted Items"
      />

      {/* ===== Edit Transaction Modal ===== */}
      <EditTransactionModal
        open={!!editTarget}
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={(updates) => {
          if (!editTarget) return;
          if (editTarget.kind === "income") {
            updateIncome(editTarget.id, {
              source: updates.title,
              amount: updates.amount,
              method: updates.method,
              date: updates.date,
            });
          } else {
            updateExpense(editTarget.id, {
              title: updates.title,
              merchant: updates.merchant || updates.title,
              amount: updates.amount,
              category: updates.category,
              method: updates.method,
              date: updates.date,
              time: updates.time,
            });
          }
          toast.success("Transaction updated");
          setEditTarget(null);
        }}
      />
    </div>
  );
}

function TransactionRow({
  r,
  i,
  arr,
  showDate,
  onShowOptions,
}: {
  r: TxRow;
  i: number;
  arr: TxRow[];
  showDate?: boolean;
  onShowOptions?: (row: TxRow) => void;
}) {
  const isIncome = r.kind === "income";
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFiredRef = useRef(false);

  const handlePressStart = () => {
    if (!onShowOptions) return;
    longFiredRef.current = false;
    longPressTimer.current = setTimeout(() => {
      longFiredRef.current = true;
      onShowOptions(r);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Direct tap on the transaction → options sheet (Edit / Archive / Delete).
  // Long-press opens the same sheet.
  const handleTap = () => {
    if (longFiredRef.current) {
      longFiredRef.current = false;
      return; // long-press already fired its own action — ignore the trailing click
    }
    onShowOptions?.(r);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
      onClick={handleTap}
      className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
    >
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        {isIncome ? (
          <ArrowDownLeft size={18} />
        ) : (
          <CategoryIcon name={caticon(r.category)} size={18} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium truncate">{r.title}</p>
        <p className="text-[12px] text-muted-foreground truncate">
          {r.subtitle}
          {showDate
            ? ` · ${new Date(r.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}${r.time ? ` · ${to12hr(r.time)}` : ""}`
            : r.time ? ` · ${to12hr(r.time)}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-[15px] font-semibold tabular-nums ${isIncome ? "text-foreground" : ""}`}>
          {isIncome ? "+" : "−"}{formatINR(r.amount)}
        </p>
        <p className="text-[11px] text-muted-foreground capitalize">{isIncome ? "Income" : r.category}</p>
      </div>
    </motion.div>
  );
}

// ===== Edit Transaction Modal =====
function EditTransactionModal({
  open,
  target,
  onClose,
  onSave,
}: {
  open: boolean;
  target: TxRow | null;
  onClose: () => void;
  onSave: (updates: { title: string; merchant: string; amount: number; category: string; method: string; date: string; time: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("others");
  const [method, setMethod] = useState("Card");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (open && target) {
      setTitle(target.title);
      setMerchant(target.subtitle.split(" · ")[0] || "");
      setAmount(String(target.amount));
      setCategory(target.category === "income" ? "others" : target.category);
      setMethod(target.method);
      setDate(target.date);
      setTime(target.time || "");
    }
  }, [open, target]);

  if (!target) return null;
  const isIncome = target.kind === "income";

  return (
    <SheetModal open={open} onClose={onClose} title={`Edit ${isIncome ? "income" : "expense"}`}>
      <div className="space-y-3 pb-2">
        <div>
          <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">{isIncome ? "Source" : "Title"}</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isIncome ? "e.g. Salary" : "e.g. Starbucks Coffee"}
            className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        {!isIncome && (
          <div>
            <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Merchant</label>
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Starbucks"
              className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}
        <div>
          <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Amount (₹)</label>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 250"
            className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        {!isIncome && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] outline-none"
              />
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Time (IST)</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] outline-none"
              />
            </div>
          </div>
        )}
        {isIncome && (
          <div>
            <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] outline-none"
            />
          </div>
        )}
        {!isIncome && (
          <div>
            <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {expenseCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    category === c.id ? "bg-foreground text-background border-foreground" : "border-border"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Payment method</label>
          <div className="flex flex-wrap gap-1.5">
            {paymentMethods.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                  method === m ? "bg-foreground text-background border-foreground" : "border-border"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-muted text-[14px] font-medium"
          >
            Cancel
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              const amt = parseInt(amount.replace(/[^\d]/g, ""), 10);
              if (!title.trim()) { toast.error("Title required"); return; }
              if (isNaN(amt) || amt <= 0) { toast.error("Valid amount required"); return; }
              if (!date) { toast.error("Date required"); return; }
              onSave({
                title: title.trim(),
                merchant: merchant.trim() || title.trim(),
                amount: amt,
                category,
                method,
                date,
                time: time || "12:00",
              });
            }}
            className="flex-1 h-11 rounded-xl bg-foreground text-background text-[14px] font-semibold"
          >
            Save
          </motion.button>
        </div>
      </div>
    </SheetModal>
  );
}

function caticon(id: string): string {
  const map: Record<string, string> = {
    food: "utensils", fuel: "fuel", rent: "home", emi: "credit-card",
    shopping: "shopping-bag", bills: "receipt", travel: "plane",
    entertainment: "film", healthcare: "heart-pulse", education: "graduation-cap",
    grocery: "shopping-cart", others: "more-horizontal",
  };
  return map[id] ?? "more-horizontal";
}
