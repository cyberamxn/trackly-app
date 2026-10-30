"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon, X, Clock, TrendingUp, Receipt, ShoppingBag,
  StickyNote, CheckCircle2, Flame, FileText, User, Camera, ChevronLeft,
  ChevronRight, Inbox,
} from "lucide-react";
import { CategoryIcon } from "../CategoryIcon";
import { Card, EmptyState } from "../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData } from "@/lib/trackly/appData";
import { formatINR } from "@/lib/trackly/data";

const recent = ["Coffee", "Petrol", "AirPods", "Gym membership", "Book"];
const trending = ["Rent", "Salary", "EMI", "Birthday", "Trip to Japan"];

type CategoryId =
  | "expenses" | "shopping" | "notes" | "habits"
  | "tasks" | "receipts" | "people" | "documents";

export function SearchScreen() {
  const { setScreen, searchFrom } = useTracklyStore();
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);

  // Live data from store
  const expenses = useAppData((s) => s.expenses);
  const shoppingItems = useAppData((s) => s.shopping);
  const notes = useAppData((s) => s.notes);
  const habits = useAppData((s) => s.habits);
  const borrowLendItems = useAppData((s) => s.borrowLend);
  const calendarEvents = useAppData((s) => s.calendarEvents);

  const categories: { id: CategoryId; label: string; icon: typeof Receipt; count: number }[] = [
    { id: "expenses", label: "Expenses", icon: Receipt, count: expenses.length },
    { id: "shopping", label: "Shopping", icon: ShoppingBag, count: shoppingItems.length },
    { id: "notes", label: "Notes", icon: StickyNote, count: notes.length },
    { id: "habits", label: "Habits", icon: Flame, count: habits.length },
    { id: "tasks", label: "Tasks", icon: CheckCircle2, count: calendarEvents.filter((e) => e.type === "task").length },
    { id: "receipts", label: "Receipts", icon: Camera, count: expenses.filter((e) => e.tags?.length || e.merchant).length },
    { id: "people", label: "People", icon: User, count: borrowLendItems.length },
    { id: "documents", label: "Documents", icon: FileText, count: notes.filter((n) => n.hasChecklist || n.tags?.length).length },
  ];

  const results = q.trim()
    ? [
        ...expenses
          .filter((e) => (e.title + e.merchant + e.category).toLowerCase().includes(q.toLowerCase()))
          .slice(0, 3)
          .map((e) => ({ kind: "Expense" as const, icon: caticon(e.category), title: e.title, sub: `${e.merchant} · ${formatINR(e.amount)}` })),
        ...shoppingItems
          .filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 2)
          .map((s) => ({ kind: "Shopping" as const, icon: "shopping-bag", title: s.name, sub: `${s.store} · ${formatINR(s.price)}` })),
        ...notes
          .filter((n) => (n.title + n.preview).toLowerCase().includes(q.toLowerCase()))
          .slice(0, 2)
          .map((n) => ({ kind: "Note" as const, icon: "book-open", title: n.title, sub: n.preview.slice(0, 40) + "…" })),
        ...habits
          .filter((h) => h.name.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 2)
          .map((h) => ({ kind: "Habit" as const, icon: h.icon, title: h.name, sub: `${h.streak}-day streak` })),
      ]
    : [];

  // ===== Category Detail View =====
  if (selectedCategory) {
    const cat = categories.find((c) => c.id === selectedCategory)!;
    return (
      <CategoryDetail
        categoryId={selectedCategory}
        title={cat.label}
        onBack={() => setSelectedCategory(null)}
        onGoToScreen={setScreen}
        expenses={expenses}
        shoppingItems={shoppingItems}
        notes={notes}
        habits={habits}
        borrowLendItems={borrowLendItems}
        calendarEvents={calendarEvents}
      />
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Header with back button + search bar */}
      <div className="px-5 pt-2 pb-3">
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setScreen(searchFrom)}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center -ml-1"
            aria-label="Back"
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
          </motion.button>
          <div className="flex-1 relative">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search everything…"
              className="w-full bg-muted rounded-xl pl-9 pr-9 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted-foreground/40 flex items-center justify-center">
                <X size={11} className="text-background" />
              </button>
            )}
          </div>
        </div>
        <p className="text-[20px] font-bold tracking-tight mt-3">Search</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar ios-scroll pb-20">
        {!q.trim() ? (
          <div className="px-5">
            {/* Recent */}
            <div className="flex items-center gap-1.5 mb-2 mt-2">
              <Clock size={12} className="text-muted-foreground" />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Recent</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button key={r} onClick={() => setQ(r)} className="px-3 py-1.5 rounded-full bg-muted text-[13px] font-medium">
                  {r}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 mb-2 mt-6">
              <TrendingUp size={12} className="text-muted-foreground" />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Trending</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {trending.map((r) => (
                <button key={r} onClick={() => setQ(r)} className="px-3 py-1.5 rounded-full border border-border text-[13px] font-medium">
                  {r}
                </button>
              ))}
            </div>

            {/* Categories — now clickable */}
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 mt-6">Categories</p>
            <Card className="p-0 overflow-hidden">
              {categories.map((c, i, arr) => {
                const Icon = c.icon;
                return (
                  <motion.button
                    key={c.id}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 active:bg-muted/50 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Icon size={15} />
                    </div>
                    <span className="flex-1 text-left text-[14px] font-medium">{c.label}</span>
                    <span className="text-[12px] text-muted-foreground tabular-nums">{c.count}</span>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </motion.button>
                );
              })}
            </Card>
          </div>
        ) : (
          <div className="px-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 mt-2">
              {results.length} results for "{q}"
            </p>
            <AnimatePresence mode="popLayout">
              {results.map((r, i) => (
                <motion.div
                  key={r.title + i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <CategoryIcon name={r.icon} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium truncate">{r.title}</p>
                        <p className="text-[12px] text-muted-foreground truncate">{r.sub}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded font-medium">{r.kind}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {results.length === 0 && (
              <EmptyState
                icon={<Inbox size={20} className="text-muted-foreground" />}
                title="No results found"
                description={`Nothing matches "${q}". Try a different search term.`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Category Detail View =====
function CategoryDetail({
  categoryId,
  title,
  onBack,
  onGoToScreen,
  expenses,
  shoppingItems,
  notes,
  habits,
  borrowLendItems,
  calendarEvents,
}: {
  categoryId: CategoryId;
  title: string;
  onBack: () => void;
  onGoToScreen: (s: any) => void;
  expenses: any[];
  shoppingItems: any[];
  notes: any[];
  habits: any[];
  borrowLendItems: any[];
  calendarEvents: any[];
}) {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Header with back button */}
      <div className="px-5 pt-2 pb-3 flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center -ml-1"
          aria-label="Back to search"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </motion.button>
        <div className="flex-1">
          <p className="text-[13px] text-muted-foreground font-medium">Search · Category</p>
          <h1 className="text-[24px] font-bold tracking-tight leading-tight">{title}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar ios-scroll pb-20 px-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={categoryId}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <CategoryContent
              categoryId={categoryId}
              expenses={expenses}
              shoppingItems={shoppingItems}
              notes={notes}
              habits={habits}
              borrowLendItems={borrowLendItems}
              calendarEvents={calendarEvents}
              onGoToScreen={onGoToScreen}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function CategoryContent({
  categoryId,
  expenses,
  shoppingItems,
  notes,
  habits,
  borrowLendItems,
  calendarEvents,
  onGoToScreen,
}: {
  categoryId: CategoryId;
  expenses: any[];
  shoppingItems: any[];
  notes: any[];
  habits: any[];
  borrowLendItems: any[];
  calendarEvents: any[];
  onGoToScreen: (s: any) => void;
}) {
  switch (categoryId) {
    case "expenses":
      if (expenses.length === 0) {
        return <EmptyState title="No expenses yet" description="Tap the + button to add your first expense." />;
      }
      return (
        <Card className="p-0 overflow-hidden">
          {expenses.map((e, i, arr) => (
            <motion.div
              key={e.id}
              whileTap={{ scale: 0.99 }}
              onClick={() => onGoToScreen("expenses")}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${i < arr.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <CategoryIcon name={caticon(e.category)} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium truncate">{e.title}</p>
                <p className="text-[12px] text-muted-foreground truncate">
                  {e.merchant} · {e.date} · {e.time}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-semibold tabular-nums">−{formatINR(e.amount)}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{e.category}</p>
              </div>
            </motion.div>
          ))}
        </Card>
      );

    case "shopping":
      if (shoppingItems.length === 0) {
        return <EmptyState title="No shopping items" description="Add items to your shopping list." />;
      }
      return (
        <Card className="p-0 overflow-hidden">
          {shoppingItems.map((s, i, arr) => (
            <motion.div
              key={s.id}
              whileTap={{ scale: 0.99 }}
              onClick={() => onGoToScreen("shopping")}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${i < arr.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium truncate">{s.name}</p>
                <p className="text-[12px] text-muted-foreground truncate">{s.store} · {s.status}</p>
              </div>
              <p className="text-[15px] font-semibold tabular-nums">{formatINR(s.price)}</p>
            </motion.div>
          ))}
        </Card>
      );

    case "notes":
      if (notes.length === 0) {
        return <EmptyState title="No notes yet" description="Create your first note." />;
      }
      return (
        <div className="grid grid-cols-2 gap-3">
          {notes.map((n) => (
            <motion.div
              key={n.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onGoToScreen("notes")}
              className="bg-card border border-border rounded-2xl p-3.5 cursor-pointer"
            >
              <p className="text-[14px] font-semibold leading-tight line-clamp-2">{n.title}</p>
              <p className="text-[12px] text-muted-foreground mt-1 line-clamp-3 leading-snug">{n.preview}</p>
              <p className="text-[10px] text-muted-foreground mt-2">
                {new Date(n.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            </motion.div>
          ))}
        </div>
      );

    case "habits":
      if (habits.length === 0) {
        return <EmptyState title="No habits yet" description="Add your first habit to start tracking." />;
      }
      return (
        <div className="space-y-3">
          {habits.map((h) => (
            <motion.div
              key={h.id}
              whileTap={{ scale: 0.99 }}
              onClick={() => onGoToScreen("habits")}
              className="bg-card border border-border rounded-2xl p-4 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <CategoryIcon name={h.icon} size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold">{h.name}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {h.done}/{h.goal} {h.unit} · {h.streak}-day streak
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold tabular-nums">
                    {Math.min(100, Math.round((h.done / h.goal) * 100))}%
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      );

    case "tasks":
      const tasks = calendarEvents.filter((e) => e.type === "task");
      if (tasks.length === 0) {
        return <EmptyState title="No tasks" description="Your scheduled tasks will appear here." />;
      }
      return (
        <Card className="p-0 overflow-hidden">
          {tasks.map((t, i, arr) => (
            <motion.div
              key={t.id}
              whileTap={{ scale: 0.99 }}
              onClick={() => onGoToScreen("calendar")}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${i < arr.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium truncate">{t.title}</p>
                <p className="text-[12px] text-muted-foreground">
                  {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </motion.div>
          ))}
        </Card>
      );

    case "receipts":
      const receipts = expenses.filter((e) => e.merchant);
      if (receipts.length === 0) {
        return <EmptyState title="No receipts" description="Receipts from your expenses will appear here." />;
      }
      return (
        <Card className="p-0 overflow-hidden">
          {receipts.map((e, i, arr) => (
            <motion.div
              key={e.id}
              whileTap={{ scale: 0.99 }}
              onClick={() => onGoToScreen("expenses")}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${i < arr.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <Camera size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium truncate">{e.merchant}</p>
                <p className="text-[12px] text-muted-foreground truncate">{e.title} · {e.date}</p>
              </div>
              <p className="text-[14px] font-semibold tabular-nums">{formatINR(e.amount)}</p>
            </motion.div>
          ))}
        </Card>
      );

    case "people":
      if (borrowLendItems.length === 0) {
        return <EmptyState title="No people tracked" description="Money you've lent or borrowed will appear here." />;
      }
      return (
        <Card className="p-0 overflow-hidden">
          {borrowLendItems.map((b, i, arr) => (
            <motion.div
              key={b.id}
              whileTap={{ scale: 0.99 }}
              onClick={() => onGoToScreen("borrow")}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${i < arr.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <span className="text-[15px] font-bold">{b.person[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium truncate">{b.person}</p>
                <p className="text-[12px] text-muted-foreground capitalize">{b.type} · due {new Date(b.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
              </div>
              <p className="text-[14px] font-semibold tabular-nums">{formatINR(b.amount - b.paid)}</p>
            </motion.div>
          ))}
        </Card>
      );

    case "documents":
      const docs = notes.filter((n) => n.hasChecklist || (n.tags && n.tags.length > 0));
      if (docs.length === 0) {
        return <EmptyState title="No documents" description="Notes with checklists or tags will appear here." />;
      }
      return (
        <Card className="p-0 overflow-hidden">
          {docs.map((n, i, arr) => (
            <motion.div
              key={n.id}
              whileTap={{ scale: 0.99 }}
              onClick={() => onGoToScreen("notes")}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${i < arr.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium truncate">{n.title}</p>
                <p className="text-[12px] text-muted-foreground truncate">
                  {n.tags?.join(", ") || "Document"} · {new Date(n.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </motion.div>
          ))}
        </Card>
      );

    default:
      return <EmptyState title="Nothing here yet" />;
  }
}

function caticon(id: string): string {
  const map: Record<string, string> = {
    food: "utensils", fuel: "fuel", rent: "home", emi: "credit-card",
    shopping: "shopping-bag", bills: "receipt", travel: "plane",
    entertainment: "film", healthcare: "heart-pulse", education: "graduation-cap",
    others: "more-horizontal",
  };
  return map[id] ?? "more-horizontal";
}
