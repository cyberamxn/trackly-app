import { db } from "@/lib/db";

// ===================================================================
// ADMIN-GRANTED PREMIUM (engine 29)
// Admin panel → Users → kisi bhi Supabase user ko Premium grant/revoke.
// Premium = NO limits on the account (daily AI quota bypassed entirely;
// that is currently the ONLY enforced user-facing limit — referral
// device/IP caps & invite throttles are anti-fraud, deliberately kept).
//
// Storage: Prisma "PremiumUser" (prod = Supabase Postgres, same DB as
// AiUsage). Table is created at runtime by ensurePremiumTable()
// (idempotent DDL — byte-match with `prisma db push`, same pattern as
// ensureAiUsageTable/ensureReferralTables). Queries are RAW SQL so no
// prisma-generate round-trip is needed when the model is added.
//
// Failure semantics: fail-CLOSED for premium (DB error → treated as NOT
// premium → normal limits apply). Ek glitch pe kabhi bhi unlimited
// AI spend unlock nahi hoga.
// ===================================================================

let _premiumTableReady = false;

export async function ensurePremiumTable(): Promise<boolean> {
  if (_premiumTableReady) return true;
  try {
    // Byte-match with `prisma db push` output for the PremiumUser model.
    await db.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "PremiumUser" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "note" TEXT, "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PremiumUser_pkey" PRIMARY KEY ("id"))'
    );
    await db.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "PremiumUser_userId_key" ON "PremiumUser"("userId")'
    );
    _premiumTableReady = true;
    return true;
  } catch (e: any) {
    console.warn("[premium] ensure table failed:", String(e?.message || e).slice(0, 120));
    return false;
  }
}

/** Is this Supabase user premium (admin-granted)? Fail-closed: false. */
export async function isPremiumUser(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (!(await ensurePremiumTable())) return false;
  try {
    const rows = await db.$queryRaw<{ userId: string }[]>`
      SELECT "userId" FROM "PremiumUser" WHERE "userId" = ${userId} LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export interface PremiumInfo {
  userId: string;
  since: Date;
  note: string | null;
}

/** Grant premium (idempotent — re-grant just refreshes since/note). */
export async function grantPremium(userId: string, note?: string | null): Promise<boolean> {
  if (!userId || typeof userId !== "string") return false;
  if (!(await ensurePremiumTable())) return false;
  const id = crypto.randomUUID();
  const safeNote = note ?? null;
  try {
    await db.$executeRaw`
      INSERT INTO "PremiumUser" ("id", "userId", "note", "since", "createdAt", "updatedAt")
      VALUES (${id}, ${userId}, ${safeNote}, now(), now(), now())
      ON CONFLICT ("userId")
      DO UPDATE SET "note" = ${safeNote}, "updatedAt" = now()
    `;
    return true;
  } catch (e: any) {
    console.warn("[premium] grant failed:", String(e?.message || e).slice(0, 120));
    return false;
  }
}

/** Revoke premium. Idempotent (missing row = already revoked = success). */
export async function revokePremium(userId: string): Promise<boolean> {
  if (!userId || typeof userId !== "string") return false;
  if (!(await ensurePremiumTable())) return false;
  try {
    await db.$executeRaw`DELETE FROM "PremiumUser" WHERE "userId" = ${userId}`;
    return true;
  } catch (e: any) {
    console.warn("[premium] revoke failed:", String(e?.message || e).slice(0, 120));
    return false;
  }
}

/** One user's premium info (null = not premium). Fail-closed. */
export async function getPremiumInfo(userId: string): Promise<PremiumInfo | null> {
  if (!userId) return null;
  if (!(await ensurePremiumTable())) return null;
  try {
    const rows = await db.$queryRaw<{ userId: string; since: Date; note: string | null }[]>`
      SELECT "userId", "since", "note" FROM "PremiumUser" WHERE "userId" = ${userId} LIMIT 1
    `;
    return rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

/**
 * Premium map for admin lists. The table is tiny (admin-granted only),
 * so one unfiltered SELECT is cheaper & simpler than an IN clause.
 * Optional userIds filter narrows it when the caller already has ids.
 */
export async function getPremiumMap(userIds?: string[]): Promise<Map<string, PremiumInfo>> {
  const map = new Map<string, PremiumInfo>();
  if (!(await ensurePremiumTable())) return map;
  try {
    const rows = await db.$queryRaw<{ userId: string; since: Date; note: string | null }[]>`
      SELECT "userId", "since", "note" FROM "PremiumUser"
    `;
    for (const r of rows) {
      if (!userIds || userIds.includes(r.userId)) {
        map.set(r.userId, { userId: r.userId, since: r.since, note: r.note });
      }
    }
  } catch {
    // fail-closed: empty map = nobody premium in this render
  }
  return map;
}
