// ===================================================================
// Groups — expense input validation (shared by add + edit routes)
// Splits are ALWAYS recomputed/validated server-side.
// ===================================================================

import { db } from "@/lib/db";
import {
  GROUP_CATEGORIES,
  splitEqual,
  splitByShares,
  splitByPercent,
  validateUnequalAmounts,
  type SplitMethod,
} from "./calc";

export const MAX_AMOUNT_PAISE = 10_000_000_000; // ₹10 crore in minor units
const VALID_METHODS: SplitMethod[] = ["equal", "unequal", "percentage", "shares"];

export interface ParticipantInput {
  userId: string;
  amountPaise?: number; // unequal
  percentBps?: number; // percentage (10000 = 100%)
  shares?: number; // share-based (default 1)
}

export interface ExpenseInputResult {
  ok: true;
  data: {
    title: string;
    amountPaise: number;
    category: string;
    paidBy: string;
    expenseDate: string;
    notes: string;
    splitMethod: SplitMethod;
    splitRows: { userId: string; amountPaise: number; shares: number }[];
  };
}
export type ExpenseInputError = { ok: false; error: string; status: number };

function parseDate(s: unknown): string | null {
  const str = String(s ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(str + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  if (d.getUTCFullYear() < 2000 || d.getUTCFullYear() > 2100) return null;
  return str;
}

/**
 * Validate + normalize an expense payload against a group.
 * Checks: shapes, amount bounds, active-member participants, payer rules
 * (members record own payments; admin may record anyone's), split math.
 */
export async function validateExpenseInput(
  groupId: string,
  callerId: string,
  callerIsAdmin: boolean,
  body: any
): Promise<ExpenseInputResult | ExpenseInputError> {
  const title = String(body.title ?? "").trim();
  const amountPaise = Math.round(Number(body.amountPaise));
  const category = GROUP_CATEGORIES.some((c) => c.id === body.category) ? body.category : "other";
  const paidBy = String(body.paidBy ?? callerId);
  const expenseDate = parseDate(body.expenseDate) ?? new Date().toISOString().slice(0, 10);
  const notes = String(body.notes ?? "").slice(0, 500);
  if (!VALID_METHODS.includes(body.splitMethod)) {
    return { ok: false, error: "Invalid split method — use equal, unequal, percentage or shares", status: 400 };
  }
  const splitMethod: SplitMethod = body.splitMethod;
  const participants: ParticipantInput[] = Array.isArray(body.participants) ? body.participants : [];

  // Title is OPTIONAL — when left empty, fall back to the category label
  // (e.g. "Food") so lists & activity feed still read naturally.
  const categoryLabel =
    GROUP_CATEGORIES.find((c) => c.id === category)?.label ?? "Expense";
  const finalTitle = title.length > 0 ? title : categoryLabel;
  if (finalTitle.length > 100) {
    return { ok: false, error: "Expense title must be at most 100 characters", status: 400 };
  }
  if (!Number.isFinite(amountPaise) || amountPaise <= 0 || amountPaise > MAX_AMOUNT_PAISE) {
    return { ok: false, error: "Invalid amount", status: 400 };
  }
  if (participants.length === 0) {
    return { ok: false, error: "Select at least one member to split with", status: 400 };
  }

  // Payer must be an active member; non-admins can only record what THEY paid
  const payer = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: paidBy } },
  });
  if (!payer || payer.status !== "active") {
    return { ok: false, error: "The payer must be an active member", status: 400 };
  }
  if (paidBy !== callerId && !callerIsAdmin) {
    return { ok: false, error: "Only the admin can record expenses paid by someone else", status: 403 };
  }

  // Participants must be active members, no duplicates
  const activeMemberIds = new Set(
    (await db.groupMember.findMany({ where: { groupId, status: "active" }, select: { userId: true } })).map((m) => m.userId)
  );
  const participantIds = participants.map((p) => String(p.userId));
  if (new Set(participantIds).size !== participantIds.length) {
    return { ok: false, error: "Duplicate participants", status: 400 };
  }
  for (const pid of participantIds) {
    if (!activeMemberIds.has(pid)) {
      return { ok: false, error: "All participants must be active members", status: 400 };
    }
  }

  // ---- compute/validate splits ----
  let splitRows: { userId: string; amountPaise: number; shares: number }[] = [];
  if (splitMethod === "equal") {
    const amounts = splitEqual(amountPaise, participantIds);
    splitRows = participantIds.map((uid) => ({ userId: uid, amountPaise: amounts.get(uid)!, shares: 1 }));
  } else if (splitMethod === "shares") {
    const entries = participants.map((p) => ({
      userId: String(p.userId),
      shares: Math.max(1, Math.round(Number(p.shares ?? 1))),
    }));
    const totalShares = entries.reduce((s, e) => s + e.shares, 0);
    if (totalShares < 1 || totalShares > 1000) return { ok: false, error: "Invalid share counts", status: 400 };
    const amounts = splitByShares(amountPaise, entries);
    splitRows = entries.map((e) => ({ userId: e.userId, amountPaise: amounts.get(e.userId)!, shares: e.shares }));
  } else if (splitMethod === "percentage") {
    const entries = participants.map((p) => {
      const bps = Math.round(Number(p.percentBps ?? 0));
      if (!Number.isFinite(bps) || bps < 0 || bps > 10000) {
        throw Object.assign(new Error("Percentages must be between 0 and 100"), { status: 400 });
      }
      return { userId: String(p.userId), percentBps: bps };
    });
    let amounts;
    try {
      amounts = splitByPercent(amountPaise, entries);
    } catch (e: any) {
      return { ok: false, error: e.message, status: 400 };
    }
    splitRows = entries.map((e) => ({ userId: e.userId, amountPaise: amounts.get(e.userId)!, shares: 1 }));
  } else {
    const entries = participants.map((p) => ({
      userId: String(p.userId),
      amountPaise: Math.round(Number(p.amountPaise ?? 0)),
    }));
    const result = validateUnequalAmounts(amountPaise, entries);
    if (!result.ok) return { ok: false, error: result.error, status: 400 };
    splitRows = entries.map((e) => ({ userId: e.userId, amountPaise: e.amountPaise, shares: 1 }));
  }

  // Ledger invariant: splits sum EXACTLY to the total
  const splitSum = splitRows.reduce((s, r) => s + r.amountPaise, 0);
  if (splitSum !== amountPaise) {
    return { ok: false, error: "Split validation failed — amounts do not total the expense", status: 400 };
  }

  return {
    ok: true,
    data: { title: finalTitle, amountPaise, category, paidBy, expenseDate, notes, splitMethod, splitRows },
  };
}
