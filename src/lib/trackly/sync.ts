"use client";

import { create } from "zustand";

export interface SyncedFeatureFlag {
  key: string;
  name: string;
  enabled: boolean;
  rolloutPercent: number;
}

export interface SyncedConfig {
  maintenance_mode?: boolean;
  min_app_version?: string;
  force_update_version?: string;
  announcement_banner?: { text: string; active: boolean };
  welcome_popup?: { title: string; body: string; active: boolean };
  default_currency?: string;
  default_language?: string;
  default_categories?: string[];
  default_reminders?: string[];
  feature_rollout_percent?: number;

  // ===== Help & Support (admin-editable) =====
  support_email?: string;
  support_phone?: string;
  support_response_time?: string;
  help_intro_en?: string;
  help_intro_hi?: string;
  help_website?: string;
  help_response_hours?: number;

  // ===== Social handles (admin-editable) =====
  social_instagram?: string;
  social_twitter?: string;
  social_youtube?: string;
  social_facebook?: string;

  // ===== App meta (admin-editable) =====
  app_version?: string;
  app_name?: string;
  company_name?: string;
  company_address?: string;
  company_website?: string;
  privacy_updated_at?: string;
  terms_updated_at?: string;

  // ===== What's New (admin-editable changelog popup) =====
  whats_new?: {
    version: string;
    title: string;
    active: boolean;
    items: string[];
    updated_at?: string;
  };
}

export interface SyncedNotification {
  id: string;
  title: string;
  body: string;
  sentAt: string | null;
  target: string;
}

export interface SyncedPlan {
  id: string;
  name: string;
  tier: string;
  billingPeriod: string;
  priceCents: number;
  currency: string;
  features: string[];
  trialDays: number;
}

export interface SyncedCoupon {
  code: string;
  discountPercent: number;
  expiresAt: string | null;
}

interface SyncState {
  featureFlags: SyncedFeatureFlag[];
  config: SyncedConfig;
  settings: Record<string, string>;
  content: Record<string, any[]>;
  notifications: SyncedNotification[];
  plans: SyncedPlan[];
  coupons: SyncedCoupon[];
  categories: string[];
  referralLink: string;
  lastSyncedAt: string | null;
  syncing: boolean;
  syncError: string | null;
  demoMode: boolean;

  sync: () => Promise<void>;
  isFeatureEnabled: (key: string) => boolean;
  setDemoData: (data: Partial<Omit<SyncState, "sync" | "isFeatureEnabled" | "setDemoData">>) => void;
}

const FALLBACK_CATEGORIES = ["Food", "Fuel", "Rent", "EMI", "Shopping", "Bills", "Travel", "Entertainment", "Healthcare", "Education", "Others"];

export const useSync = create<SyncState>((set, get) => ({
  featureFlags: [],
  config: {},
  settings: {},
  content: {},
  notifications: [],
  plans: [],
  coupons: [],
  categories: FALLBACK_CATEGORIES,
  referralLink: "https://trackly.app",
  lastSyncedAt: null,
  syncing: false,
  syncError: null,
  demoMode: false,

  sync: async () => {
    if (get().demoMode) return;
    if (get().syncing) return;
    set({ syncing: true, syncError: null });
    try {
      const res = await fetch("/api/public/sync");
      if (!res.ok) throw new Error(`Sync failed (${res.status})`);
      const data = await res.json();

      // Pre-compute categories from content
      const cats = data.content?.["CATEGORY"]
        ? data.content["CATEGORY"].map((c: any) => c.title)
        : data.config?.default_categories ?? FALLBACK_CATEGORIES;

      set({
        featureFlags: data.featureFlags ?? [],
        config: data.config ?? {},
        settings: data.settings ?? {},
        content: data.content ?? {},
        notifications: data.notifications ?? [],
        plans: data.plans ?? [],
        coupons: data.coupons ?? [],
        categories: cats,
        referralLink: data.settings?.website_referral_link ?? "https://trackly.app",
        lastSyncedAt: data.syncedAt ?? new Date().toISOString(),
        syncing: false,
      });
    } catch (e: any) {
      set({ syncing: false, syncError: e.message });
    }
  },

  isFeatureEnabled: (key: string) => {
    const flags = get().featureFlags;
    const flag = flags.find((f) => f.key === key);
    if (!flag) return true;
    return flag.enabled;
  },

  setDemoData: (data) => {
    set({
      ...data,
      demoMode: true,
      syncing: false,
      syncError: null,
      lastSyncedAt: new Date().toISOString(),
    });
  },
}));
