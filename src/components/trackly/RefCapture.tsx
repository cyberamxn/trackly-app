"use client";

import { useLayoutEffect } from "react";
import { captureRefFromUrl } from "@/lib/referrals/client";

/**
 * Global ?ref= capture — mounted once in the root layout, runs on every
 * page load (landing, /install, /app, ...). A friend's invite link
 * (trackly.today/r/CODE → /?ref=CODE) stores the code for 30 days so the
 * referral still counts whenever the visitor signs up.
 *
 * useLayoutEffect (not useEffect): layout effects run BEFORE any passive
 * effect — e.g. LandingClient's signed-in → /app redirect — so the ?ref
 * is always captured before a redirect can wipe it from the URL.
 *
 * The CLAIM itself runs in /app boot (src/app/app/page.tsx) once a
 * signed-in session exists.
 */
export function RefCapture() {
  useLayoutEffect(() => {
    captureRefFromUrl();
  }, []);
  return null;
}
