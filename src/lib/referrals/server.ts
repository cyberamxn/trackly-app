// ===================================================================
// Referral system — SERVER helpers (API routes only, never client).
// Invite & Earn: referrer +5 AI msgs/day per COMPLETED referral
// (cap +30), referee +10 on signup day + +5 on completion day.
// Storage: Prisma ReferralCode + Referral (prod = Supabase Postgres,
// bootstrapped by ensureReferralTables() — same pattern as AiUsage).
// ===================================================================

import { createHash } from "crypto";
import { db } from "@/lib/db";

// ===== Reward / anti-fraud constants (tunable without code changes via env) =====
export const REF_BONUS_PER = Math.max(0, parseInt(process.env.REF_BONUS_PER || "", 10) || 5); // referrer: +msgs per completed referral
export const REF_BONUS_CAP = Math.max(0, parseInt(process.env.REF_BONUS_CAP || "", 10) || 30); // referrer bonus cap/day (30→60 total)
export const REFEREE_WELCOME_BONUS = Math.max(0, parseInt(process.env.REFEREE_WELCOME_BONUS || "", 10) || 10); // referee signup day
export const REFEREE_COMPLETE_BONUS = Math.max(0, parseInt(process.env.REFEREE_COMPLETE_BONUS || "", 10) || 5); // referee completion day
export const REF_DEVICE_CAP = Math.max(1, parseInt(process.env.REF_DEVICE_CAP || "", 10) || 2); // max referees per device (family leniency = 2)
export const REF_IP_CAP = Math.max(1, parseInt(process.env.REF_IP_CAP || "", 10) || 10); // max referees per IP / 7d (CGNAT-safe, high)
export const REF_CLAIM_WINDOW_HOURS = Math.max(1, parseInt(process.env.REF_CLAIM_WINDOW_HOURS || "", 10) || 48); // claim only for fresh accounts
export const REF_COMPLETION_AI_THRESHOLD = 3; // 3+ AI messages = real usage (counts as activity)
export const REF_CODE_TTL_DAYS = 30; // client-side stored ref code validity

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://trackly.today";

// ===== Usage-day key — MUST stay byte-identical with the AI route =====
// (04:00 IST boundary: now shifted -4h, then the IST calendar date)
const AI_RESET_HOUR_IST = 4;
const _IST_FMT_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
});
export function usageDayKey(now = new Date()): string {
  return _IST_FMT_KEY.format(new Date(now.getTime() - AI_RESET_HOUR_IST * 3600_000));
}

// ===== Idempotent DDL bootstrap (byte-match with `prisma db push`) =====
let _refTableReady = false;
export async function ensureReferralTables(): Promise<boolean> {
  if (_refTableReady) return true;
  try {
    await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "ReferralCode" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "userId" TEXT NOT NULL, "lastDeviceHash" TEXT, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id"))');
    await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_code_key" ON "ReferralCode"("code")');
    await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_userId_key" ON "ReferralCode"("userId")');
    await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "Referral" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "referrerId" TEXT NOT NULL, "refereeId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT \'PENDING\', "deviceHash" TEXT, "ipHash" TEXT, "welcomeDayKey" TEXT, "rewardDayKey" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3), CONSTRAINT "Referral_pkey" PRIMARY KEY ("id"))');
    await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Referral_refereeId_key" ON "Referral"("refereeId")');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Referral_referrerId_status_idx" ON "Referral"("referrerId", "status")');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Referral_refereeId_welcomeDayKey_idx" ON "Referral"("refereeId", "welcomeDayKey")');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Referral_refereeId_rewardDayKey_idx" ON "Referral"("refereeId", "rewardDayKey")');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Referral_deviceHash_idx" ON "Referral"("deviceHash")');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Referral_ipHash_idx" ON "Referral"("ipHash")');
    _refTableReady = true;
    return true;
  } catch (e: any) {
    console.warn("[referrals] table ensure failed:", String(e?.message || e).slice(0, 160));
    return false;
  }
}

// ===== Code generation — 7 chars, unambiguous base32 (no 0/O/1/I) =====
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no 0O1I
export function randomCode(): string {
  let out = "";
  for (let i = 0; i < 7; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

/** Find the user's code row, creating one (collision-safe) if missing. */
export async function getOrCreateCode(userId: string): Promise<string | null> {
  const existing = await db.referralCode.findUnique({ where: { userId }, select: { code: true } });
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const row = await db.referralCode.create({ data: { userId, code: randomCode() }, select: { code: true } });
      return row.code;
    } catch (e: any) {
      if (String(e?.code) !== "P2002") throw e; // P2002 = userId or code taken → retry / re-read
    }
  }
  const again = await db.referralCode.findUnique({ where: { userId }, select: { code: true } });
  return again?.code ?? null;
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length >= 4 && c.length <= 12 ? c : null;
}

// ===== Hashes (device / IP anti-fraud signals) =====
export function hashDevice(deviceId: unknown): string | null {
  if (typeof deviceId !== "string" || deviceId.length < 6 || deviceId.length > 128) return null;
  return createHash("sha256").update(`tly-d:${deviceId}`).digest("hex").slice(0, 32);
}
export function hashIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  if (!ip) return null;
  return createHash("sha256").update(`tly-i:${ip}`).digest("hex").slice(0, 32);
}

// ===== Quota bonus — used by the AI route (engine 23) =====
export interface ReferralBonus {
  referrer: number; // capped completed-referral bonus
  referee: number; // welcome + completion day bonus
}
/**
 * Bonus lookup with ONE retry. A transient pooler/connection error must
 * not silently zero the user's earned bonus (seen live: two consecutive
 * requests returned bonus=0 right after a successful claim, then healed).
 * Fail-open (0) only after the retry — DB down must never block AI chat;
 * the base limit still applies.
 */
async function bonusQuery(userId: string, day: string): Promise<ReferralBonus | null> {
  // NOTE: $queryRaw MUST be called as a TAG function (no parentheses) —
  // a normal call passes the SQL as one untagged string and Prisma
  // rejects it, silently zeroing every bonus (caught in prod E2E).
  const rows = await db.$queryRaw<any[]>`SELECT
       (SELECT COUNT(*)::int FROM "Referral" WHERE "referrerId" = ${userId} AND status = 'COMPLETED') AS ref_completed,
       (SELECT COUNT(*)::int FROM "Referral" WHERE "refereeId" = ${userId} AND "welcomeDayKey" = ${day}) AS welcome,
       (SELECT COUNT(*)::int FROM "Referral" WHERE "refereeId" = ${userId} AND "rewardDayKey" = ${day}) AS reward`;
  const r = rows?.[0];
  if (!r) return null;
  const referrer = Math.min(REF_BONUS_CAP, Math.max(0, Number(r.ref_completed) || 0) * REF_BONUS_PER);
  const referee = ((Number(r.welcome) || 0) > 0 ? REFEREE_WELCOME_BONUS : 0) + ((Number(r.reward) || 0) > 0 ? REFEREE_COMPLETE_BONUS : 0);
  return { referrer, referee };
}

export async function getReferralBonus(userId: string, day: string): Promise<ReferralBonus> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await bonusQuery(userId, day);
      if (result) return result;
      console.warn(`[referrals] bonus query empty (attempt ${attempt}) — user ${userId.slice(0, 8)} day ${day}`);
    } catch (e: any) {
      // Non-silent: if this ever recurs, the reason is in the server logs.
      console.warn(`[referrals] bonus query FAILED (attempt ${attempt}):`, String(e?.message || e).slice(0, 200));
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 150)); // brief pause before retry
  }
  return { referrer: 0, referee: 0 }; // retry also failed → base limit only (fail-open)
}

// ===== Completion check — referee's first REAL action =====
// Seeded starter content adds only HABITS (+ device-local routine tasks),
// so habits are deliberately EXCLUDED. Real usage = any row in expenses /
// incomes / shopping / borrow_lend / notes / calendar_events (+ office /
// student data), OR enough AI usage to prove a human is using the app.
//
// ⚠️ ARCHITECTURE: user data lives in the SUPABASE project (a DIFFERENT
// database than Prisma's DATABASE_URL, which only holds admin-panel tables
// + Referral/AiUsage). So data existence is checked via the Supabase REST
// API with the service key — Prisma raw SQL can never see these tables
// (prod E2E caught: relation "expenses" does not exist).
export async function refereeHasRealUsage(
  refereeId: string,
  clientTaskUsage = false
): Promise<boolean> {
  // 0) Client-asserted task usage. Main-mode tasks live ONLY in the
  // referee's localStorage (routine storage is never synced), so their app
  // reports "ticked a task done / added one of their own" with each
  // /activate call. The claim-time gates (48h account window, one claim per
  // account, ≤2 referees/device, ≤10/IP/week) are what actually bound
  // farming — this gate only filters bare signups that never opened the app.
  if (clientTaskUsage) return true;

  // 1) AI usage lives WITH the referrals (Prisma DB) — 3+ messages = real usage
  try {
    const agg = await db.aiUsage.aggregate({ where: { userId: refereeId }, _sum: { count: true } });
    if ((agg._sum.count ?? 0) >= REF_COMPLETION_AI_THRESHOLD) return true;
  } catch { /* fall through to the data check */ }

  // 2) User data lives in the Supabase project — REST + service key (bypasses RLS)
  // office_data / student_data are deliberately EXCLUDED: autoSave upserts
  // (possibly empty) rows for every user on first app open — no usage signal.
  // Habits are EXCLUDED as bare rows (seeded for every new user) but a habit
  // with PROGRESS (done > 0) only exists if the user actually tapped it.
  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const checks: Array<[table: string, filter: string]> = [
    ["expenses", ""], ["incomes", ""], ["shopping", ""], ["borrow_lend", ""],
    ["notes", ""], ["calendar_events", ""],
    ["habits", "&done=gt.0"], // seeded habits start at done=0 → progress = usage
  ];
  const results = await Promise.all(
    checks.map(([t, filter]) =>
      fetch(`${SUPA}/rest/v1/${t}?user_id=eq.${encodeURIComponent(refereeId)}${filter}&select=id&limit=1`, {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    )
  );
  const hasData = results.some((rows) => Array.isArray(rows) && rows.length > 0);
  return hasData;
}

/** Public stats shape returned by /api/referrals/me */
export function bonusSummary(completed: number) {
  const referrerBonus = Math.min(REF_BONUS_CAP, completed * REF_BONUS_PER);
  return {
    completed,
    bonusPerReferral: REF_BONUS_PER,
    bonusCap: REF_BONUS_CAP,
    referrerBonus,
    refereeWelcomeBonus: REFEREE_WELCOME_BONUS,
    refereeCompleteBonus: REFEREE_COMPLETE_BONUS,
  };
}
