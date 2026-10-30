"use client";

import { useEffect, useRef } from "react";
import { useSync } from "@/lib/trackly/sync";

const POLL_INTERVAL = 30000; // 30 seconds

/**
 * Hook that syncs admin data into the app.
 * - Fetches on mount
 * - Polls every 30 seconds
 * - Provides live admin → app synchronization
 */
export function useAdminSync() {
  const sync = useSync((s) => s.sync);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Initial sync
    sync();

    // Poll every 30 seconds
    intervalRef.current = setInterval(() => {
      sync();
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sync]);

  // Also sync when the tab regains focus
  useEffect(() => {
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [sync]);
}
