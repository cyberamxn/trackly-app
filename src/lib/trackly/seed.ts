"use client";

// ===== Starter content seeding =====
// User request: "already pehle se habit or task create hua hona chahiye" —
// har account app kholte waqt EMPTY lists ki jagah kuch starter habits +
// routine tasks ke saath shuru hona chahiye.
//
// Ye REAL items hain (streak 0, done 0) — user inhe complete / edit / delete
// kar sakta hai bilkul apne items ki tarah. Fake demo streaks nahi.
//
// GUARANTEES:
// - ONCE per user (localStorage flag) — agar user delete kar de to wapas
//   kabhi nahi aayenge (deletions stick).
// - DEDUPE by name/label — cross-device ya leftover data pe kabhi duplicate
//   nahi banega (cloud me already maujood items skip ho jaate hain).
// - Runs AFTER loadUserDataFromSupabase resolves — seeded habits autoSave
//   se Supabase + local cache me sync ho jaate hain.

import { useAppData } from "./appData";
import { loadRoutines, saveRoutines } from "./routine";
import { STARTER_TASKS_BY_PERIOD } from "./starterLabels";

/** Fresh starter habits — realistic, all-zero progress */
const STARTER_HABITS: { name: string; icon: string; goal: number; unit: string }[] = [
  { name: "Drink water", icon: "droplet", goal: 8, unit: "glasses" },
  { name: "Morning walk", icon: "footprints", goal: 30, unit: "min" },
  { name: "Reading", icon: "book", goal: 20, unit: "min" },
  { name: "Exercise", icon: "dumbbell", goal: 1, unit: "session" },
];

const flagKey = (userId: string) => `trackly-starter-seeded-${userId}`;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Seed starter habits + routine tasks ONCE for the given user.
 * Call AFTER loadUserDataFromSupabase() resolves so cloud data is present
 * for dedupe (and dataLoaded=true so autoSave persists the additions).
 */
export function seedStarterContent(userId: string): void {
  if (typeof window === "undefined" || !userId) return;

  // Once-only guard — set the flag BEFORE seeding so a transient error
  // can't cause repeated seeding (and repeated additions) on later loads.
  let alreadySeeded = false;
  try {
    alreadySeeded = localStorage.getItem(flagKey(userId)) === "1";
    localStorage.setItem(flagKey(userId), "1");
  } catch {}
  if (alreadySeeded) return;

  // ---- Habits: add only the starter habits the user doesn't already have ----
  try {
    const state = useAppData.getState();
    const existing = new Set(state.habits.map((h) => norm(h.name)));
    const missing = STARTER_HABITS.filter((h) => !existing.has(norm(h.name)));
    if (missing.length > 0) {
      missing.forEach((h) => state.addHabit(h)); // autoSave syncs to Supabase
      console.log(`[Trackly] Seeded ${missing.length} starter habits for new start`);
    }
  } catch (err) {
    console.warn("[Trackly] Starter habit seeding skipped:", err);
  }

  // ---- Routine tasks: add missing starter labels to their periods ----
  try {
    const routines = loadRoutines();
    let added = 0;
    const updated = routines.map((r) => {
      const labels = new Set(r.tasks.map((t) => norm(t.label)));
      const newTasks = (STARTER_TASKS_BY_PERIOD[r.period] ?? [])
        .filter((label) => !labels.has(norm(label)))
        .map((label) => ({
          id: `t-${Date.now()}-${added}-${Math.random().toString(36).slice(2, 7)}`,
          label,
          done: false,
        }));
      added += newTasks.length;
      return newTasks.length > 0 ? { ...r, tasks: [...r.tasks, ...newTasks] } : r;
    });
    if (added > 0) {
      saveRoutines(updated);
      // Let open screens (Dashboard / Routine) know tasks changed
      window.dispatchEvent(new CustomEvent("trackly-routines-changed"));
      console.log(`[Trackly] Seeded ${added} starter tasks for new start`);
    }
  } catch (err) {
    console.warn("[Trackly] Starter task seeding skipped:", err);
  }
}
