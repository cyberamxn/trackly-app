"use client";

// ===================================================================
// GroupInviteWatcher — pops a banner the moment a group invitation
// arrives, so an invite is never "lost" in the Groups hub.
// - polls GET /api/groups/invites/pending every 20s + on app focus
// - in-memory dismiss (session only): the invite stays pending in the
//   hub until the user actually responds — the banner is just a heads-up
// - tap → jump straight into the Groups hub (invitation cards on top)
// ===================================================================

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth";
import { useTracklyStore } from "@/lib/trackly/store";
import { supabase } from "@/lib/supabase/client";

interface PendingInvite {
  id: string;
  groupId: string;
  groupName: string;
  groupIcon: string;
  inviterName: string;
  createdAt: string;
}

const POLL_INTERVAL = 20_000;
const AUTO_ADVANCE_MS = 12_000;

export function GroupInviteWatcher() {
  const { user } = useAuth();
  const { screen, setScreen } = useTracklyStore();

  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const dismissedRef = useRef<Set<string>>(new Set());
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInvites = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/groups/invites/pending", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data2 = await res.json();
      setInvites(data2.invitations ?? []);
    } catch {
      // silent — banner is best-effort, hub is the source of truth
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchInvites();
    const interval = setInterval(fetchInvites, POLL_INTERVAL);
    const onFocus = () => fetchInvites();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id, fetchInvites]);

  // Don't banner while the user is already inside the Groups screens —
  // the hub itself shows the invitation cards at the top.
  const hidden = screen === "groups" || screen === "group";
  const current = !hidden ? invites.find((i) => !dismissedRef.current.has(i.id)) : undefined;

  // auto-advance to the next undismissed invite
  useEffect(() => {
    if (!current) return;
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = setTimeout(() => {
      dismissedRef.current.add(current.id);
      setInvites((prev) => [...prev]); // trigger re-render
    }, AUTO_ADVANCE_MS);
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openHub = () => {
    if (current) dismissedRef.current.add(current.id);
    setInvites((prev) => [...prev]);
    setScreen("groups");
  };

  const dismiss = (id: string) => {
    dismissedRef.current.add(id);
    setInvites((prev) => [...prev]);
  };

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ y: -80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -80, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="absolute top-2 left-2 right-2 z-30"
        >
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={openHub}
            className="bg-foreground text-background rounded-2xl shadow-2xl overflow-hidden cursor-pointer"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-background/10">
              <div className="flex items-center gap-1.5">
                <Users size={11} className="opacity-80" />
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">Group invitation</span>
                {invites.filter((i) => !dismissedRef.current.has(i.id)).length > 1 && (
                  <span className="text-[10px] opacity-60 ml-1">
                    · {invites.filter((i) => !dismissedRef.current.has(i.id)).length} pending
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(current.id);
                }}
                className="h-6 w-6 rounded-full hover:bg-background/20 flex items-center justify-center"
                aria-label="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
            <div className="px-4 pt-2 pb-3 flex items-center gap-3">
              <div className="text-[26px] leading-none">{current.groupIcon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold leading-tight truncate">
                  {current.inviterName} invited you to “{current.groupName}”
                </p>
                <p className="text-[12px] opacity-80 mt-0.5 leading-snug">Tap to view & respond in Groups</p>
              </div>
              <ChevronRight size={16} className="opacity-70 shrink-0" />
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
      )}
    </AnimatePresence>
  );
}
