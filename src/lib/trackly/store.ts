"use client";

import { create } from "zustand";
import { useEffect } from "react";

export type ScreenId =
  | "onboarding"
  | "dashboard"
  | "expenses"
  | "shopping"
  | "borrow"
  | "habits"
  | "routine"
  | "notes"
  | "calendar"
  | "reports"
  | "search"
  | "notifications"
  | "settings"
  | "widgets"
  | "medicine"
  | "archive"
  | "trash"
  | "help"
  | "privacy"
  | "invite"
  // Student Mode screens
  | "student-dashboard"
  | "student-mess"
  | "student-hostel"
  | "student-study"
  | "student-assignments"
  | "student-attendance"
  | "student-exams"
  | "student-books"
  | "student-budget"
  | "student-routine"
  | "student-ai"
  // Office Mode screens
  | "office-dashboard"
  | "office-tasks"
  | "office-attendance"
  | "office-salary"
  | "office-calendar"
  | "office-productivity"
  | "office-analytics"
  // Group Expenses screens
  | "groups"
  | "group";

export type TabId = "home" | "money" | "habits" | "notes" | "search" | "profile";

const ONBOARDING_KEY = "trackly-onboarding-complete";

interface TracklyState {
  screen: ScreenId;
  tab: TabId;
  // Which screen opened the Search screen — back button returns there
  searchFrom: ScreenId;
  quickAddOpen: boolean;
  onboardingComplete: boolean;
  hydrated: boolean;
  normalViewOverride: boolean; // when true, always show normal Dashboard (for "Exit Without Saving")
  aiChatMode: "personal" | "student" | "office" | "trip" | null; // null = closed
  unreadNotifCount: number; // unread admin notifications (for bell badge)
  currentGroupId: string | null; // open group detail screen
  setScreen: (s: ScreenId) => void;
  setTab: (t: TabId) => void;
  openGroup: (groupId: string) => void;
  // Open the full Search screen, remembering where it was opened from
  openSearch: (from: ScreenId) => void;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  hydrate: () => void;
  setNormalViewOverride: (v: boolean) => void;
  openAIChat: (mode: "personal" | "student" | "office" | "trip") => void;
  closeAIChat: () => void;
  setAIChatMode: (mode: "personal" | "student" | "office" | "trip") => void;
  setUnreadNotifCount: (n: number) => void;
}

export const useTracklyStore = create<TracklyState>((set, get) => ({
  screen: "onboarding",
  tab: "home",
  searchFrom: "dashboard",
  quickAddOpen: false,
  onboardingComplete: false,
  hydrated: false,
  normalViewOverride: false,
  aiChatMode: null,
  unreadNotifCount: 0,
  currentGroupId: null,
  setScreen: (s) => set({ screen: s, normalViewOverride: false }),
  openGroup: (groupId) => set({ currentGroupId: groupId, screen: "group", normalViewOverride: false }),
  setTab: (t) => {
    const screenMap: Record<TabId, ScreenId> = {
      home: "dashboard",
      money: "expenses",
      habits: "habits",
      notes: "notes",
      search: "search",
      profile: "settings",
    };
    // Entering Search via its tab: remember the screen we came from so the
    // back button returns the user where they were (e.g. Money → Search → Money)
    const prevScreen = get().screen;
    set({
      tab: t,
      screen: screenMap[t],
      normalViewOverride: false,
      ...(t === "search" && prevScreen !== "search" ? { searchFrom: prevScreen } : {}),
    });
  },
  openSearch: (from) => set({ screen: "search", searchFrom: from, normalViewOverride: false }),
  openQuickAdd: () => set({ quickAddOpen: true }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
  completeOnboarding: () => {
    if (typeof window !== "undefined") localStorage.setItem(ONBOARDING_KEY, "1");
    set({ onboardingComplete: true, screen: "dashboard", tab: "home" });
  },
  resetOnboarding: () => {
    if (typeof window !== "undefined") localStorage.removeItem(ONBOARDING_KEY);
    set({ onboardingComplete: false, screen: "onboarding" });
  },
  setNormalViewOverride: (v) => set({ normalViewOverride: v }),
  openAIChat: (mode) => {
    if (typeof window !== "undefined") localStorage.setItem("trackly-ai-last-mode", mode);
    set({ aiChatMode: mode });
  },
  closeAIChat: () => set({ aiChatMode: null }),
  setAIChatMode: (mode) => {
    if (typeof window !== "undefined") localStorage.setItem("trackly-ai-last-mode", mode);
    set({ aiChatMode: mode });
  },
  setUnreadNotifCount: (n) => set({ unreadNotifCount: n }),
  hydrate: () => {
    if (typeof window === "undefined") return;
    const complete = localStorage.getItem(ONBOARDING_KEY) === "1";
    set({
      onboardingComplete: complete,
      screen: complete ? "dashboard" : "onboarding",
      hydrated: true,
    });
  },
}));

// Hook to ensure hydration on client side
export function useHydrateStore() {
  const hydrate = useTracklyStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
