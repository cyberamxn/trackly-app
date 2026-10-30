"use client";

import { useEffect } from "react";
import { ensureAppVersion } from "@/lib/trackly/versionGuard";

/**
 * VersionGuard — Runs BEFORE anything else.
 * Checks if app version matches stored version.
 * If mismatch → clears ALL old data + SW + caches → reloads fresh.
 *
 * This is the PERMANENT fix for "features disappearing after a few days".
 */
export function VersionGuard() {
  useEffect(() => {
    ensureAppVersion();
  }, []);

  return null;
}
