"use client";

// ===== Per-user localStorage cache (offline / failed-sync protection) =====
// The main app data (expenses, incomes, shopping, borrowLend, habits, notes,
// calendarEvents) lives in Supabase and is wiped from the in-memory store on
// every login before the cloud load finishes. If the cloud load fails or a
// previous cloud WRITE failed, the user's data would vanish on reload.
//
// This mirror keeps a fresh local copy under
//   trackly-userdata-cache-{userId}
// so a reload can always fall back to the newest known state.

import { useAppData } from "@/lib/trackly/appData";

const PREFIX = "trackly-userdata-cache-";

export interface UserCacheShape {
  savedAt: string; // ISO — when this cache was last written
  expenses: unknown[];
  incomes: unknown[];
  shopping: unknown[];
  borrowLend: unknown[];
  habits: unknown[];
  notes: unknown[];
  calendarEvents: unknown[];
}

const EMPTY: UserCacheShape = {
  savedAt: new Date().toISOString(),
  expenses: [],
  incomes: [],
  shopping: [],
  borrowLend: [],
  habits: [],
  notes: [],
  calendarEvents: [],
};

export function readUserCache(userId: string): UserCacheShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return { ...EMPTY, ...parsed } as UserCacheShape;
  } catch {
    return null;
  }
}

export function writeUserCache(userId: string, data: Partial<UserCacheShape>): void {
  if (typeof window === "undefined") return;
  try {
    const merged: UserCacheShape = { ...EMPTY, ...data, savedAt: new Date().toISOString() };
    localStorage.setItem(PREFIX + userId, JSON.stringify(merged));
  } catch {
    // storage full / private mode — non-fatal
  }
}

/** Snapshot the current in-memory store into the cache. */
export function mirrorUserCache(userId: string): void {
  const s = useAppData.getState();
  writeUserCache(userId, {
    expenses: s.expenses,
    incomes: s.incomes,
    shopping: s.shopping,
    borrowLend: s.borrowLend,
    habits: s.habits,
    notes: s.notes,
    calendarEvents: s.calendarEvents,
  });
}

/** Remove every cached user copy (used on logout). */
export function clearAllUserCaches(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // non-fatal
  }
}
