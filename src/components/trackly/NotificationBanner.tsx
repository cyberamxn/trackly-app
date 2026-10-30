"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth";
import { useTracklyStore } from "@/lib/trackly/store";
import { supabase } from "@/lib/supabase/client";

interface AdminNotification {
  id: string;
  title: string;
  body: string;
  target: string;
  sentAt: string | null;
  read: boolean;
  readAt: string | null;
}

const LAST_SEEN_KEY = "trackly-notif-last-seen";
const POLL_INTERVAL = 15_000;
// How long the popup stays before auto-advancing. Long enough that the user
// can actually read it on a phone, short enough to not be annoying.
const AUTO_ADVANCE_MS = 15_000;

// Auth header helper — the notifications endpoint verifies the caller's
// Supabase JWT matches the requested userId (security audit fix).
async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const t = data?.session?.access_token;
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

export function NotificationBanner() {
  const { user } = useAuth();
  const { setScreen, setUnreadNotifCount } = useTracklyStore();

  const [queue, setQueue] = useState<AdminNotification[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // ===== In-memory dismiss set (resets on every app open) =====
  // We deliberately do NOT use sessionStorage or localStorage here.
  // On mobile PWAs, the WebView can be suspended (not killed) when the user
  // swipes the app away, which means sessionStorage persists across "app
  // closes". That caused dismissed notifications to never re-pop-up on app
  // reopen, even if the user had never actually read them.
  //
  // Using a plain useRef means:
  //   - Fresh app open (new JS context) → empty set → ALL unread
  //     notifications within 24h pop up, including ones that arrived while
  //     the app was closed.
  //   - User dismisses a popup → ID added to ref → won't show again THIS
  //     session, but will re-show on next full app restart (since the ref
  //     resets).
  //   - Server-side `read` state is still the source of truth — if the user
  //     actually marked a notification as read (via markRead or markAllRead),
  //     it won't show as a popup even after app restart, because the GET
  //     endpoint returns it with `read: true` and we filter it out.
  const dismissedThisMountRef = useRef<Set<string>>(new Set());

  const lastFetchRef = useRef<number>(0);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = queue[currentIdx];

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/public/notifications?userId=${user.id}`, {
        cache: "no-store",
        headers: await authHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const all: AdminNotification[] = data.notifications || [];
      // Only show UNREAD notifications that haven't been dismissed this mount.
      const visible = all.filter((n) => !n.read && !dismissedThisMountRef.current.has(n.id));
      setQueue(visible);
      // Track total unread count (for the dashboard bell badge) — includes
      // notifications the user dismissed this session but hasn't actually
      // marked as read on the server.
      const totalUnread = all.filter((n) => !n.read).length;
      setUnreadNotifCount(totalUnread);
      // Reset the popup index to 0 whenever we refresh — so newly-fetched
      // unread notifications bubble back up to the top even if the user had
      // advanced past them earlier.
      setCurrentIdx(0);
      lastFetchRef.current = Date.now();
      try { localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString()); } catch {}
    } catch (e) {
      console.warn("[NotificationBanner] Fetch failed:", e);
    }
  }, [user?.id]);

  // ===== Initial fetch + polling + realtime subscription =====
  useEffect(() => {
    if (!user?.id) return;

    // Lazy server-side cleanup: trigger the 24h auto-delete endpoint once
    // on mount. This is a fallback for when pg_cron isn't enabled.
    fetch("/api/public/notifications/cleanup", { method: "POST" }).catch(() => {});

    // ===== CRITICAL: fetch IMMEDIATELY on mount =====
    // This is what makes notifications pop up when the user opens the app
    // after having received them while it was closed. No delay, no waiting.
    fetchNotifications();

    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    const handleFocus = () => fetchNotifications();
    window.addEventListener("focus", handleFocus);

    // Realtime — pops the banner the instant an admin sends a notification.
    const channel = supabase
      .channel("public:notifications:banner")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as any;
          if (row?.status === "SENT") fetchNotifications();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as any;
          if (row?.status === "SENT") fetchNotifications();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications" },
        () => fetchNotifications()
      )
      .subscribe();

    // Cross-tab sync — listen for mark-all-read events from the
    // Notifications screen so the banner instantly clears too.
    const handleMarkAllRead = () => fetchNotifications();
    window.addEventListener("trackly-notifications-changed", handleMarkAllRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("trackly-notifications-changed", handleMarkAllRead);
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  // Auto-advance after AUTO_ADVANCE_MS
  useEffect(() => {
    if (!current) return;
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = setTimeout(() => setCurrentIdx((i) => i + 1), AUTO_ADVANCE_MS);
    return () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current); };
  }, [current, currentIdx]);

  const markRead = useCallback(async (notifId: string) => {
    if (!user?.id) return;
    // Optimistically dismiss from this mount's queue
    dismissedThisMountRef.current.add(notifId);
    setCurrentIdx((i) => i + 1);
    // Mark read on the server too — so it stops showing as unread on next fetch
    try {
      await fetch("/api/public/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ userId: user.id, notificationId: notifId }),
      });
      // Notify other components (Notifications screen) that read-state changed
      window.dispatchEvent(new Event("trackly-notifications-changed"));
    } catch (e) {
      console.warn("[NotificationBanner] Failed to mark read");
    }
  }, [user?.id]);

  if (!current) return null;

  const sentDate = current.sentAt ? new Date(current.sentAt) : null;
  const sentLabel = sentDate
    ? sentDate.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "Just now";

  return (
    <AnimatePresence>
      <motion.div
        key={current.id}
        initial={{ y: -80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -80, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="absolute top-2 left-2 right-2 z-40"
      >
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => { markRead(current.id); setScreen("notifications"); }}
          className="bg-foreground text-background rounded-2xl shadow-2xl overflow-hidden cursor-pointer"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-background/10">
            <div className="flex items-center gap-1.5">
              <Megaphone size={11} className="opacity-80" />
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">From Admin</span>
              {queue.length > 1 && (
                <span className="text-[10px] opacity-60 ml-1">· {currentIdx + 1}/{queue.length}</span>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); markRead(current.id); }}
              className="h-6 w-6 rounded-full hover:bg-background/20 flex items-center justify-center"
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
          <div className="px-4 pt-2 pb-3">
            <p className="text-[14px] font-bold leading-tight">{current.title}</p>
            <p className="text-[12px] opacity-80 mt-1 leading-snug line-clamp-2">{current.body}</p>
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[10px] opacity-60 font-medium">{sentLabel}</span>
              <div className="flex items-center gap-0.5 text-[10px] font-semibold opacity-70">
                Tap to view <ChevronRight size={11} />
              </div>
            </div>
          </div>
          <div className="h-0.5 bg-background/10">
            <motion.div
              key={current.id}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: "linear" }}
              className="h-full bg-background/40"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
