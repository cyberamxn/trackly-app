"use client";

// Shared building blocks for the Groups screens (design-system aligned)

import { motion } from "framer-motion";
import {
  Plus, UserPlus, UserMinus, Check, X, Pencil, Trash2, Home, Zap, ArrowRightLeft,
  Crown, LogOut, Archive, ArchiveRestore, Send, RotateCcw, Ban, Settings2, Wallet,
} from "lucide-react";
import type { GroupActivityDTO, GroupMemberDTO } from "@/lib/trackly/groupsStore";
import { formatMoney } from "@/lib/groups/calc";

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const letter = (name || "?").charAt(0).toUpperCase();
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full bg-muted flex items-center justify-center font-semibold text-foreground shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {letter}
    </div>
  );
}

/** Best display name for a member row */
export function memberName(m: GroupMemberDTO): string {
  return m.fullName || m.username || (m.email ? m.email.split("@")[0] : "Member");
}

export function profileName(p: { username: string | null; fullName: string | null; email: string | null } | undefined): string {
  if (!p) return "Member";
  return p.fullName || p.username || (p.email ? p.email.split("@")[0] : "Member");
}

export function RoleChip({ role }: { role: string }) {
  if (role !== "admin") return null;
  return (
    <span className="text-[9px] uppercase tracking-wider bg-foreground text-background px-1.5 py-0.5 rounded-full font-bold">
      Admin
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-muted text-muted-foreground",
    removed: "bg-muted text-muted-foreground line-through",
    left: "bg-muted text-muted-foreground",
    pending: "bg-foreground/10 text-foreground border border-foreground/20",
    accepted: "bg-muted text-muted-foreground",
    declined: "bg-muted text-muted-foreground",
    cancelled: "bg-muted text-muted-foreground",
    confirmed: "bg-foreground text-background",
    rejected: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold ${map[status] ?? map.pending}`}>
      {status}
    </span>
  );
}

/** Balance indicator: green = gets back, red = owes, gray = settled */
export function NetAmount({ netPaise, currency, className = "" }: { netPaise: number; currency: string; className?: string }) {
  if (netPaise === 0) {
    return <span className={`text-[13px] text-muted-foreground ${className}`}>Settled up</span>;
  }
  const positive = netPaise > 0;
  return (
    <span className={`text-[13px] font-semibold tabular-nums ${positive ? "text-green-600" : "text-red-500"} ${className}`}>
      {positive ? "+" : ""}
      {formatMoney(netPaise, currency)}
    </span>
  );
}

export function activityIcon(type: string) {
  switch (type) {
    case "group_created": return <Home size={14} />;
    case "member_joined": return <UserPlus size={14} />;
    case "member_left": return <LogOut size={14} />;
    case "member_removed": return <UserMinus size={14} />;
    case "invited": return <Send size={14} />;
    case "invite_declined": return <X size={14} />;
    case "invite_cancelled": return <Ban size={14} />;
    case "expense_added": return <Plus size={14} />;
    case "expense_updated": return <Pencil size={14} />;
    case "expense_deleted": return <Trash2 size={14} />;
    case "settlement_recorded": return <ArrowRightLeft size={14} />;
    case "settlement_confirmed": return <Check size={14} />;
    case "settlement_rejected": return <X size={14} />;
    case "admin_transferred": return <Crown size={14} />;
    case "group_edited": return <Settings2 size={14} />;
    case "group_archived": return <Archive size={14} />;
    case "group_reopened": return <ArchiveRestore size={14} />;
    default: return <Zap size={14} />;
  }
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function prettyDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

/** Expense list rows grouped by date */
export function groupExpensesByDate<T extends { expenseDate: string }>(expenses: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const e of expenses) {
    const arr = map.get(e.expenseDate) ?? [];
    arr.push(e);
    map.set(e.expenseDate, arr);
  }
  return map;
}

export function TapButton({
  children,
  onClick,
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </motion.button>
  );
}

export { Wallet };
