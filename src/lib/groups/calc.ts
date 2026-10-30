// ===================================================================
// Group Expenses — Split & Settlement Calculation Engine (PURE)
// All amounts are INTEGER minor units (paise/cents). No floats in
// money math. Deterministic rounding: leftover minor units are
// distributed to participants in the given order.
// Used by: /api/groups routes (authoritative), UI previews, unit tests.
// ===================================================================

export type SplitMethod = "equal" | "unequal" | "percentage" | "shares";
export type GroupType = "roommates" | "travel" | "friends" | "household" | "trip" | "other";

export const SPLIT_METHODS: { id: SplitMethod; label: string; hint: string }[] = [
  { id: "equal", label: "Equal", hint: "Divided equally among selected members" },
  { id: "unequal", label: "Unequal", hint: "Set a custom amount per person" },
  { id: "percentage", label: "%", hint: "Set a percentage per person — must total 100%" },
  { id: "shares", label: "Shares", hint: "Weighted shares, e.g. 2 for couple, 1 for single" },
];

export const GROUP_TYPES: { id: GroupType; label: string; icon: string }[] = [
  { id: "roommates", label: "Roommates", icon: "🏠" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "friends", label: "Friends", icon: "🎉" },
  { id: "household", label: "Household", icon: "🧺" },
  { id: "trip", label: "Trip", icon: "🧳" },
  { id: "other", label: "Other", icon: "👥" },
];

export const GROUP_ICONS = ["🏠", "✈️", "🎉", "🧺", "🧳", "👥", "🍛", "🚗", "🏖️", "🏢", "🎓", "💰", "🍕", "🎮", "🛒", "⚡"];

export const GROUP_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "rent", label: "Rent", icon: "🏠" },
  { id: "groceries", label: "Groceries", icon: "🛒" },
  { id: "food", label: "Food", icon: "🍕" },
  { id: "electricity", label: "Electricity", icon: "⚡" },
  { id: "internet", label: "Internet", icon: "🌐" },
  { id: "transport", label: "Transport", icon: "🚕" },
  { id: "fuel", label: "Fuel", icon: "⛽" },
  { id: "hotel", label: "Hotel", icon: "🏨" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "entertainment", label: "Entertainment", icon: "🎬" },
  { id: "other", label: "Other", icon: "📦" },
];

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  INR: { symbol: "₹", label: "Indian Rupee" },
  USD: { symbol: "$", label: "US Dollar" },
  EUR: { symbol: "€", label: "Euro" },
  GBP: { symbol: "£", label: "British Pound" },
};

export function currencySymbol(code: string): string {
  return CURRENCIES[code]?.symbol ?? code + " ";
}

/** Format integer minor units as a display string, e.g. 110000 -> "₹1,100" or "₹1,100.50" */
export function formatMoney(amountPaise: number, currency = "INR"): string {
  const neg = amountPaise < 0;
  const abs = Math.abs(amountPaise);
  const major = Math.floor(abs / 100);
  const minor = abs % 100;
  const majorStr = major.toLocaleString("en-IN");
  const decimals = minor === 0 ? "" : "." + String(minor).padStart(2, "0");
  return `${neg ? "-" : ""}${currencySymbol(currency)}${majorStr}${decimals}`;
}

/** "gets back" / "owes" / "settled up" for a net balance */
export function netLabel(netPaise: number): { text: string; tone: "positive" | "negative" | "settled" } {
  if (netPaise > 0) return { text: "gets back", tone: "positive" };
  if (netPaise < 0) return { text: "owes", tone: "negative" };
  return { text: "settled up", tone: "settled" };
}

// ===================================================================
// SPLITTING
// ===================================================================

/**
 * Equal split with deterministic rounding:
 * base = floor(total/n); the first (total - base*n) participants get +1.
 * Guarantees the parts sum EXACTLY to total.
 */
export function splitEqual(totalPaise: number, userIds: string[]): Map<string, number> {
  const n = userIds.length;
  if (n === 0) throw new Error("No participants");
  if (totalPaise <= 0) throw new Error("Amount must be positive");
  const base = Math.floor(totalPaise / n);
  let remainder = totalPaise - base * n;
  const result = new Map<string, number>();
  for (const uid of userIds) {
    let amount = base;
    if (remainder > 0) {
      amount += 1;
      remainder -= 1;
    }
    result.set(uid, amount);
  }
  return result;
}

/**
 * Share-based split (weights). Largest-remainder distribution so the
 * parts sum EXACTLY to total.
 */
export function splitByShares(
  totalPaise: number,
  entries: { userId: string; shares: number }[]
): Map<string, number> {
  if (entries.length === 0) throw new Error("No participants");
  if (totalPaise <= 0) throw new Error("Amount must be positive");
  const totalShares = entries.reduce((s, e) => s + e.shares, 0);
  if (totalShares <= 0) throw new Error("Total shares must be positive");

  const exact = entries.map((e) => ({
    userId: e.userId,
    floor: Math.floor((totalPaise * e.shares) / totalShares),
    remainder: (totalPaise * e.shares) % totalShares,
  }));
  let leftover = totalPaise - exact.reduce((s, e) => s + e.floor, 0);
  // distribute leftover +1 to largest remainders (stable by original order)
  const order = [...exact].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; leftover > 0; i = (i + 1) % order.length) {
    order[i].floor += 1;
    leftover -= 1;
  }
  const result = new Map<string, number>();
  for (const e of exact) result.set(e.userId, e.floor);
  return result;
}

/** Percentage split — percentages in basis points (100% = 10000). */
export function splitByPercent(
  totalPaise: number,
  entries: { userId: string; percentBps: number }[]
): Map<string, number> {
  const totalBps = entries.reduce((s, e) => s + e.percentBps, 0);
  if (totalBps !== 10000) {
    throw new Error(`Percentages must total 100% (currently ${(totalBps / 100).toFixed(2)}%)`);
  }
  return splitByShares(
    totalPaise,
    entries.map((e) => ({ userId: e.userId, shares: e.percentBps }))
  );
}

/** Validate manually-provided amounts (unequal split): must sum EXACTLY to total. */
export function validateUnequalAmounts(
  totalPaise: number,
  entries: { userId: string; amountPaise: number }[]
): { ok: true; amounts: Map<string, number> } | { ok: false; error: string } {
  if (entries.some((e) => e.amountPaise < 0)) return { ok: false, error: "Shares cannot be negative" };
  const sum = entries.reduce((s, e) => s + e.amountPaise, 0);
  if (sum !== totalPaise) {
    return {
      ok: false,
      error: `Shares total ${formatMoney(sum)} but expense is ${formatMoney(totalPaise)} — difference ${formatMoney(
        totalPaise - sum
      )}`,
    };
  }
  const amounts = new Map(entries.map((e) => [e.userId, e.amountPaise]));
  return { ok: true, amounts };
}

// ===================================================================
// BALANCES
// ===================================================================

export interface ExpenseLike {
  id: string;
  paidBy: string;
  amountPaise: number;
  deletedAt?: string | Date | null;
}

export interface SplitLike {
  expenseId: string;
  userId: string;
  amountPaise: number;
}

export interface SettlementLike {
  fromUserId: string;
  toUserId: string;
  amountPaise: number;
  status: string; // pending | confirmed | rejected
}

export interface MemberStats {
  userId: string;
  paidPaise: number; // total they actually paid out
  sharePaise: number; // total spending responsibility
  expenseCount: number; // expenses they paid for
  confirmedReceivedPaise: number;
  confirmedSentPaise: number;
  pendingSentPaise: number; // awaiting confirmation
  pendingReceivedPaise: number;
  /** net = paid - share + confirmedReceived - confirmedSent. >0 should receive, <0 owes */
  netPaise: number;
  /** net adjusted for pending settlements (what suggestions are based on) */
  adjustedNetPaise: number;
}

/**
 * Compute per-member stats from raw records. THE single source of truth —
 * balances are NEVER taken from the client.
 */
export function computeMemberStats(
  userIds: string[],
  expenses: ExpenseLike[],
  splits: SplitLike[],
  settlements: SettlementLike[]
): Map<string, MemberStats> {
  const stats = new Map<string, MemberStats>();
  const blank = (uid: string): MemberStats => ({
    userId: uid,
    paidPaise: 0,
    sharePaise: 0,
    expenseCount: 0,
    confirmedReceivedPaise: 0,
    confirmedSentPaise: 0,
    pendingSentPaise: 0,
    pendingReceivedPaise: 0,
    netPaise: 0,
    adjustedNetPaise: 0,
  });
  for (const uid of userIds) stats.set(uid, blank(uid));
  const ensure = (uid: string) => {
    if (!stats.has(uid)) stats.set(uid, blank(uid));
    return stats.get(uid)!;
  };

  // Only non-deleted expenses count
  const activeExpenses = expenses.filter((e) => !e.deletedAt);
  const activeExpenseIds = new Set(activeExpenses.map((e) => e.id));

  for (const e of activeExpenses) {
    const s = ensure(e.paidBy);
    s.paidPaise += e.amountPaise;
    s.expenseCount += 1;
  }
  for (const sp of splits) {
    if (!activeExpenseIds.has(sp.expenseId)) continue;
    const s = ensure(sp.userId);
    s.sharePaise += sp.amountPaise;
  }
  for (const st of settlements) {
    if (st.status === "confirmed") {
      ensure(st.fromUserId).confirmedSentPaise += st.amountPaise;
      ensure(st.toUserId).confirmedReceivedPaise += st.amountPaise;
    } else if (st.status === "pending") {
      ensure(st.fromUserId).pendingSentPaise += st.amountPaise;
      ensure(st.toUserId).pendingReceivedPaise += st.amountPaise;
    }
  }

  for (const s of stats.values()) {
    // Receiving a confirmed repayment REDUCES remaining credit (you got paid back);
    // sending one REDUCES your debt. Direction matters!
    s.netPaise = s.paidPaise - s.sharePaise - s.confirmedReceivedPaise + s.confirmedSentPaise;
    // pending settlements, once confirmed, will move the payer's net UP and receiver's net DOWN
    s.adjustedNetPaise = s.netPaise + s.pendingSentPaise - s.pendingReceivedPaise;
  }
  return stats;
}

// ===================================================================
// SETTLEMENT SUGGESTIONS (Who owes whom)
// Greedy max-creditor / max-debtor matching → at most n-1 transfers.
// Based on adjustedNet (pending settlements factored in) so suggestions
// never double-count money already recorded as paid.
// ===================================================================

export interface SettlementSuggestion {
  fromUserId: string;
  toUserId: string;
  amountPaise: number;
}

export function suggestSettlements(netByUser: Map<string, number>): SettlementSuggestion[] {
  const creditors = [...netByUser.entries()].filter(([, n]) => n > 0).map(([id, n]) => ({ id, amount: n }));
  const debtors = [...netByUser.entries()].filter(([, n]) => n < 0).map(([id, n]) => ({ id, amount: -n }));

  const suggestions: SettlementSuggestion[] = [];
  let guard = 0;
  while (creditors.length > 0 && debtors.length > 0 && guard < 1000) {
    guard++;
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    const c = creditors[0];
    const d = debtors[0];
    const amount = Math.min(c.amount, d.amount);
    if (amount <= 0) break;
    suggestions.push({ fromUserId: d.id, toUserId: c.id, amountPaise: amount });
    c.amount -= amount;
    d.amount -= amount;
    if (c.amount === 0) creditors.shift();
    if (d.amount === 0) debtors.shift();
  }
  return suggestions;
}

/** Ledger invariant: sum of all net balances must be exactly 0 (paise). */
export function ledgerBalanced(stats: Map<string, MemberStats>): boolean {
  const sum = [...stats.values()].reduce((s, m) => s + m.netPaise, 0);
  return sum === 0;
}
