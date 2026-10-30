"use client";

// ===== Shared Routine storage =====
// v2: periods start EMPTY here — starter tasks come from seed.ts
// (once-per-user, deduped, deletable) so deletions always stick.
// Used by both the Routine screen and the Dashboard "Today's Tasks" card.

import type { Routine, RoutineTask } from "./data";

export const ROUTINE_STORAGE_KEY = "trackly-routine-v2";
const OLD_DEMO_KEY = "trackly-routine-v1";

/** 4 periods, zero tasks — the clean slate */
export const EMPTY_ROUTINES: Routine[] = [
  { id: "r-morning", period: "Morning", icon: "sunrise", tasks: [] },
  { id: "r-afternoon", period: "Afternoon", icon: "sun", tasks: [] },
  { id: "r-evening", period: "Evening", icon: "sunset", tasks: [] },
  { id: "r-night", period: "Night", icon: "moon", tasks: [] },
];

/** Hydrate from localStorage; falls back to the empty scaffold. */
export function loadRoutines(): Routine[] {
  if (typeof window === "undefined") return EMPTY_ROUTINES;
  // One-time cleanup: discard the old demo-task data
  try {
    if (localStorage.getItem(OLD_DEMO_KEY) !== null) {
      localStorage.removeItem(OLD_DEMO_KEY);
    }
  } catch {}
  try {
    const raw = localStorage.getItem(ROUTINE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return EMPTY_ROUTINES;
}

/** Persist helper — writes the given routines array. */
export function saveRoutines(routines: Routine[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(routines));
  } catch {}
}

/** Restore a deleted task back into its original period. */
export function restoreTaskToRoutine(routineId: string, task: RoutineTask): Routine[] {
  const routines = loadRoutines();
  const updated = routines.map((r) =>
    r.id === routineId || (!routineId && r.period === "Morning")
      ? { ...r, tasks: [...r.tasks, { ...task }] }
      : r
  );
  saveRoutines(updated);
  // Let open screens (Dashboard / Routine) know tasks changed
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("trackly-routines-changed"));
  }
  return updated;
}
