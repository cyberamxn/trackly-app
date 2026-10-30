"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, TrendingUp, CheckCircle2, Bell, Target, Plus, Trash2, X, Check,
} from "lucide-react";
import { ScreenHeader, Card, ProgressBar } from "../../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { useOfficeData } from "@/lib/trackly/officeData";
import { useAppData } from "@/lib/trackly/appData";
import { formatINR } from "@/lib/trackly/data";
import { toast } from "sonner";

type AddSheet = "bill" | "goal" | "salary" | null;

export function SalaryFinance() {
  const { setScreen } = useTracklyStore();
  const office = useOfficeData();
  const expenses = useAppData((s) => s.expenses);
  const [addSheet, setAddSheet] = useState<AddSheet>(null);

  // Bill form
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDue, setBillDue] = useState(new Date().toISOString().slice(0, 10));
  const [billCat, setBillCat] = useState<"electric" | "internet" | "phone" | "rent" | "emi" | "other">("other");

  // Goal form
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState(new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10));

  // Salary form
  const [salMonth, setSalMonth] = useState(new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }));
  const [salAmount, setSalAmount] = useState("");
  const [salBonus, setSalBonus] = useState("");
  const [salDeduct, setSalDeduct] = useState("");

  const latestSalary = office.salary[0];
  const pendingSalary = office.salary.find((s) => !s.received);
  const now = new Date();
  const monthStr = now.toISOString().slice(0, 7);
  const monthExpenses = expenses.filter((e) => e.date.startsWith(monthStr));
  const monthSpending = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const unpaidBills = office.bills.filter((b) => !b.paid);
  const totalBills = unpaidBills.reduce((s, b) => s + b.amount, 0);
  const overdueBills = unpaidBills.filter((b) => b.dueDate < new Date().toISOString().slice(0, 10));
  const totalSaved = office.savingsGoals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = office.savingsGoals.reduce((s, g) => s + g.target, 0);

  const handleAddBill = () => {
    if (!billName.trim() || !billAmount) { toast.error("Name and amount required"); return; }
    office.addBill({ name: billName.trim(), amount: parseInt(billAmount), dueDate: billDue, category: billCat, paid: false, recurring: false });
    toast.success("Bill added");
    setBillName(""); setBillAmount(""); setBillCat("other"); setAddSheet(null);
  };

  const handleAddGoal = () => {
    if (!goalTitle.trim() || !goalTarget) { toast.error("Title and target required"); return; }
    office.addSavingsGoal({ title: goalTitle.trim(), target: parseInt(goalTarget), saved: 0, deadline: goalDeadline });
    toast.success("Savings goal added");
    setGoalTitle(""); setGoalTarget(""); setAddSheet(null);
  };

  const handleAddSalary = () => {
    if (!salMonth.trim() || !salAmount) { toast.error("Month and amount required"); return; }
    const amt = parseInt(salAmount);
    const bonus = salBonus ? parseInt(salBonus) : 0;
    const deduct = salDeduct ? parseInt(salDeduct) : 0;
    office.addSalary({ month: salMonth.trim(), amount: amt, bonus, deduction: deduct, netAmount: amt + bonus - deduct, received: false });
    toast.success("Salary entry added");
    setSalAmount(""); setSalBonus(""); setSalDeduct(""); setAddSheet(null);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Salary & Finance"
        subtitle="Track salary, bills & savings"
        onBack={() => setScreen("office-dashboard")}
        right={
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAddSheet("bill")} className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center">
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>
        }
      />

      {/* Salary hero */}
      <div className="px-5 mt-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-foreground text-background p-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-background/15 flex items-center justify-center shrink-0"><Wallet size={22} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">{pendingSalary ? `${pendingSalary.month} — Pending` : latestSalary?.month}</p>
              <p className="text-[28px] font-bold tracking-tight mt-0.5 text-display">{formatINR(pendingSalary?.netAmount ?? latestSalary?.netAmount ?? 0)}</p>
              <p className="text-[12px] opacity-80 mt-0.5">{pendingSalary ? "Expected salary" : "Net salary received"}</p>
            </div>
          </div>
          {pendingSalary && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => { office.toggleSalaryReceived(pendingSalary.id); toast.success("Marked as received"); }} className="w-full h-10 mt-4 rounded-xl bg-background text-foreground font-semibold text-[14px] flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> Mark as Received
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Quick stats */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        <Card><div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium"><TrendingUp size={14} /> This Month Spent</div><p className="text-[20px] font-bold mt-1.5 text-display">{formatINR(monthSpending)}</p><p className="text-[11px] text-muted-foreground mt-0.5">{monthExpenses.length} transactions</p></Card>
        <Card><div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium"><Bell size={14} /> Pending Bills</div><p className="text-[20px] font-bold mt-1.5 text-display">{formatINR(totalBills)}</p><p className="text-[11px] text-muted-foreground mt-0.5">{unpaidBills.length} bills{overdueBills.length > 0 ? ` · ${overdueBills.length} overdue` : ""}</p></Card>
      </div>

      {/* Bills */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[18px] font-bold tracking-tight">Bills & EMIs</h2>
          <button onClick={() => setAddSheet("bill")} className="text-[13px] text-muted-foreground font-medium flex items-center gap-0.5"><Plus size={14} /> Add</button>
        </div>
        <div className="space-y-2">
          {office.bills.map((b) => {
            const isOverdue = !b.paid && b.dueDate < new Date().toISOString().slice(0, 10);
            return (
              <motion.div key={b.id} layout whileTap={{ scale: 0.99 }}>
                <Card className={b.paid ? "opacity-60" : ""}>
                  <div className="flex items-center gap-3">
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => { office.toggleBillPaid(b.id); toast.success(b.paid ? "Marked unpaid" : "Bill paid"); }} className="shrink-0">
                      <CheckCircle2 size={22} className={b.paid ? "text-foreground" : "text-muted-foreground"} />
                    </motion.button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[14px] font-semibold ${b.paid ? "line-through" : ""}`}>{b.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[11px] ${isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>{isOverdue ? "Overdue" : `Due ${new Date(b.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{b.category}</span>
                      </div>
                    </div>
                    <p className="text-[14px] font-bold tabular-nums shrink-0">{formatINR(b.amount)}</p>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => { office.deleteBill(b.id); toast.success("Bill deleted"); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0"><Trash2 size={13} /></motion.button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Savings Goals */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[18px] font-bold tracking-tight">Savings Goals</h2>
          <button onClick={() => setAddSheet("goal")} className="text-[13px] text-muted-foreground font-medium flex items-center gap-0.5"><Plus size={14} /> Add</button>
        </div>
        <div className="space-y-2">
          {office.savingsGoals.map((g) => {
            const pct = Math.round((g.saved / g.target) * 100);
            return (
              <Card key={g.id}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><Target size={16} /></div>
                  <div className="flex-1 min-w-0"><p className="text-[14px] font-semibold truncate">{g.title}</p><p className="text-[11px] text-muted-foreground">{formatINR(g.saved)} / {formatINR(g.target)} · {pct}%</p></div>
                  <p className="text-[11px] text-muted-foreground shrink-0">{new Date(g.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => { office.deleteSavingsGoal(g.id); toast.success("Goal deleted"); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0"><Trash2 size={13} /></motion.button>
                </div>
                <ProgressBar value={pct} className="h-2" />
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { office.addToSavings(g.id, 5000); toast.success(`Added ${formatINR(5000)} to ${g.title}`); }} className="w-full h-8 mt-2 rounded-lg bg-muted text-[12px] font-medium flex items-center justify-center gap-1"><Plus size={12} /> Add ₹5,000</motion.button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Salary History */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[18px] font-bold tracking-tight">Salary History</h2>
          <button onClick={() => setAddSheet("salary")} className="text-[13px] text-muted-foreground font-medium flex items-center gap-0.5"><Plus size={14} /> Add</button>
        </div>
        <div className="space-y-2">
          {office.salary.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><Wallet size={16} /></div>
                <div className="flex-1 min-w-0"><p className="text-[14px] font-semibold">{s.month}</p><p className="text-[11px] text-muted-foreground">Base {formatINR(s.amount)}{s.bonus > 0 && ` · +${formatINR(s.bonus)}`}{s.deduction > 0 && ` · -${formatINR(s.deduction)}`}</p></div>
                <div className="text-right shrink-0"><p className="text-[15px] font-bold tabular-nums">{formatINR(s.netAmount)}</p><p className={`text-[10px] font-medium ${s.received ? "text-foreground" : "text-muted-foreground"}`}>{s.received ? "✓ Received" : "Pending"}</p></div>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => { office.deleteSalary(s.id); toast.success("Salary entry deleted"); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0"><Trash2 size={13} /></motion.button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ===== Add Sheets ===== */}
      <AnimatePresence>
        {addSheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddSheet(null)} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} className="fixed sheet-bottom left-0 right-0 z-50 rounded-t-[32px] bg-background sheet-safe-pb max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
              <div className="px-5 pt-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[20px] font-bold">{addSheet === "bill" ? "Add Bill" : addSheet === "goal" ? "Add Savings Goal" : "Add Salary Entry"}</h2>
                  <button onClick={() => setAddSheet(null)} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><X size={16} /></button>
                </div>

                {addSheet === "bill" && (
                  <div className="space-y-3">
                    <FieldInput label="Bill name" value={billName} onChange={setBillName} placeholder="e.g. Electricity Bill" />
                    <FieldInput label="Amount (₹)" value={billAmount} onChange={setBillAmount} placeholder="e.g. 2400" numeric />
                    <FieldInput label="Due date" value={billDue} onChange={setBillDue} type="date" />
                    <div>
                      <label className="text-[12px] text-muted-foreground font-medium">Category</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(["electric", "internet", "phone", "rent", "emi", "other"] as const).map((c) => (
                          <button key={c} onClick={() => setBillCat(c)} className={`px-3 py-1.5 rounded-full border text-[12px] font-medium capitalize ${billCat === c ? "bg-foreground text-background border-foreground" : "border-border"}`}>{c}</button>
                        ))}
                      </div>
                    </div>
                    <SaveButton onClick={handleAddBill} label="Add Bill" />
                  </div>
                )}

                {addSheet === "goal" && (
                  <div className="space-y-3">
                    <FieldInput label="Goal title" value={goalTitle} onChange={setGoalTitle} placeholder="e.g. New Bike" />
                    <FieldInput label="Target amount (₹)" value={goalTarget} onChange={setGoalTarget} placeholder="e.g. 80000" numeric />
                    <FieldInput label="Deadline" value={goalDeadline} onChange={setGoalDeadline} type="date" />
                    <SaveButton onClick={handleAddGoal} label="Add Goal" />
                  </div>
                )}

                {addSheet === "salary" && (
                  <div className="space-y-3">
                    <FieldInput label="Month" value={salMonth} onChange={setSalMonth} placeholder="e.g. Sep 2026" />
                    <FieldInput label="Base salary (₹)" value={salAmount} onChange={setSalAmount} placeholder="e.g. 85000" numeric />
                    <FieldInput label="Bonus (₹)" value={salBonus} onChange={setSalBonus} placeholder="e.g. 5000" numeric />
                    <FieldInput label="Deduction (₹)" value={salDeduct} onChange={setSalDeduct} placeholder="e.g. 2000" numeric />
                    <SaveButton onClick={handleAddSalary} label="Add Salary" />
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, type = "text", numeric }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; numeric?: boolean }) {
  return (
    <div>
      <label className="text-[12px] text-muted-foreground font-medium">{label}</label>
      <input autoFocus={false} type={numeric ? "text" : type} inputMode={numeric ? "numeric" : undefined} value={value} onChange={(e) => onChange(numeric ? e.target.value.replace(/[^\d]/g, "") : e.target.value)} placeholder={placeholder} className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground" />
    </div>
  );
}

function SaveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick} className="w-full h-[52px] mt-2 rounded-2xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2">
      <Check size={18} /> {label}
    </motion.button>
  );
}
