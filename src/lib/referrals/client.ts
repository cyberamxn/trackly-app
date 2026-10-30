"use client";

// ===================================================================
// Referral system — CLIENT helpers.
// Flow: /r/CODE or ?ref=CODE → localStorage (30 days) → signup/login →
// POST /claim (once) → PENDING → app keeps calling /activate (throttled)
// until the referee's first REAL usage completes the referral.
// ===================================================================

import { supabase } from "@/lib/supabase/client";
import { loadRoutines } from "@/lib/trackly/routine";
import { isStarterTaskLabel } from "@/lib/trackly/starterLabels";

const REF_KEY = "trackly-ref-code"; // { code, ts }
const PENDING_KEY = "trackly-ref-pending"; // "1" until referral resolves
const CLAIMED_KEY = "trackly-ref-claimed"; // "1" — claim attempted for this account
const DEVICE_KEY = "trackly-device-id"; // random per-browser device id

export const REF_TTL_MS = 30 * 86400_000; // 30 days

/** Stable per-browser device id (anti-fraud signal, hashed server-side). */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = "";
  try {
    id = localStorage.getItem(DEVICE_KEY) || "";
    if (!id) {
      id =
        (crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`) +
        Math.random().toString(36).slice(2, 10);
      localStorage.setItem(DEVICE_KEY, id);
    }
  } catch {}
  return id;
}

function readStored(): { code: string; ts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.code === "string" && parsed.code.length >= 4 && parsed.code.length <= 12) {
      return { code: parsed.code.toUpperCase(), ts: Number(parsed.ts) || Date.now() };
    }
  } catch {}
  return null;
}

/** Remove any expired stored code (called opportunistically). */
function prune() {
  const stored = readStored();
  if (stored && Date.now() - stored.ts > REF_TTL_MS) {
    try { localStorage.removeItem(REF_KEY); } catch {}
  }
}

/**
 * Capture ?ref= from the current URL into localStorage (30-day TTL) and
 * clean the query string. Runs on every page via <RefCapture /> — a
 * friend's link (trackly.today/r/CODE or /?ref=CODE) survives landing →
 * browse → signup, even if the signup happens days later.
 */
export function captureRefFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  prune();
  try {
    const url = new URL(window.location.href);
    const raw = (url.searchParams.get("ref") || "").trim();
    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length >= 4 && code.length <= 12) {
      // Don't overwrite a fresher existing code with junk
      localStorage.setItem(REF_KEY, JSON.stringify({ code, ts: Date.now() }));
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
      return code;
    }
  } catch {}
  return null;
}

/** The stored ref code, if any (unexpired). */
export function getStoredRef(): string | null {
  if (typeof window === "undefined") return null;
  prune();
  return readStored()?.code ?? null;
}

export function isRefPending(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(PENDING_KEY) === "1"; } catch { return false; }
}

function setPending(v: boolean) {
  try {
    if (v) localStorage.setItem(PENDING_KEY, "1");
    else localStorage.removeItem(PENDING_KEY);
  } catch {}
}

function setClaimed() {
  try { localStorage.setItem(CLAIMED_KEY, "1"); } catch {}
}
function hasClaimed(): boolean {
  try { return localStorage.getItem(CLAIMED_KEY) === "1"; } catch { return false; }
}

async function authedPost(path: string, body?: unknown): Promise<{ status: number; json: any } | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null; // not signed in — callers retry later
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Device-Id": getDeviceId(),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  } catch {
    return null; // network error — retry later
  }
}

/**
 * Claim the stored ref code for the signed-in account (runs after
 * signup/login). Definitive outcomes clear the stored code; transient
 * failures keep it for the next boot.
 */
export async function claimStoredReferral(): Promise<void> {
  if (typeof window === "undefined") return;
  if (hasClaimed()) return; // one attempt per browser is enough
  const code = getStoredRef();
  if (!code) return;

  const r = await authedPost("/api/referrals/claim", { code });
  if (!r) return; // offline — try again next boot

  if (r.status === 200 && r.json?.status === "PENDING") {
    setPending(true);
  }
  // Every definitive response (ok, self_referral, too_old, already_referred,
  // device_limit, ip_limit, invalid_code) ends the flow for this browser.
  setClaimed();
  try { localStorage.removeItem(REF_KEY); } catch {}
}

/**
 * Local task-usage signal (referee side). Main-mode tasks live ONLY in
 * localStorage (routine storage — never synced to the cloud), so the server
 * can't see them. Real task usage = the user ticked any task done, or added
 * a task of their own (seeded starter tasks all start unchecked and are
 * filtered out by label). Sent with /api/referrals/activate so a friend
 * whose FIRST action is a task (the Dashboard's #1 CTA) still completes the
 * referral — the invite screen promises exactly that.
 */
function localTaskUsage(): boolean {
  try {
    const routines = loadRoutines();
    return routines.some((r) =>
      r.tasks.some((t) => t.done === true || !isStarterTaskLabel(t.label))
    );
  } catch {
    return false;
  }
}

/**
 * Try to complete the referral (referee side). Called while a referral is
 * PENDING — throttled to once per minute. Returns the completion message
 * when the referral just completed (caller shows the toast).
 */
let _lastActivateAt = 0;
export async function activateReferral(force = false): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!isRefPending()) return null;
  const now = Date.now();
  if (!force && now - _lastActivateAt < 60_000) return null;
  _lastActivateAt = now;

  const r = await authedPost("/api/referrals/activate", { taskUsage: localTaskUsage() });
  if (!r) return null;

  if (r.status === 200 && r.json?.status === "COMPLETED") {
    setPending(false);
    return r.json?.message || "Referral complete 🎉";
  }
  if (r.status === 200 && r.json?.status === "none") {
    setPending(false); // no pending referral (revoked?) — stop asking
  }
  return null;
}

/** Landing-side check: is a ref code stored (show welcome banner). */
export function hasStoredRef(): boolean {
  return !!getStoredRef();
}
