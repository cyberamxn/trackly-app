// ===================================================================
// Starter routine-task labels — SINGLE SOURCE OF TRUTH.
// Shared by seed.ts (seeds them for new accounts) and the referral
// client (tells seeded tasks apart from user-added tasks).
// ===================================================================

export type StarterPeriod = "Morning" | "Afternoon" | "Evening" | "Night";

/** Display-cased starter tasks per period (seeded once per new account). */
export const STARTER_TASKS_BY_PERIOD: Record<StarterPeriod, string[]> = {
  Morning: ["Drink a glass of water", "Stretch for 5 min"],
  Afternoon: ["Have a healthy lunch"],
  Evening: ["Take a 15-min walk"],
  Night: ["Read before bed"],
};

/** Normalized (lowercase) set of ALL starter task labels. */
export const STARTER_TASK_LABELS: Set<string> = new Set(
  Object.values(STARTER_TASKS_BY_PERIOD)
    .flat()
    .map((s) => s.trim().toLowerCase())
);

/** Is this task label one of the auto-seeded starter tasks? */
export function isStarterTaskLabel(label: string): boolean {
  return STARTER_TASK_LABELS.has(String(label || "").trim().toLowerCase());
}
