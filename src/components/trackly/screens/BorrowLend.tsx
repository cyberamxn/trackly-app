"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ArrowUpRight, ArrowDownLeft, Bell, MoreHorizontal, X, Check,
  Banknote, Smartphone, Trash2, ChevronLeft, CheckCircle2, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData } from "@/lib/trackly/appData";
import { useTrashStore } from "@/lib/trackly/trash";
import { Card, ScreenHeader, ProgressBar, SegmentedControl, SheetModal, EmptyState } from "../ui";
import { formatINR } from "@/lib/trackly/data";
import { useState } from "react";

export function BorrowLend() {
  const { setScreen } = useTracklyStore();
  const [tab, setTab] = useState<"all" | "lent" | "borrowed">("all");
  const items = useAppData((s) => s.borrowLend);
  const recordPayment = useAppData((s) => s.recordBorrowPayment);
  const addBorrowLend = useAppData((s) => s.addBorrowLend);
  const deleteBorrowLend = useAppData((s) => s.deleteBorrowLend);
  const addToTrash = useTrashStore((s) => s.addToTrash);
  const settleBorrowLend = useAppData((s) => s.settleBorrowLend);

  // Add modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"borrowed" | "lent">("lent");
  const [addName, setAddName] = useState("");

  // Action sheet state (for the three-dot button)
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
  const [addDueDate, setAddDueDate] = useState("");
  const [addReason, setAddReason] = useState("");
  const [addMethod, setAddMethod] = useState<"cash" | "online">("cash");

  const lent = items.filter((b) => b.type === "lent");
  const borrowed = items.filter((b) => b.type === "borrowed");
  const totalLent = lent.reduce((s, b) => s + (b.amount - b.paid), 0);
  const totalBorrowed = borrowed.reduce((s, b) => s + (b.amount - b.paid), 0);
  const net = totalLent - totalBorrowed;

  const filtered = tab === "all" ? items : items.filter((b) => b.type === tab);

  const handleAdd = () => {
    if (!addName.trim()) {
      toast.error("Name is required");
      return;
    }
    const amount = parseInt(addAmount.replace(/,/g, "")) || 0;
    if (amount <= 0) {
      toast.error("Valid amount required");
      return;
    }
    addBorrowLend({
      person: addName.trim(),
      type: addType,
      amount,
      paid: 0,
      dueDate: addDueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      reason: addReason.trim() || undefined,
      paymentMethod: addMethod,
      date: addDate,
    });
    toast.success(addType === "lent" ? `₹${amount} lent to ${addName}` : `₹${amount} borrowed from ${addName}`);
    // Reset form
    setAddName("");
    setAddAmount("");
    setAddReason("");
    setAddDueDate("");
    setAddMethod("cash");
    setAddDate(new Date().toISOString().slice(0, 10));
    setShowAdd(false);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Borrow & Lend"
        subtitle="Track money given & received"
        onBack={() => setScreen("dashboard")}
        right={
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(true)} className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center">
            <Plus size={18} />
          </motion.button>
        }
      />

      {/* Net balance hero */}
      <div className="px-5 mt-1">
        <Card className="bg-foreground text-background">
          <p className="text-[13px] opacity-70 font-medium">Net Balance</p>
          <p className="text-[36px] font-bold mt-1 text-display">
            {net >= 0 ? "+" : "−"}{formatINR(Math.abs(net))}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="flex items-center gap-1 text-[11px] opacity-70 font-medium">
                <ArrowUpRight size={11} />
                YOU LENT
              </div>
              <p className="text-[18px] font-semibold mt-1 tabular-nums">{formatINR(totalLent)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] opacity-70 font-medium">
                <ArrowDownLeft size={11} />
                YOU OWE
              </div>
              <p className="text-[18px] font-semibold mt-1 tabular-nums">{formatINR(totalBorrowed)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-5 mt-4">
        <SegmentedControl
          options={[
            { label: "All", value: "all" },
            { label: "Lent", value: "lent" },
            { label: "Borrowed", value: "borrowed" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="px-5 mt-4 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ArrowUpRight size={20} className="text-muted-foreground" />}
            title="No entries"
            description="Tap the + button to add a borrow or lend entry."
          />
        ) : (
          filtered.map((b) => {
            const remaining = b.amount - b.paid;
            const pct = b.amount > 0 ? (b.paid / b.amount) * 100 : 0;
            const daysLeft = Math.ceil((new Date(b.dueDate).getTime() - Date.now()) / 86400000);
            const isLent = b.type === "lent";
            return (
              <motion.div key={b.id} whileTap={{ scale: 0.985 }}>
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-[15px] font-bold">{b.person[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold truncate">{b.person}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {isLent ? "You lent" : "You borrowed"} · Due {new Date(b.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-bold tabular-nums">{formatINR(remaining)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Due today" : `${Math.abs(daysLeft)}d overdue`}
                      </p>
                    </div>
                  </div>

                  {/* Reason + Payment method + Date */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {b.reason && (
                      <span className="text-[11px] bg-muted px-2 py-0.5 rounded-md font-medium">
                        📝 {b.reason}
                      </span>
                    )}
                    {b.paymentMethod && (
                      <span className="text-[11px] bg-muted px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                        {b.paymentMethod === "cash" ? <Banknote size={10} /> : <Smartphone size={10} />}
                        {b.paymentMethod === "cash" ? "Cash" : "Online"}
                      </span>
                    )}
                    {b.date && (
                      <span className="text-[11px] bg-muted px-2 py-0.5 rounded-md font-medium">
                        📅 {new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>

                  <ProgressBar value={pct} className="mt-3 h-1.5" />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatINR(b.paid)} of {formatINR(b.amount)} {isLent ? "received" : "paid"}
                  </p>

                  {b.note && <p className="text-[12px] text-muted-foreground mt-2 italic">"{b.note}"</p>}

                  <div className="flex items-center gap-2 mt-3">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { recordPayment(b.id); toast.success("Payment recorded"); }} className="flex-1 h-9 rounded-xl bg-foreground text-background text-[13px] font-semibold">
                      {isLent ? "Record payment" : "Mark paid"}
                    </motion.button>
                    <button onClick={() => toast.info("Reminder sent")} className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center" aria-label="Remind">
                      <Bell size={15} />
                    </button>
                    <button
                      onClick={() => setActionTarget(b.id)}
                      className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center"
                      aria-label="More options"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ===== Add Borrow/Lend Modal ===== */}
      <SheetModal open={showAdd} onClose={() => setShowAdd(false)} title="Add Entry">
        <div className="space-y-4">
          {/* Type selector — Udhar Lene / Dene */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setAddType("lent")}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 ${addType === "lent" ? "border-foreground bg-muted" : "border-border"}`}
            >
              <ArrowUpRight size={20} />
              <span className="text-[13px] font-semibold">उधार दिया</span>
              <span className="text-[10px] text-muted-foreground">Lent to someone</span>
            </button>
            <button
              onClick={() => setAddType("borrowed")}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 ${addType === "borrowed" ? "border-foreground bg-muted" : "border-border"}`}
            >
              <ArrowDownLeft size={20} />
              <span className="text-[13px] font-semibold">उधार लिया</span>
              <span className="text-[10px] text-muted-foreground">Borrowed from someone</span>
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Name</label>
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder={addType === "lent" ? "Who did you lend to?" : "Who did you borrow from?"}
              className="w-full h-11 px-3 rounded-xl bg-muted text-[15px] outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Amount (₹)</label>
            <input
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              inputMode="numeric"
              className="w-full h-11 px-3 rounded-xl bg-muted text-[15px] outline-none focus:ring-2 focus:ring-foreground/20 tabular-nums"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Reason</label>
            <input
              value={addReason}
              onChange={(e) => setAddReason(e.target.value)}
              placeholder="e.g. Shopping, Emergency, Trip..."
              className="w-full h-11 px-3 rounded-xl bg-muted text-[15px] outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAddMethod("cash")}
                className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-[14px] font-medium ${addMethod === "cash" ? "border-foreground bg-muted" : "border-border"}`}
              >
                <Banknote size={16} />
                Cash
              </button>
              <button
                onClick={() => setAddMethod("online")}
                className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-[14px] font-medium ${addMethod === "online" ? "border-foreground bg-muted" : "border-border"}`}
              >
                <Smartphone size={16} />
                Online
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Date</label>
            <input
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              type="date"
              className="w-full h-11 px-3 rounded-xl bg-muted text-[15px] outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Due Date (optional)</label>
            <input
              value={addDueDate}
              onChange={(e) => setAddDueDate(e.target.value)}
              type="date"
              className="w-full h-11 px-3 rounded-xl bg-muted text-[15px] outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {/* Save */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAdd}
            className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-[15px] flex items-center justify-center gap-2"
          >
            <Check size={18} />
            {addType === "lent" ? "Add Lent Entry" : "Add Borrowed Entry"}
          </motion.button>
        </div>
      </SheetModal>

      {/* ===== Action Sheet (three-dot menu) ===== */}
      <SheetModal
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title="Entry Options"
      >
        {(() => {
          const b = items.find((x) => x.id === actionTarget);
          if (!b) return null;
          const isFullySettled = b.paid >= b.amount;
          return (
            <div className="space-y-2">
              {/* Entry summary */}
              <div className="rounded-2xl bg-muted p-4 mb-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold truncate">{b.person}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {b.type === "lent" ? "You lent" : "You borrowed"} · {b.note ?? "No note"}
                    </p>
                  </div>
                  <p className="text-[16px] font-bold tabular-nums shrink-0">{formatINR(b.amount)}</p>
                </div>
                <div className="mt-2">
                  <ProgressBar value={(b.paid / b.amount) * 100} />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatINR(b.paid)} of {formatINR(b.amount)} {b.type === "lent" ? "received" : "paid"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {!isFullySettled && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    recordPayment(b.id);
                    toast.success("Payment recorded");
                    setActionTarget(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 active:bg-muted"
                >
                  <div className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
                    <Banknote size={16} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[14px] font-semibold">Record Payment</p>
                    <p className="text-[12px] text-muted-foreground">Mark a partial payment received</p>
                  </div>
                </motion.button>
              )}

              {!isFullySettled && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    settleBorrowLend(b.id);
                    toast.success("Marked as fully settled");
                    setActionTarget(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 active:bg-muted"
                >
                  <div className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[14px] font-semibold">Mark as Settled</p>
                    <p className="text-[12px] text-muted-foreground">Settle the full amount at once</p>
                  </div>
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  toast.info("Reminder sent");
                  setActionTarget(null);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 active:bg-muted"
              >
                <div className="h-9 w-9 rounded-xl bg-muted-foreground/20 flex items-center justify-center shrink-0">
                  <Bell size={16} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-semibold">Send Reminder</p>
                  <p className="text-[12px] text-muted-foreground">Notify {b.person} about pending amount</p>
                </div>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  // Soft delete — entry moves to the Deleted Items folder (counted, restorable)
                  const full = items.find((x) => x.id === b.id) ?? b;
                  addToTrash({
                    type: "borrow",
                    title: full.person,
                    subtitle: `${full.type} · ${formatINR(full.amount)}`,
                    data: full,
                  });
                  deleteBorrowLend(b.id);
                  toast.success("Entry moved to Deleted Items");
                  setActionTarget(null);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 active:bg-red-100 dark:active:bg-red-950/50"
              >
                <div className="h-9 w-9 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0">
                  <Trash2 size={16} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">Delete Entry</p>
                  <p className="text-[12px] text-muted-foreground">Remove this entry permanently</p>
                </div>
              </motion.button>

              {isFullySettled && (
                <div className="rounded-xl bg-muted/50 p-3 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <CheckCircle2 size={14} />
                  This entry is fully settled.
                </div>
              )}
            </div>
          );
        })()}
      </SheetModal>
    </div>
  );
}
