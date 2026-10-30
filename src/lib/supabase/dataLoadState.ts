"use client";

/**
 * Global flag to track whether user data has been loaded from Supabase.
 * This prevents autoSave from overwriting cloud data with empty/defaults
 * during the brief window between login and data load completion.
 *
 * Race condition we're fixing:
 * 1. User logs in → userId becomes available
 * 2. AutoSaveHook mounts → fires for settings/office/student (no length guard)
 * 3. AutoSave overwrites Supabase with LOCAL defaults (empty arrays)
 * 4. loadUserDataFromSupabase completes → but data is already gone from Supabase
 *
 * Fix:
 * 1. User logs in → userId becomes available
 * 2. dataLoaded = false → AutoSave skips ALL writes
 * 3. loadUserDataFromSupabase runs → sets local stores from cloud
 * 4. dataLoaded = true → AutoSave can now write safely
 */

let dataLoaded = false;
const listeners = new Set<() => void>();

export function isDataLoaded(): boolean {
  return dataLoaded;
}

export function setDataLoaded(value: boolean): void {
  dataLoaded = value;
  listeners.forEach((l) => l());
}

export function subscribeToDataLoaded(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
