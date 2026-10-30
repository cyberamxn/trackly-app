"use client";

// Group Dashboard — shell with tabs (Overview / Settle / Members / Activity),
// summary cards, expense timeline, settings sheet. Settle & Members live in
// their own files; expense add/edit/detail sheets live in ExpenseSheets.tsx.

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft, Settings2, Plus, Loader2, Archive, ArchiveRestore, Trash2,
  LogOut, Check, X, Crown, Users, Wallet, ArrowRightLeft, Pencil,
} from "lucide-react";
import { useTracklyStore } from "@/lib/trackly/store";
import { useGroupsStore, type GroupDetail, type GroupExpenseDTO } from "@/lib/trackly/groupsStore";
import { GROUP_TYPES, GROUP_CATEGORIES, formatMoney, CURRENCIES } from "@/lib/groups/calc";
import { ScreenWrapper, Card, SheetModal, EmptyState, SegmentedControl, Chip } from "../../ui";
import { Avatar, memberName, profileName, activityIcon, relativeTime, prettyDate, groupExpensesByDate, TapButton, NetAmount } from "./parts";
import { AddExpenseSheet, ExpenseDetailSheet } from "./ExpenseSheets";
import { GroupMembersTab } from "./GroupMembers";
import { GroupSettleTab } from "./GroupSettle";

type Tab = "overview" | "settle" | "members" | "activity";

export function GroupDashboard() {
  const { currentGroupId, setScreen } = useTracklyStore();
  const {
    details, detailLoading, loadGroup,
    archiveGroup, deleteGroup, leaveGroup, editGroup,
  } = useGroupsStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [showSettings, setShowSettings] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<GroupExpenseDTO | null>(null);
  const [detailExpense, setDetailExpense] = useState<GroupExpenseDTO | null>(null);

  useEffect(() => {
    if (currentGroupId) loadGroup(currentGroupId);
  }, [currentGroupId, loadGroup]);

  // Light polling — keeps members/expenses/balances fresh when other
  // members act (joins, adds expenses, settles) while the screen is open.
  useEffect(() => {
    if (!currentGroupId) return;
    const interval = setInterval(() => {
      useGroupsStore.getState().loadGroup(currentGroupId);
    }, 20000);
    return () => clearInterval(interval);
  }, [currentGroupId]);

  // Group vanished (deleted / removed) → back to hub
  useEffect(() => {
    if (!currentGroupId) setScreen("groups");
  }, [currentGroupId, setScreen]);

  const detail: GroupDetail | undefined = currentGroupId ? details[currentGroupId] : undefined;
  const loading = currentGroupId ? detailLoading[currentGroupId] : false;

  if (!detail) {
    return (
      <ScreenWrapper>
        <div className="flex items-center justify-center h-full">
          {loading ? (
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          ) : (
            <EmptyState
              icon={<Users size={22} />}
              title="Group not available"
              description="You may have been removed, or the group was deleted."
              action={
                <TapButton
                  className="h-10 px-5 rounded-xl bg-foreground text-background text-[14px] font-semibold"
                  onClick={() => setScreen("groups")}
                >
                  Back to Groups
                </TapButton>
              }
            />
          )}
        </div>
      </ScreenWrapper>
    );
  }

  const { group, viewer, members, stats } = detail;
  const activeMembers = members.filter((m) => m.status === "active");
  const myStats = stats[viewer.userId];
  const visibleExpenses = detail.expenses.filter((e) => !e.deletedAt);
  const isAdmin = viewer.isAdmin;

  return (
    <ScreenWrapper>
      {/* ===== Header ===== */}
      <div className="px-5 pt-2 pb-2 flex items-center justify-between min-h-[28px]">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setScreen("groups")} className="flex items-center text-foreground -ml-1">
          <ChevronLeft size={28} strokeWidth={2.2} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(true)} className="p-1 text-foreground">
          <Settings2 size={22} />
        </motion.button>
      </div>

      <div className="px-5">
        <div className="flex items-center gap-3">
          <div className="text-[38px] leading-none">{group.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[26px] font-bold tracking-tight leading-tight truncate">{group.name}</h1>
              {group.archived && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded-full font-bold shrink-0">
                  Archived
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {GROUP_TYPES.find((t) => t.id === group.type)?.label ?? "Group"} · {activeMembers.length}{" "}
              {activeMembers.length === 1 ? "member" : "members"}
              {isAdmin ? " · You're admin" : ""}
            </p>
          </div>
        </div>
        {group.description && <p className="text-[13px] text-muted-foreground mt-2">{group.description}</p>}
      </div>

      {/* ===== Tabs ===== */}
      <div className="px-5 mt-4">
        <SegmentedControl
          options={[
            { label: "Overview", value: "overview" },
            { label: "Settle", value: "settle" },
            { label: "Members", value: "members" },
            { label: "Activity", value: "activity" },
          ]}
          value={tab}
          onChange={(t) => setTab(t)}
          className="w-full"
        />
      </div>

      {/* ===== Tab content ===== */}
      {tab === "overview" && (
        <OverviewTab
          detail={detail}
          onAdd={() => setAddOpen(true)}
          onOpenExpense={(e) => setDetailExpense(e)}
          onOpenSettle={() => setTab("settle")}
        />
      )}
      {tab === "settle" && <GroupSettleTab detail={detail} />}
      {tab === "members" && <GroupMembersTab detail={detail} />}
      {tab === "activity" && <ActivityTab detail={detail} />}

      {/* ===== Expense add sheet ===== */}
      <AddExpenseSheet
        key={editExpense?.id ?? (addOpen ? "add" : "closed")}
        open={addOpen || !!editExpense}
        detail={detail}
        editing={editExpense}
        onClose={() => {
          setAddOpen(false);
          setEditExpense(null);
        }}
      />

      {/* ===== Expense detail sheet ===== */}
      <ExpenseDetailSheet
        expense={detailExpense}
        detail={detail}
        onClose={() => setDetailExpense(null)}
        onEdit={(e) => {
          setDetailExpense(null);
          setTimeout(() => setEditExpense(e), 150);
        }}
      />

      {/* ===== Settings sheet ===== */}
      <SettingsSheet
        open={showSettings}
        detail={detail}
        onClose={() => setShowSettings(false)}
        onArchive={async () => {
          const res = await archiveGroup(group.id, !group.archived);
          if (res.ok) toast.success(group.archived ? "Group reopened" : "Group archived");
          else toast.error(res.error ?? "Failed");
        }}
        onDelete={async () => {
          const typed = window.prompt(`This PERMANENTLY deletes "${group.name}" and all its expenses.\nType DELETE to confirm:`);
          if (typed !== "DELETE") return;
          const res = await deleteGroup(group.id);
          if (res.ok) {
            toast.success("Group deleted");
            setScreen("groups");
          } else toast.error(res.error ?? "Failed");
        }}
        onLeave={async () => {
          const myNet = myStats?.netPaise ?? 0;
          const warn =
            myNet !== 0
              ? `\n\nYour balance is ${formatMoney(myNet, group.currency)} (${myNet > 0 ? "to receive" : "to pay"}). Leaving keeps your history — settle via the Settle tab first if needed.`
              : "";
          if (!window.confirm(`Leave "${group.name}"?${warn}`)) return;
          const res = await leaveGroup(group.id);
          if (res.ok) {
            toast.success("You left the group");
            setScreen("groups");
          } else toast.error(res.error ?? "Failed");
        }}
        onEdit={async (input) => {
          const res = await editGroup(group.id, input);
          if (res.ok) toast.success("Group updated");
          else toast.error(res.error ?? "Failed");
          return res.ok;
        }}
      />
    </ScreenWrapper>
  );
}

// ===================================================================
// Overview — summary cards + filters + expense timeline
// ===================================================================
function OverviewTab({
  detail,
  onAdd,
  onOpenExpense,
  onOpenSettle,
}: {
  detail: GroupDetail;
  onAdd: () => void;
  onOpenExpense: (e: GroupExpenseDTO) => void;
  onOpenSettle: () => void;
}) {
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { group, viewer, stats, members } = detail;
  const activeMembers = members.filter((m) => m.status === "active");
  const myStats = stats[viewer.userId];
  const totalSpent = detail.expenses.filter((e) => !e.deletedAt).reduce((s, e) => s + e.amountPaise, 0);

  const filtered = useMemo(
    () =>
      detail.expenses.filter((e) => {
        if (e.deletedAt) return false;
        if (memberFilter !== "all" && e.paidBy !== memberFilter) return false;
        if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
        return true;
      }),
    [detail.expenses, memberFilter, categoryFilter]
  );

  const byDate = groupExpensesByDate(filtered);
  const usedCategories = [...new Set(detail.expenses.filter((e) => !e.deletedAt).map((e) => e.category))];

  return (
    <div className="px-5 mt-4 space-y-4">
      {/* summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border border-border">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Total group spend</p>
          <p className="text-[22px] font-bold tabular-nums mt-1">{formatMoney(totalSpent, group.currency)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {detail.expenses.filter((e) => !e.deletedAt).length} expenses
          </p>
        </Card>
        <Card className="border border-border">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">You paid</p>
          <p className="text-[22px] font-bold tabular-nums mt-1">{formatMoney(myStats?.paidPaise ?? 0, group.currency)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">your contribution</p>
        </Card>
        <Card className="border border-border">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Your share</p>
          <p className="text-[22px] font-bold tabular-nums mt-1">{formatMoney(myStats?.sharePaise ?? 0, group.currency)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">your responsibility</p>
        </Card>
        <Card className="border border-border">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Your balance</p>
          <div className="mt-1">
            <NetAmount netPaise={myStats?.netPaise ?? 0} currency={group.currency} className="!text-[22px] font-bold leading-tight block" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {(myStats?.netPaise ?? 0) > 0 ? "you get back" : (myStats?.netPaise ?? 0) < 0 ? "you owe" : "all settled"}
          </p>
        </Card>
      </div>

      {/* settle-up banner — multi-member "who pays whom" shortcut */}
      {detail.suggestions.length > 0 && (
        <TapButton
          onClick={onOpenSettle}
          className="w-full rounded-2xl border border-foreground/20 bg-muted/60 !p-3.5 flex items-center gap-3 text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-foreground/10 flex items-center justify-center shrink-0">
            <ArrowRightLeft size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14.5px] font-semibold leading-tight">
              {detail.suggestions.length} transfer{detail.suggestions.length === 1 ? "" : "s"} will settle all dues
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {formatMoney(
                detail.suggestions.reduce((s, x) => s + x.amountPaise, 0),
                group.currency
              )}{" "}
              to move — see who pays whom →
            </p>
          </div>
        </TapButton>
      )}

      {/* add expense */}
      <TapButton
        onClick={onAdd}
        disabled={group.archived}
        className={`w-full h-12 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 ${
          group.archived ? "bg-muted text-muted-foreground" : "bg-foreground text-background"
        }`}
      >
        <Plus size={18} /> {group.archived ? "Group archived — reopen to add" : "Add Expense"}
      </TapButton>

      {/* filters */}
      {detail.expenses.filter((e) => !e.deletedAt).length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            <Chip label="Everyone" active={memberFilter === "all"} onClick={() => setMemberFilter("all")} />
            {activeMembers.map((m) => (
              <Chip key={m.userId} label={memberName(m)} active={memberFilter === m.userId} onClick={() => setMemberFilter(m.userId)} />
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            <Chip label="All categories" active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} />
            {usedCategories.map((c) => (
              <Chip
                key={c}
                label={`${GROUP_CATEGORIES.find((x) => x.id === c)?.icon ?? ""} ${GROUP_CATEGORIES.find((x) => x.id === c)?.label ?? c}`}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
              />
            ))}
          </div>
        </div>
      )}

      {/* expense timeline */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wallet size={22} />}
          title={detail.expenses.filter((e) => !e.deletedAt).length === 0 ? "No expenses yet" : "Nothing matches these filters"}
          description={
            detail.expenses.filter((e) => !e.deletedAt).length === 0
              ? "Add the first shared expense — rent, groceries, dinner — and Trackly handles the math."
              : "Try clearing the filters above."
          }
        />
      ) : (
        [...byDate.entries()].map(([date, expenses]) => (
          <div key={date}>
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{prettyDate(date)}</p>
            {expenses.map((e) => {
              const payer = members.find((m) => m.userId === e.paidBy);
              const cat = GROUP_CATEGORIES.find((c) => c.id === e.category);
              return (
                <Card key={e.id} onClick={() => onOpenExpense(e)} className="mb-2 border border-border !p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-[18px] shrink-0">
                      {cat?.icon ?? "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold truncate">{e.title}</p>
                      <p className="text-[12px] text-muted-foreground truncate">
                        {payer ? memberName(payer) : "Member"} paid ·{" "}
                        {e.splitMethod === "equal" ? "split equally" : e.splitMethod === "unequal" ? "custom split" : e.splitMethod === "percentage" ? "by percentage" : "by shares"} ·{" "}
                        {e.splits.length} {e.splits.length === 1 ? "person" : "people"}
                      </p>
                    </div>
                    <p className="text-[15px] font-bold tabular-nums shrink-0">{formatMoney(e.amountPaise, group.currency)}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        ))
      )}
      <div className="h-10" />
    </div>
  );
}

// ===================================================================
// Activity feed
// ===================================================================
function ActivityTab({ detail }: { detail: GroupDetail }) {
  if (detail.activities.length === 0) {
    return (
      <div className="px-5 mt-6">
        <EmptyState icon={<ArrowRightLeft size={22} />} title="No activity yet" description="Group activity will show up here." />
      </div>
    );
  }
  return (
    <div className="px-5 mt-4">
      <Card className="border border-border !p-0 overflow-hidden">
        {detail.activities.map((a, i) => (
          <div key={a.id} className={`flex items-start gap-3 px-4 py-3 ${i < detail.activities.length - 1 ? "border-b border-border" : ""}`}>
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">{activityIcon(a.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] leading-snug">{a.text}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{relativeTime(a.createdAt)}</p>
            </div>
          </div>
        ))}
      </Card>
      <div className="h-10" />
    </div>
  );
}

// ===================================================================
// Settings sheet — edit, archive, leave, delete
// ===================================================================
function SettingsSheet({
  open,
  detail,
  onClose,
  onArchive,
  onDelete,
  onLeave,
  onEdit,
}: {
  open: boolean;
  detail: GroupDetail;
  onClose: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onLeave: () => void;
  onEdit: (input: { name: string; icon: string; type: string; description: string; currency: string }) => Promise<boolean | void>;
}) {
  const { group, viewer } = detail;
  const isAdmin = viewer.isAdmin;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [icon, setIcon] = useState(group.icon);
  const [type, setType] = useState(group.type);
  const [currency, setCurrency] = useState(group.currency);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEditing(false);
      setName(group.name);
      setDescription(group.description);
      setIcon(group.icon);
      setType(group.type);
      setCurrency(group.currency);
    }
  }, [open, group]);

  const hasExpenses = detail.expenses.length > 0;

  return (
    <SheetModal open={open} onClose={onClose} title="Group Settings">
      <div className="space-y-4 pb-4">
        {!isAdmin ? (
          <p className="text-[13px] text-muted-foreground">You're a member — only the group admin can change group settings.</p>
        ) : !editing ? (
          <TapButton
            className="w-full h-11 rounded-xl bg-muted text-[14px] font-semibold flex items-center justify-center gap-2"
            onClick={() => setEditing(true)}
          >
            <Pencil size={15} /> Edit group info
          </TapButton>
        ) : (
          <div className="space-y-3 rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="text-[30px] leading-none h-11 w-11 rounded-2xl bg-muted flex items-center justify-center shrink-0">{icon}</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="flex-1 h-11 rounded-xl bg-muted px-3 text-[15px] font-medium outline-none focus:ring-2 ring-foreground/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["🏠", "✈️", "🎉", "🧺", "🧳", "👥", "🍛", "🚗", "🏖️", "🏢", "🎓", "💰"].map((ic) => (
                <TapButton
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`h-9 w-9 rounded-xl text-[18px] flex items-center justify-center border ${icon === ic ? "border-foreground bg-muted" : "border-border"}`}
                >
                  {ic}
                </TapButton>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {GROUP_TYPES.map((t) => (
                <TapButton
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-[13px] font-medium border ${type === t.id ? "border-foreground bg-foreground text-background" : "border-border"}`}
                >
                  {t.icon} {t.label}
                </TapButton>
              ))}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Description"
              className="w-full rounded-xl bg-muted px-3 py-2.5 text-[14px] outline-none focus:ring-2 ring-foreground/20 resize-none"
            />
            <div>
              <p className="text-[12px] text-muted-foreground mb-1.5">
                Currency {hasExpenses ? "(locked — expenses exist)" : ""}
              </p>
              <SegmentedControl
                options={Object.entries(CURRENCIES).map(([code, c]) => ({ label: `${c.symbol} ${code}`, value: code }))}
                value={currency}
                onChange={setCurrency}
              />
            </div>
            <div className="flex gap-2">
              <TapButton className="flex-1 h-10 rounded-xl bg-muted text-[14px] font-semibold" onClick={() => setEditing(false)}>
                Cancel
              </TapButton>
              <TapButton
                className="flex-1 h-10 rounded-xl bg-foreground text-background text-[14px] font-semibold flex items-center justify-center gap-1.5"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  const ok = await onEdit({ name: name.trim(), icon, type, description: description.trim(), currency });
                  setSaving(false);
                  if (ok) setEditing(false);
                }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save
              </TapButton>
            </div>
          </div>
        )}

        {/* Admin-only lifecycle */}
        {isAdmin && (
          <TapButton
            className="w-full h-11 rounded-xl bg-muted text-[14px] font-semibold flex items-center justify-center gap-2"
            onClick={onArchive}
          >
            {group.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
            {group.archived ? "Reopen group" : "Archive group"}
          </TapButton>
        )}

        {/* Leave */}
        <TapButton
          className="w-full h-11 rounded-xl bg-muted text-[14px] font-semibold flex items-center justify-center gap-2"
          onClick={onLeave}
        >
          <LogOut size={15} /> Leave group
        </TapButton>

        {/* Danger zone */}
        {isAdmin && (
          <TapButton
            className="w-full h-11 rounded-xl border border-red-500/40 text-red-500 text-[14px] font-semibold flex items-center justify-center gap-2"
            onClick={onDelete}
          >
            <Trash2 size={15} /> Delete group
          </TapButton>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Deleting a group permanently removes its expenses, splits and repayments. Archiving keeps everything but blocks new
          expenses. Leaving keeps your history — balances can still be settled.
        </p>
      </div>
    </SheetModal>
  );
}
