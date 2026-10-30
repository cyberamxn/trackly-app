"use client";

// Add/Edit Expense sheet (4 split methods: equal, unequal, percentage,
// shares) + Expense detail sheet. Mirrors server-side validation.

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Check, Trash2, Pencil, ArrowRight, Users } from "lucide-react";
import { useGroupsStore, type GroupDetail, type GroupExpenseDTO } from "@/lib/trackly/groupsStore";
import { GROUP_CATEGORIES, SPLIT_METHODS, formatMoney, splitEqual, splitByShares, splitByPercent, type SplitMethod } from "@/lib/groups/calc";
import { SheetModal, SegmentedControl } from "../../ui";
import { Avatar, memberName, profileName, TapButton, prettyDate } from "./parts";

function rupeesToPaise(input: string): number {
  const n = parseFloat(input.replace(/,/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

export function AddExpenseSheet({
  open,
  onClose,
  detail,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  detail: GroupDetail;
  editing: GroupExpenseDTO | null;
}) {
  const { addExpense, updateExpense } = useGroupsStore();
  const activeMembers = detail.members.filter((m) => m.status === "active");
  const isAdmin = detail.viewer.isAdmin;

  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("food");
  const [paidBy, setPaidBy] = useState(detail.viewer.userId);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({}); // unequal (rupees)
  const [customPercents, setCustomPercents] = useState<Record<string, string>>({}); // percentage
  const [customShares, setCustomShares] = useState<Record<string, number>>({}); // shares
  const [saving, setSaving] = useState(false);

  // (Re)set form on open
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setAmountStr((editing.amountPaise / 100).toString());
      setCategory(editing.category);
      setPaidBy(editing.paidBy);
      setExpenseDate(editing.expenseDate);
      setNotes(editing.notes || "");
      setParticipants(editing.splits.map((s) => s.userId));
      setSplitMethod(editing.splitMethod as SplitMethod);
      const amounts: Record<string, string> = {};
      const percents: Record<string, string> = {};
      const shares: Record<string, number> = {};
      for (const s of editing.splits) {
        amounts[s.userId] = (s.amountPaise / 100).toString();
        percents[s.userId] = ((s.amountPaise / editing.amountPaise) * 100).toFixed(1);
        shares[s.userId] = s.shares;
      }
      setCustomAmounts(amounts);
      setCustomPercents(percents);
      setCustomShares(shares);
    } else {
      setTitle("");
      setAmountStr("");
      setCategory("food");
      setPaidBy(detail.viewer.userId);
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setParticipants(activeMembers.map((m) => m.userId));
      setSplitMethod("equal");
      setCustomAmounts({});
      setCustomPercents({});
      setCustomShares({});
    }
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const amountPaise = rupeesToPaise(amountStr);
  const amountValid = Number.isFinite(amountPaise) && amountPaise > 0;

  const toggleParticipant = (uid: string) =>
    setParticipants((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));

  // ---- live split preview (client mirror of the server engine) ----
  const preview = useMemo(() => {
    if (!amountValid || participants.length === 0) return null;
    try {
      if (splitMethod === "equal") return splitEqual(amountPaise, participants);
      if (splitMethod === "shares") {
        const entries = participants.map((uid) => ({ userId: uid, shares: Math.max(1, Math.round(customShares[uid] ?? 1)) }));
        return splitByShares(amountPaise, entries);
      }
      if (splitMethod === "percentage") {
        const entries = participants.map((uid) => ({ userId: uid, percentBps: Math.round((parseFloat(customPercents[uid] || "0") || 0) * 100) }));
        return splitByPercent(amountPaise, entries);
      }
      // unequal — build map from raw inputs (may not sum correctly yet)
      const map = new Map<string, number>();
      for (const uid of participants) {
        const p = rupeesToPaise(customAmounts[uid] || "");
        if (Number.isFinite(p)) map.set(uid, p);
      }
      return map;
    } catch {
      return null;
    }
  }, [amountPaise, amountValid, participants, splitMethod, customAmounts, customPercents, customShares]);

  const previewSum = preview ? [...preview.values()].reduce((s, v) => s + v, 0) : 0;
  const splitComplete =
    preview !== null &&
    preview.size === participants.length &&
    previewSum === amountPaise &&
    (splitMethod !== "percentage" || participants.every((uid) => Number.isFinite(parseFloat(customPercents[uid] || "0"))));

  const submit = async () => {
    // Title is OPTIONAL — empty title falls back to the category label
    // on the server (e.g. "Food"), so nothing to enforce here.
    if (!amountValid) return toast.error("Enter a valid amount");
    if (participants.length === 0) return toast.error("Select at least one member to split with");
    if (!splitComplete) {
      if (splitMethod === "percentage") return toast.error("Percentages must total exactly 100%");
      if (splitMethod === "unequal") return toast.error("Individual amounts must total the expense amount");
      return toast.error("Split amounts don't add up");
    }

    // Build the payload (server re-validates everything)
    const payloadParticipants =
      splitMethod === "equal"
        ? participants.map((userId) => ({ userId }))
        : splitMethod === "shares"
          ? participants.map((userId) => ({ userId, shares: Math.max(1, Math.round(customShares[userId] ?? 1)) }))
          : splitMethod === "percentage"
            ? participants.map((userId) => ({ userId, percentBps: Math.round((parseFloat(customPercents[userId] || "0") || 0) * 100) }))
            : participants.map((userId) => ({ userId, amountPaise: rupeesToPaise(customAmounts[userId] || "0") }));

    setSaving(true);
    const input = {
      title: title.trim(),
      amountPaise,
      category,
      paidBy,
      expenseDate,
      notes: notes.trim(),
      splitMethod,
      participants: payloadParticipants,
    };
    const res = editing ? await updateExpense(detail.group.id, editing.id, input) : await addExpense(detail.group.id, input);
    setSaving(false);
    if (res.ok) {
      toast.success(editing ? "Expense updated" : "Expense added");
      onClose();
    } else {
      toast.error(res.error ?? "Failed");
    }
  };

  const paidByOptions = isAdmin ? activeMembers : activeMembers.filter((m) => m.userId === detail.viewer.userId);

  return (
    <SheetModal open={open} onClose={onClose} title={editing ? "Edit Expense" : "Add Expense"}>
      <div className="space-y-4 pb-4">
        {/* title + amount */}
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What was it for? (optional)"
            maxLength={100}
            className="flex-1 h-12 rounded-xl bg-muted px-4 text-[15px] font-medium outline-none focus:ring-2 ring-foreground/20 placeholder:text-muted-foreground/60"
          />
          <div className="h-12 rounded-xl bg-muted px-3 flex items-center gap-1 w-[130px]">
            <span className="text-[15px] text-muted-foreground font-semibold">
              {formatMoney(0, detail.group.currency).replace("0", "")}
            </span>
            <input
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              inputMode="decimal"
              className="w-full bg-transparent text-[15px] font-bold outline-none tabular-nums placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* category */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {GROUP_CATEGORIES.map((c) => (
            <TapButton
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`shrink-0 px-3 py-2 rounded-xl text-[13px] font-medium border flex items-center gap-1.5 ${
                category === c.id ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              <span>{c.icon}</span> {c.label}
            </TapButton>
          ))}
        </div>

        {/* paid by + date */}
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Paid by</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {paidByOptions.map((m) => (
                <TapButton
                  key={m.userId}
                  onClick={() => setPaidBy(m.userId)}
                  className={`shrink-0 h-9 px-3 rounded-full text-[13px] font-medium border flex items-center gap-1.5 ${
                    paidBy === m.userId ? "border-foreground bg-foreground text-background" : "border-border"
                  }`}
                >
                  <Avatar name={memberName(m)} url={m.avatarUrl} size={18} /> {memberName(m)}
                </TapButton>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Date</p>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="h-10 rounded-xl bg-muted px-3 text-[14px] outline-none"
          />
        </div>

        {/* participants */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Split among ({participants.length}/{activeMembers.length})
          </p>
          <div className="rounded-2xl border border-border overflow-hidden">
            {activeMembers.map((m, i) => {
              const on = participants.includes(m.userId);
              return (
                <TapButton
                  key={m.userId}
                  onClick={() => toggleParticipant(m.userId)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 ${i < activeMembers.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className={`h-5 w-5 rounded-md border flex items-center justify-center ${on ? "bg-foreground border-foreground" : "border-muted-foreground/40"}`}>
                    {on && <Check size={13} className="text-background" strokeWidth={3} />}
                  </div>
                  <Avatar name={memberName(m)} url={m.avatarUrl} size={26} />
                  <span className="text-[14px] font-medium flex-1 text-left truncate">{memberName(m)}</span>
                  {preview && on && (
                    <span className="text-[13px] text-muted-foreground tabular-nums">{formatMoney(preview.get(m.userId) ?? 0, detail.group.currency)}</span>
                  )}
                </TapButton>
              );
            })}
          </div>
        </div>

        {/* split method */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Split method</p>
          <SegmentedControl
            options={SPLIT_METHODS.map((m) => ({ label: m.label, value: m.id }))}
            value={splitMethod}
            onChange={(m) => setSplitMethod(m)}
            className="w-full"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">{SPLIT_METHODS.find((m) => m.id === splitMethod)?.hint}</p>
        </div>

        {/* per-person inputs for non-equal methods */}
        {(splitMethod === "unequal" || splitMethod === "percentage" || splitMethod === "shares") && (
          <div className="space-y-2">
            {participants.length === 0 && <p className="text-[13px] text-muted-foreground">Select participants above first.</p>}
            {participants.map((uid) => {
              const m = activeMembers.find((x) => x.userId === uid);
              if (!m) return null;
              return (
                <div key={uid} className="flex items-center gap-3">
                  <Avatar name={memberName(m)} url={m.avatarUrl} size={30} />
                  <span className="flex-1 text-[14px] font-medium truncate">{memberName(m)}</span>
                  {splitMethod === "unequal" && (
                    <input
                      value={customAmounts[uid] ?? ""}
                      onChange={(e) => setCustomAmounts((p) => ({ ...p, [uid]: e.target.value.replace(/[^0-9.]/g, "") }))}
                      placeholder="0"
                      inputMode="decimal"
                      className="h-9 w-24 rounded-xl bg-muted px-3 text-[14px] font-semibold outline-none text-right tabular-nums"
                    />
                  )}
                  {splitMethod === "percentage" && (
                    <div className="h-9 w-24 rounded-xl bg-muted px-3 flex items-center">
                      <input
                        value={customPercents[uid] ?? ""}
                        onChange={(e) => setCustomPercents((p) => ({ ...p, [uid]: e.target.value.replace(/[^0-9.]/g, "") }))}
                        placeholder="0"
                        inputMode="decimal"
                        className="w-full bg-transparent text-[14px] font-semibold outline-none text-right tabular-nums"
                      />
                      <span className="text-[13px] text-muted-foreground ml-1">%</span>
                    </div>
                  )}
                  {splitMethod === "shares" && (
                    <div className="flex items-center gap-1.5">
                      <TapButton
                        className="h-8 w-8 rounded-lg bg-muted text-[18px] font-bold flex items-center justify-center"
                        onClick={() => setCustomShares((p) => ({ ...p, [uid]: Math.max(1, (p[uid] ?? 1) - 1) }))}
                      >
                        −
                      </TapButton>
                      <span className="w-6 text-center text-[14px] font-bold tabular-nums">{customShares[uid] ?? 1}</span>
                      <TapButton
                        className="h-8 w-8 rounded-lg bg-muted text-[18px] font-bold flex items-center justify-center"
                        onClick={() => setCustomShares((p) => ({ ...p, [uid]: Math.min(50, (p[uid] ?? 1) + 1) }))}
                      >
                        +
                      </TapButton>
                    </div>
                  )}
                </div>
              );
            })}
            {/* total indicator */}
            <div
              className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-[13px] font-semibold ${
                splitComplete ? "bg-green-600/10 text-green-700" : "bg-muted text-muted-foreground"
              }`}
            >
              <span>
                {splitMethod === "percentage"
                  ? `Total: ${(participants.reduce((s, uid) => s + (parseFloat(customPercents[uid] || "0") || 0), 0)).toFixed(1)}% (need 100%)`
                  : `Total: ${formatMoney(previewSum, detail.group.currency)}`}
              </span>
              <span className="flex items-center gap-1">
                {splitComplete ? <Check size={14} /> : null}
                {splitComplete ? "matches" : `expense ${formatMoney(amountPaise || 0, detail.group.currency)}`}
              </span>
            </div>
          </div>
        )}

        {/* notes */}
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          maxLength={500}
          className="w-full h-11 rounded-xl bg-muted px-4 text-[14px] outline-none focus:ring-2 ring-foreground/20 placeholder:text-muted-foreground/60"
        />

        <TapButton
          onClick={submit}
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-foreground text-background text-[15px] font-semibold flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} {editing ? "Save changes" : "Add expense"}
        </TapButton>
      </div>
    </SheetModal>
  );
}

// ===================================================================
// Expense detail sheet
// ===================================================================
export function ExpenseDetailSheet({
  expense,
  detail,
  onClose,
  onEdit,
}: {
  expense: GroupExpenseDTO | null;
  detail: GroupDetail;
  onClose: () => void;
  onEdit: (e: GroupExpenseDTO) => void;
}) {
  const { deleteExpense } = useGroupsStore();
  if (!expense) return null;

  const cat = GROUP_CATEGORIES.find((c) => c.id === expense.category);
  const payer = detail.members.find((m) => m.userId === expense.paidBy);
  const canModify = expense.createdBy === detail.viewer.userId || detail.viewer.isAdmin;

  return (
    <SheetModal open={!!expense} onClose={onClose} title="Expense Details">
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-[26px]">{cat?.icon ?? "📦"}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[20px] font-bold leading-tight">{expense.title}</p>
            <p className="text-[13px] text-muted-foreground">
              {prettyDate(expense.expenseDate)} · {cat?.label ?? expense.category}
            </p>
          </div>
          <p className="text-[24px] font-bold tabular-nums">{formatMoney(expense.amountPaise, detail.group.currency)}</p>
        </div>

        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Users size={15} className="text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground flex-1">Paid by</span>
            <span className="text-[14px] font-semibold">{payer ? memberName(payer) : "Member"}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <ArrowRight size={15} className="text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground flex-1">Split</span>
            <span className="text-[14px] font-semibold">
              {SPLIT_METHODS.find((m) => m.id === expense.splitMethod)?.label ?? expense.splitMethod}
            </span>
          </div>
          {expense.notes && (
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[12px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Notes</p>
              <p className="text-[14px]">{expense.notes}</p>
            </div>
          )}
          <div className="px-4 py-3">
            <p className="text-[12px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">Each person's share</p>
            <div className="space-y-2">
              {expense.splits.map((s) => {
                const m = detail.members.find((x) => x.userId === s.userId);
                return (
                  <div key={s.userId} className="flex items-center gap-2.5">
                    <Avatar name={m ? memberName(m) : "?"} url={m?.avatarUrl} size={26} />
                    <span className="flex-1 text-[14px] font-medium truncate">{m ? memberName(m) : "Former member"}</span>
                    {expense.splitMethod === "shares" && (
                      <span className="text-[12px] text-muted-foreground">({s.shares} {s.shares === 1 ? "share" : "shares"})</span>
                    )}
                    <span className="text-[14px] font-semibold tabular-nums">{formatMoney(s.amountPaise, detail.group.currency)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {canModify && !detail.group.archived && (
          <div className="flex gap-2">
            <TapButton
              className="flex-1 h-11 rounded-xl bg-muted text-[14px] font-semibold flex items-center justify-center gap-2"
              onClick={() => onEdit(expense)}
            >
              <Pencil size={15} /> Edit
            </TapButton>
            <TapButton
              className="flex-1 h-11 rounded-xl border border-red-500/40 text-red-500 text-[14px] font-semibold flex items-center justify-center gap-2"
              onClick={async () => {
                if (!window.confirm(`Delete "${expense.title}"? This affects everyone's balances.`)) return;
                const res = await deleteExpense(detail.group.id, expense.id);
                if (res.ok) {
                  toast.success("Expense deleted");
                  onClose();
                } else toast.error(res.error ?? "Failed");
              }}
            >
              <Trash2 size={15} /> Delete
            </TapButton>
          </div>
        )}
      </div>
    </SheetModal>
  );
}
