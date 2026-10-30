"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegister v4.0 — STABLE, NO RELOAD LOOPS
 *
 * FIXES the "website keeps refreshing on mobile" bug:
 * - Removed: nukeOldSW on every load (was causing infinite re-registration)
 * - Removed: clearAllCaches on every load (was causing data loss)
 * - Removed: 30-second update interval (was causing periodic reloads)
 * - Removed: controllerchange → reload (was the main reload trigger)
 *
 * The SW is now registered ONCE and left alone. Updates happen
 * naturally when the browser checks for sw.js changes (controlled
 * by the browser, not our code).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // DEV: NEVER keep a service worker — cached bundles serve stale code
    // and hide server-side fixes from the browser. Unregister everything.
    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
      if ("caches" in window) {
        window.caches.keys().then((keys) => {
          keys.forEach((k) => window.caches.delete(k));
        }).catch(() => {});
      }
      return;
    }

    let isRegistered = false;

    const register = async () => {
      try {
        // Check if SW is already registered — don't re-register
        const existing = await navigator.serviceWorker.getRegistration();
        if (existing) {
          isRegistered = true;
          return;
        }

        // Register only if not already registered
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        isRegistered = true;
      } catch {
        // Silent fail — SW is enhancement, not requirement
      }
    };

    // Register after page load (non-blocking)
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
