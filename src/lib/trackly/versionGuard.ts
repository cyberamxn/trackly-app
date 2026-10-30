"use client";

/**
 * App Version Guard — THE PERMANENT FIX
 *
 * PROBLEM: When app code changes (new features, bug fixes), old localStorage
 * data from previous versions persists. This causes:
 * - Old mock data reappearing (Electricity Bill, Data Structures, etc.)
 * - Feature flags/setting mismatches
 * - App reverting to "old mode" with old bugs
 * - Stores loading stale data that conflicts with new code
 *
 * SOLUTION: Store current app version in localStorage. On every page load,
 * compare stored version with current version. If they don't match:
 * 1. Clear ALL localStorage (every trackly-* key)
 * 2. Clear ALL cache storage
 * 3. Unregister old service worker
 * 4. Reload page fresh
 *
 * This guarantees users ALWAYS get the latest version with clean state.
 * Dubara kabhi purana version nahi dikhega.
 */

export const APP_VERSION = "trackly-v4.5.2-install-video";
const VERSION_KEY = "trackly-app-version";

export function checkAppVersion(): boolean {
  if (typeof window === "undefined") return false;

  const stored = localStorage.getItem(VERSION_KEY);

  // First visit or same version → OK
  if (stored === APP_VERSION) return false;

  // Version mismatch OR first install → need cleanup
  return true;
}

export function performVersionUpgrade(): void {
  if (typeof window === "undefined") return;

  console.log("[Trackly] Version mismatch detected. Performing full cleanup...");

  // Keys that SURVIVE the version cleanup — the referral invite flow
  // (trackly-ref-*) stores a friend's invite code for up to 30 days and
  // MUST NOT be wiped, or a first-time visitor clicking an invite link
  // loses their referral to the post-cleanup reload.
  const PRESERVE_KEYS = new Set([
    "trackly-ref-code",
    "trackly-ref-pending",
    "trackly-ref-claimed",
    "trackly-device-id",
  ]);

  // 1. Clear ALL trackly-* localStorage keys (except the preserve list)
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("trackly-") || key.startsWith("trackly_")) && !PRESERVE_KEYS.has(key)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => {
    console.log("[Trackly] Removing localStorage key:", key);
    localStorage.removeItem(key);
  });

  // 2. Clear ALL cache storage (non-blocking, no reload)
  if ("caches" in window) {
    window.caches.keys().then((keys) => {
      keys.forEach((k) => window.caches.delete(k));
    });
  }

  // 2b. Unregister ALL service workers — stale SWs serve old cached
  // bundles which keep users on buggy builds even after server fixes.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
  }

  // 3. Set new version BEFORE reload to prevent loop
  localStorage.setItem(VERSION_KEY, APP_VERSION);

  console.log("[Trackly] Cleanup complete. New version:", APP_VERSION);

  // 4. Single reload (not infinite — version is now set)
  window.location.reload();
}

/**
 * Call this at the TOP of the app (in layout or page).
 * If version mismatch → clears everything + reloads.
 * User never sees the old version.
 */
export function ensureAppVersion(): void {
  if (typeof window === "undefined") return;

  if (checkAppVersion()) {
    performVersionUpgrade();
  }
}
