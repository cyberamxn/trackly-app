"use client";

import { motion } from "framer-motion";
import {
  Bell, Check, Megaphone, Calendar, Flame, Wallet,
  HandCoins, AlertCircle, Clock,
} from "lucide-react";
import { Card, ScreenHeader, EmptyState } from "../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData, selectTodaySpending, selectMonthSpending } from "@/lib/trackly/appData";
import { useAuth } from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

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

interface AdminNotification {
  id: string;
  title: string;
  body: string;
  target: string;
  sentAt: string | null;
  read: boolean;
  readAt: string | null;
}

interface AppReminder {
  id: string;
  category: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  icon: "calendar" | "habit" | "budget" | "borrow" | "warning";
  action?: () => void;
  actionLabel?: string;
}

const iconMap = {
  calendar: Calendar,
  habit: Flame,
  budget: Wallet,
  borrow: HandCoins,
  warning: AlertCircle,
};

const categoryColors: Record<string, string> = {
  Calendar: "bg-muted",
  Habit: "bg-muted",
  Budget: "bg-foreground text-background",
  Borrow: "bg-muted",
  Warning: "bg-muted",
};

export function Notifications() {
  const { setScreen } = useTracklyStore();
  const { user } = useAuth();
  const [adminNotifs, setAdminNotifs] = useState<AdminNotification[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  const calendarEvents = useAppData((s) => s.calendarEvents);
  const habits = useAppData((s) => s.habits);
  const borrowLend = useAppData((s) => s.borrowLend);
  const todaySpending = useAppData(selectTodaySpending);
  const monthSpending = useAppData(selectMonthSpending);

  const loadAdminNotifs = useCallback(async () => {
    if (!user?.id) {
      setLoadingAdmin(false);
      return;
    }
    try {
      const res = await fetch(`/api/public/notifications?userId=${user.id}`, {
        headers: await authHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setAdminNotifs(data.notifications || []);
    } catch (e: any) {
      console.error("[Notifications] Failed to load admin notifications:", e.message);
    } finally {
      setLoadingAdmin(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAdminNotifs();
    const interval = setInterval(loadAdminNotifs, 60_000);
    return () => clearInterval(interval);
  }, [loadAdminNotifs]);

  const markAdminRead = async (notifId: string) => {
    if (!user?.id) return;
    setAdminNotifs((prev) => prev.map((n) => n.id === notifId ? { ...n, read: true, readAt: new Date().toISOString() } : n));
    try {
      await fetch("/api/public/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ userId: user.id, notificationId: notifId }),
      });
      // Notify banner + any other listeners that read-state changed
      window.dispatchEvent(new Event("trackly-notifications-changed"));
    } catch (e: any) {
      console.error("[Notifications] Failed to mark read:", e.message);
    }
  };

  const markAllAdminRead = async () => {
    if (!user?.id) return;
    const unread = adminNotifs.filter((n) => !n.read);
    if (unread.length === 0) return;
    setAdminNotifs((prev) => prev.map((n) => ({ ...n, read: true, readAt: n.readAt || new Date().toISOString() })));
    try {
      // Single server call — the API bulk-marks every SENT notification in
      // the 24h window as read for this user.
      const res = await fetch("/api/public/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          userId: user.id,
          markAllRead: true,
          notificationIds: unread.map((n) => n.id),
        }),
      });
      if (res.ok) {
        toast.success(`Marked ${unread.length} notification${unread.length > 1 ? "s" : ""} as read`);
      } else {
        toast.error("Could not mark all as read — refreshing");
        loadAdminNotifs();
      }
      // Notify the banner so it clears its popup queue immediately
      window.dispatchEvent(new Event("trackly-notifications-changed"));
    } catch (e: any) {
      console.error("[Notifications] markAllAdminRead failed:", e.message);
      toast.error("Could not mark all as read — refreshing");
      loadAdminNotifs();
      window.dispatchEvent(new Event("trackly-notifications-changed"));
    }
  };

  // ===== Generate smart reminders from real user data =====
  const reminders: AppReminder[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

  calendarEvents.forEach((e) => {
    if (e.date === today) {
      reminders.push({
        id: `cal-today-${e.id}`, category: "Calendar", title: `Today: ${e.title}`,
        body: `Scheduled ${e.type || "event"} for today`, time: "Today", unread: true,
        icon: "calendar", action: () => setScreen("calendar"), actionLabel: "View calendar",
      });
    } else if (e.date === tomorrow) {
      reminders.push({
        id: `cal-tom-${e.id}`, category: "Calendar", title: `Tomorrow: ${e.title}`,
        body: `Scheduled ${e.type || "event"} for tomorrow`, time: "Tomorrow", unread: false,
        icon: "calendar", action: () => setScreen("calendar"), actionLabel: "View calendar",
      });
    }
  });

  const incompleteHabits = habits.filter((h) => h.done < h.goal);
  if (incompleteHabits.length > 0) {
    reminders.push({
      id: "habit-incomplete", category: "Habit",
      title: `${incompleteHabits.length} habit${incompleteHabits.length > 1 ? "s" : ""} to complete`,
      body: incompleteHabits.slice(0, 3).map((h) => h.name).join(", ") + (incompleteHabits.length > 3 ? ` +${incompleteHabits.length - 3} more` : ""),
      time: "Today", unread: true, icon: "habit",
      action: () => setScreen("habits"), actionLabel: "Complete habits",
    });
  }

  borrowLend.forEach((b) => {
    if (!b.dueDate) return;
    const remaining = b.amount - b.paid;
    if (remaining <= 0) return;
    if (b.dueDate === today) {
      reminders.push({
        id: `bl-due-today-${b.id}`, category: "Borrow",
        title: `Due today: ₹${remaining} ${b.type === "lent" ? "from" : "to"} ${b.person}`,
        body: b.type === "lent" ? "Money you lent is due today — follow up!" : "Money you borrowed is due today — settle it!",
        time: "Today", unread: true, icon: "borrow",
        action: () => setScreen("borrow"), actionLabel: "View borrow/lend",
      });
    } else if (b.dueDate === tomorrow) {
      reminders.push({
        id: `bl-due-tom-${b.id}`, category: "Borrow",
        title: `Due tomorrow: ₹${remaining} ${b.type === "lent" ? "from" : "to"} ${b.person}`,
        body: `Settle this ${b.type} by tomorrow`, time: "Tomorrow", unread: false, icon: "borrow",
        action: () => setScreen("borrow"), actionLabel: "View",
      });
    } else if (b.dueDate <= inThreeDays && b.dueDate > today) {
      reminders.push({
        id: `bl-due-soon-${b.id}`, category: "Borrow",
        title: `Due in 3 days: ₹${remaining} ${b.type === "lent" ? "from" : "to"} ${b.person}`,
        body: `Settlement due on ${new Date(b.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        time: "3 days", unread: false, icon: "borrow",
        action: () => setScreen("borrow"), actionLabel: "View",
      });
    }
  });

  const monthlyBudget = typeof window !== "undefined"
    ? (() => {
        const saved = localStorage.getItem("trackly-monthly-budget");
        if (saved) { const n = parseInt(saved, 10); if (!Number.isNaN(n) && n > 0) return n; }
        return 30000;
      })()
    : 30000;
  if (monthlyBudget > 0 && monthSpending > monthlyBudget * 0.8) {
    const pct = Math.round((monthSpending / monthlyBudget) * 100);
    const overBudget = monthSpending > monthlyBudget;
    reminders.push({
      id: "budget-warning", category: "Budget",
      title: overBudget ? `Budget exceeded by ₹${(monthSpending - monthlyBudget).toLocaleString("en-IN")}` : `${pct}% of budget used`,
      body: overBudget
        ? `You've spent ₹${monthSpending.toLocaleString("en-IN")} of your ₹${monthlyBudget.toLocaleString("en-IN")} budget`
        : `₹${(monthlyBudget - monthSpending).toLocaleString("en-IN")} left this month. Spend wisely!`,
      time: "Today", unread: true, icon: "budget",
      action: () => setScreen("reports"), actionLabel: "View reports",
    });
  }

  if (todaySpending > 0) {
    reminders.push({
      id: "today-spending", category: "Budget",
      title: `Spent ₹${todaySpending.toLocaleString("en-IN")} today`,
      body: "Tap to see breakdown in Dashboard", time: "Today", unread: false,
      icon: "budget", action: () => setScreen("dashboard"), actionLabel: "View dashboard",
    });
  }

  const unreadAdminCount = adminNotifs.filter((n) => !n.read).length;
  const totalUnread = unreadAdminCount + reminders.filter((r) => r.unread).length;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Notifications"
        subtitle={totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
        onBack={() => setScreen("dashboard")}
        right={
          // Only show "Mark all" when there are ADMIN notifications to clear —
          // smart reminders (habits/budget) stay "unread" until actually resolved,
          // so the button would otherwise do nothing and look broken.
          unreadAdminCount > 0 ? (
            <motion.button whileTap={{ scale: 0.9 }} onClick={markAllAdminRead} className="px-3 h-9 rounded-full bg-muted flex items-center text-[12px] font-medium">
              Mark all
            </motion.button>
          ) : undefined
        }
      />

      {/* ===== Admin-sent notifications (live from Supabase) ===== */}
      {loadingAdmin ? (
        <div className="px-5 mt-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Megaphone size={11} className="text-muted-foreground" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">From Admin</p>
          </div>
          <Card className="animate-pulse"><div className="h-16" /></Card>
        </div>
      ) : adminNotifs.length > 0 ? (
        <div className="px-5 mt-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Megaphone size={11} className="text-muted-foreground" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">From Admin</p>
            {unreadAdminCount > 0 && (
              <span className="ml-auto text-[10px] bg-foreground text-background px-1.5 py-0.5 rounded-full font-semibold">
                {unreadAdminCount} new
              </span>
            )}
          </div>
          <div className="space-y-2">
            {adminNotifs.map((n) => (
              <motion.div key={n.id} layout whileTap={{ scale: 0.985 }} onClick={() => !n.read && markAdminRead(n.id)}>
                <Card className={n.read ? "bg-muted/40" : "bg-foreground text-background"}>
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${n.read ? "bg-muted" : "bg-background/20"}`}>
                      <Megaphone size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold">{n.title}</p>
                        {!n.read && <div className="h-2 w-2 rounded-full bg-foreground shrink-0" />}
                      </div>
                      <p className="text-[13px] opacity-80 mt-0.5 leading-snug">{n.body}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] opacity-70">
                          {n.sentAt ? new Date(n.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Recently"}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider opacity-70 bg-background/20 px-1.5 py-0.5 rounded font-medium">{n.target}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ===== Smart reminders from real user data ===== */}
      {reminders.length > 0 && (
        <div className="px-5 mt-6">
          <div className="flex items-center gap-1.5 mb-2">
            <Bell size={11} className="text-muted-foreground" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Reminders</p>
          </div>
          <div className="space-y-2">
            {reminders.map((r) => {
              const Icon = iconMap[r.icon] || Bell;
              return (
                <motion.div key={r.id} layout whileTap={{ scale: 0.985 }} onClick={() => r.action?.()}>
                  <Card className={r.unread ? "border-foreground/30" : ""}>
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${categoryColors[r.category] ?? "bg-muted"}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold">{r.title}</p>
                          {r.unread && <div className="h-2 w-2 rounded-full bg-foreground shrink-0" />}
                        </div>
                        <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{r.body}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-muted-foreground">{r.time}</span>
                          <span className="text-[10px] uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded font-medium">{r.category}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {adminNotifs.length === 0 && reminders.length === 0 && !loadingAdmin && (
        <div className="px-5 mt-6">
          <EmptyState
            icon={<Bell size={20} className="text-muted-foreground" />}
            title="No notifications"
            description="You're all caught up. New alerts will appear here."
          />
        </div>
      )}
    </div>
  );
}
