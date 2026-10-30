"use client";

import { create } from "zustand";

export type AdminScreen =
  | "dashboard"
  | "users"
  | "subscriptions"
  | "features"
  | "config"
  | "notifications"
  | "content"
  | "analytics"
  | "support"
  | "reports"
  | "security"
  | "integrations"
  | "settings";

interface AdminStore {
  screen: AdminScreen;
  setScreen: (s: AdminScreen) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  screen: "dashboard",
  setScreen: (s) => set({ screen: s, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
