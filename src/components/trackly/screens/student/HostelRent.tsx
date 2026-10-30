"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Plus, Zap, Wifi, Droplets, Shirt, Receipt, Trash2, Pencil,
  CheckCircle2, Circle, AlertCircle, Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useStudentData, type HostelBill } from "@/lib/trackly/studentData";
import { formatINR } from "@/lib/trackly/data";
import {
  ScreenHeader, ScreenWrapper, Card, SheetModal, EmptyState, Chip,
} from "../../ui";

const BILL_TYPES: HostelBill["type"][] = [
  "rent", "electricity", "wifi", "water", "laundry", "deposit", "other",
];

const TYPE_META: Record<HostelBill["type"], { label: string; icon: typeof Home }> = {
  rent: { label: "Rent", icon: Home },
  electricity: { label: "Electricity", icon: Zap },
  wifi: { label: "Wi-Fi", icon: Wifi },
  water: { label: "Water", icon: Droplets },
  laundry: { label: "Laundry", icon: Shirt },
  deposit: { label: "Deposit", icon: Receipt },
  other: { label: "Other", icon: Receipt },
};

type Filter = "all" | HostelBill["type"];

export function HostelRent() {
  const { setScreen } = useTracklyStore();
  const student = useStudentData();
  const [filter, setFilter] = useState<Filter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editingBill, setEditingBill] = useState<HostelBill | null>(null);

  const totalDue = student.hostelBills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
  const totalPaid = student.hostelBills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);

  const unpaidBills = useMemo(
    () => student.hostelBills
      .filter((b) => !b.paid && (filter === "all" || b.type === filter))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [student.hostelBills, filter]
  );

  const paidBills = useMemo(
    () => student.hostelBills
      .filter((b) => b.paid && (filter === "all" || b.type === filter))
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [student.hostelBills, filter]
  );

  const nextDue = unpaidBills[0];
  const nextDueDays = nextDue
    ? Math.ceil((new Date(nextDue.dueDate).getTime() - Date.now()) / 86400000)
    : 0;

  const handleTogglePaid = (b: HostelBill) => {
    if (b.paid) {
      student.updateHostelBill(b.id, { paid: false, paidDate: undefined });
      toast.success("Marked as unpaid");
    } else {
      student.updateHostelBill(b.id, {
        paid: true,
        paidDate: new Date().toISOString().slice(0, 10),
      });
      toast.success("Payment recorded");
    }
  };

  const handleSave = (data: Omit<HostelBill, "id">) => {
    if (editingBill) {
      student.updateHostelBill(editingBill.id, data);
      toast.success("Bill updated");
    } else {
      student.addHostelBill(data);
      toast.success("Bill added");
    }
    setShowAdd(false);
    setEditingBill(null);
  };

  const handleDelete = (id: string) => {
    student.deleteHostelBill(id);
    toast.success("Bill deleted");
    setShowAdd(false);
    setEditingBill(null);
  };

  return (
    <ScreenWrapper>
      <ScreenHeader
        title="Hostel & Rent"
        subtitle="Track bills and recurring payments"
        onBack={() => setScreen("student-dashboard")}
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setEditingBill(null); setShowAdd(true); }}
            className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"
            aria-label="Add bill"
          >
            <Plus size={18} />
          </motion.button>
        }
      />

      {/* Summary cards */}
      <div className="px-5 grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="bg-foreground text-background h-full">
            <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Total Due</p>
            <p className="text-[26px] font-bold tracking-tight mt-1 text-display">{formatINR(totalDue)}</p>
            <p className="text-[11px] opacity-70 mt-0.5">{unpaidBills.length} unpaid bill{unpaidBills.length !== 1 ? "s" : ""}</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
          <Card className="h-full">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Paid</p>
            <p className="text-[26px] font-bold tracking-tight mt-1 text-display">{formatINR(totalPaid)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{paidBills.length} settled</p>
          </Card>
        </motion.div>
      </div>

      {/* Next due */}
      {nextDue && (
        <div className="px-5 mt-3">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <Card className="border-2 border-foreground">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-foreground text-background flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Next due</p>
                  <p className="text-[16px] font-semibold truncate">{nextDue.label}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {new Date(nextDue.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {nextDueDays <= 0 ? "Due today" : `${nextDueDays}d left`}
                  </p>
                </div>
                <p className="text-[17px] font-bold tabular-nums">{formatINR(nextDue.amount)}</p>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Filter */}
      <div className="px-5 mt-5">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          <Chip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
          {BILL_TYPES.map((t) => (
            <Chip
              key={t}
              label={TYPE_META[t].label}
              active={filter === t}
              onClick={() => setFilter(t)}
            />
          ))}
        </div>
      </div>

      {/* Unpaid bills */}
      <div className="px-5 mt-5 pb-32">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[18px] font-bold tracking-tight">Unpaid</h2>
          <span className="text-[12px] text-muted-foreground tabular-nums">{unpaidBills.length} bills</span>
        </div>

        {unpaidBills.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CheckCircle2 size={20} className="text-muted-foreground" />}
              title="All bills paid"
              description="You're all caught up. No pending bills."
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {unpaidBills.map((b) => (
              <BillRow
                key={b.id}
                bill={b}
                onTogglePaid={() => handleTogglePaid(b)}
                onEdit={() => { setEditingBill(b); setShowAdd(true); }}
              />
            ))}
          </div>
        )}

        {/* Paid bills */}
        {paidBills.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-2.5 mt-7">
              <h2 className="text-[18px] font-bold tracking-tight text-muted-foreground">Paid</h2>
              <span className="text-[12px] text-muted-foreground tabular-nums">{paidBills.length} bills</span>
            </div>
            <div className="space-y-2.5">
              {paidBills.map((b) => (
                <BillRow
                  key={b.id}
                  bill={b}
                  onTogglePaid={() => handleTogglePaid(b)}
                  onEdit={() => { setEditingBill(b); setShowAdd(true); }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit sheet */}
      <AnimatePresence>
        {showAdd && (
          <BillFormSheet
            bill={editingBill}
            onClose={() => { setShowAdd(false); setEditingBill(null); }}
            onSave={handleSave}
            onDelete={editingBill ? () => handleDelete(editingBill.id) : undefined}
          />
        )}
      </AnimatePresence>
    </ScreenWrapper>
  );
}

function BillRow({
  bill,
  onTogglePaid,
  onEdit,
}: {
  bill: HostelBill;
  onTogglePaid: () => void;
  onEdit: () => void;
}) {
  const Meta = TYPE_META[bill.type];
  const days = Math.ceil((new Date(bill.dueDate).getTime() - Date.now()) / 86400000);
  const urgent = !bill.paid && days <= 3;

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={bill.paid ? "opacity-60" : ""}>
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onTogglePaid}
            className="shrink-0"
            aria-label={bill.paid ? "Mark unpaid" : "Mark paid"}
          >
            {bill.paid ? (
              <CheckCircle2 size={26} className="text-foreground" />
            ) : (
              <Circle size={26} className="text-muted-foreground" />
            )}
          </motion.button>
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Meta.icon size={18} />
          </div>
          <div className="flex-1 min-w-0" onClick={onEdit}>
            <div className="flex items-center gap-1.5">
              <p className={`text-[15px] font-semibold truncate ${bill.paid ? "line-through" : ""}`}>{bill.label}</p>
              {bill.recurring && <Repeat size={11} className="text-muted-foreground shrink-0" />}
            </div>
            <p className="text-[12px] text-muted-foreground">
              {Meta.label}
              {!bill.paid && (
                <> · {days < 0 ? "Overdue" : days === 0 ? "Due today" : `${days}d left`}</>
              )}
              {bill.paid && bill.paidDate && (
                <> · Paid {new Date(bill.paidDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</>
              )}
            </p>
          </div>
          <div className="text-right shrink-0" onClick={onEdit}>
            <p className={`text-[15px] font-bold tabular-nums ${urgent ? "text-foreground" : ""}`}>{formatINR(bill.amount)}</p>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="text-[11px] text-muted-foreground mt-0.5"
            >
              Edit
            </motion.button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function BillFormSheet({
  bill,
  onClose,
  onSave,
  onDelete,
}: {
  bill: HostelBill | null;
  onClose: () => void;
  onSave: (data: Omit<HostelBill, "id">) => void;
  onDelete?: () => void;
}) {
  const [type, setType] = useState<HostelBill["type"]>(bill?.type ?? "rent");
  const [label, setLabel] = useState<string>(bill?.label ?? "");
  const [amount, setAmount] = useState<string>(bill ? String(bill.amount) : "");
  const [dueDate, setDueDate] = useState<string>(
    bill?.dueDate ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [recurring, setRecurring] = useState<boolean>(bill?.recurring ?? true);

  const valid = label.trim().length > 0 && parseFloat(amount) > 0;

  const submit = () => {
    if (!valid) {
      toast.error("Please enter a label and amount");
      return;
    }
    onSave({
      type,
      label: label.trim(),
      amount: Math.round(parseFloat(amount)),
      dueDate,
      recurring,
      paid: bill?.paid ?? false,
      paidDate: bill?.paidDate,
    });
  };

  return (
    <SheetModal open onClose={onClose} title={bill ? "Edit Bill" : "Add Bill"}>
      <div className="space-y-4">
        <Field label="Type">
          <div className="flex gap-1.5 flex-wrap">
            {BILL_TYPES.map((t) => (
              <Chip
                key={t}
                label={TYPE_META[t].label}
                active={type === t}
                onClick={() => setType(t)}
              />
            ))}
          </div>
        </Field>

        <Field label="Label">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Hostel Room Rent"
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </Field>

        <Field label="Amount (₹)">
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground tabular-nums"
          />
        </Field>

        <Field label="Due date">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none"
          />
        </Field>

        <div className="flex items-center justify-between p-3.5 bg-muted rounded-xl">
          <div>
            <p className="text-[14px] font-medium">Recurring monthly</p>
            <p className="text-[12px] text-muted-foreground">Auto-remind each month</p>
          </div>
          <button
            onClick={() => setRecurring(!recurring)}
            className={`relative h-7 w-12 rounded-full transition-colors shrink-0 ${recurring ? "bg-foreground" : "bg-muted-foreground/30"}`}
          >
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow-sm ${recurring ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          {onDelete && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onDelete}
              className="h-12 px-4 rounded-2xl border border-border flex items-center justify-center gap-2 text-[14px] font-semibold"
            >
              <Trash2 size={16} />
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={submit}
            className={`flex-1 h-12 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 ${
              valid ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            {bill ? "Save changes" : "Add bill"}
          </motion.button>
        </div>
      </div>
    </SheetModal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{label}</p>
      {children}
    </div>
  );
}
