"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Currency = {
  code: string;
  symbol: string;
  name: string;
  locale: string;
};

export const CURRENCIES: Currency[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "en-IE" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", locale: "de-CH" },
  { code: "THB", symbol: "฿", name: "Thai Baht", locale: "th-TH" },
  { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
  { code: "MXN", symbol: "$", name: "Mexican Peso", locale: "es-MX" },
];

export type Country = {
  code: string;
  name: string;
  flag: string;
  currencyCode: string;
};

export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", flag: "🇮🇳", currencyCode: "INR" },
  { code: "US", name: "United States", flag: "🇺🇸", currencyCode: "USD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currencyCode: "GBP" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currencyCode: "AED" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currencyCode: "AUD" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currencyCode: "CAD" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", currencyCode: "SGD" },
  { code: "JP", name: "Japan", flag: "🇯🇵", currencyCode: "JPY" },
  { code: "CN", name: "China", flag: "🇨🇳", currencyCode: "CNY" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", currencyCode: "CHF" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", currencyCode: "THB" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currencyCode: "EUR" },
  { code: "FR", name: "France", flag: "🇫🇷", currencyCode: "EUR" },
  { code: "IT", name: "Italy", flag: "🇮🇹", currencyCode: "EUR" },
  { code: "ES", name: "Spain", flag: "🇪🇸", currencyCode: "EUR" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", currencyCode: "EUR" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", currencyCode: "ZAR" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", currencyCode: "BRL" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", currencyCode: "MXN" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", currencyCode: "AUD" },
];

export function getCurrencyByCode(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export type TripMode = "none" | "national" | "international";

export type Language = {
  code: string;
  name: string;
  native: string;
};

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ar", name: "Arabic", native: "العربية" },
];

// ===== Trip History Entry =====
export interface TripHistoryEntry {
  id: string;
  mode: TripMode;
  destination: string;
  countryCode: string;
  flag: string;
  startedAt: string;
  endedAt: string;
  durationDays: number;
  currencyCode: string;
  currencySymbol: string;
  totalSpent: number;
  totalIncome: number;
  expenseCount: number;
  incomeCount: number;
  shoppingCount: number;
  borrowLendCount: number;
  // Full data for viewing
  expenses: any[];
  incomes: any[];
  shopping: any[];
  borrowLend: any[];
}

// ===== Student History Entry =====
export interface StudentHistoryEntry {
  id: string;
  startedAt: string;
  endedAt: string;
  durationDays: number;
  totalSpent: number;
  totalIncome: number;
  expenseCount: number;
  incomeCount: number;
  shoppingCount: number;
  borrowLendCount: number;
  expenses: any[];
  incomes: any[];
  shopping: any[];
  borrowLend: any[];
}

export interface OfficeHistoryEntry {
  id: string;
  startedAt: string;
  endedAt: string;
  durationDays: number;
  totalSpent: number;
  expenseCount: number;
  tasksCompleted: number;
  expenses: any[];
}

interface SettingsState {
  // User Profile
  userName: string;
  userEmail: string;
  userPhone: string;
  userAvatar: string;
  userAvatarUrl: string | null;
  userPlan: string;
  userMemberSince: string;
  userBio: string;
  userBirthday: string;
  userCountry: string;
  userNotifications: boolean;

  // Appearance
  language: string;
  appIcon: string;

  // Currency
  currency: Currency;

  // Trip Mode
  tripMode: TripMode;
  tripDestination: string;
  tripCountry: string;
  tripStartedAt: string | null;
  preTripCurrency: Currency | null;

  // Trip History (persisted)
  tripHistory: TripHistoryEntry[];

  // Quick Add
  backTapAction: boolean;
  homeWidget: boolean;
  voiceInput: boolean;

  // Platform Integration
  biometricLock: boolean;
  cloudSync: boolean;
  voiceAssistant: boolean;
  hapticFeedback: boolean;
  ocr: boolean;

  // Data
  autoBackup: boolean;

  // Student Mode
  studentMode: boolean;
  studentStartedAt: string | null;
  studentHistory: StudentHistoryEntry[];
  studentPaused: boolean; // when true, student mode is active but user is viewing normal mode

  // Office Mode
  officeMode: boolean;
  officeStartedAt: string | null;
  officeHistory: OfficeHistoryEntry[];
  officePaused: boolean;

  // Actions
  setLanguage: (code: string) => void;
  setUserProfile: (name: string, email: string, avatar: string, phone?: string, bio?: string, birthday?: string, country?: string, avatarUrl?: string | null) => void;
  setAppIcon: (icon: string) => void;
  setCurrency: (c: Currency) => void;
  setTripMode: (t: TripMode) => void;
  setTripDestination: (d: string) => void;
  startTrip: (mode: TripMode, destination: string, countryCode?: string) => void;
  endTrip: () => void;
  saveTripToHistory: (entry: Omit<TripHistoryEntry, "id">) => void;
  deleteTripHistory: (id: string) => void;
  clearTripHistory: () => void;
  toggle: (key: keyof SettingsState) => void;
  setStudentMode: (enabled: boolean) => void;
  startStudentMode: () => void;
  endStudentMode: () => void;
  pauseStudentMode: () => void;
  resumeStudentMode: () => void;
  startNewStudentSession: () => void;
  saveStudentToHistory: (entry: Omit<StudentHistoryEntry, "id">) => void;
  deleteStudentHistory: (id: string) => void;

  setOfficeMode: (enabled: boolean) => void;
  startOfficeMode: () => void;
  endOfficeMode: () => void;
  pauseOfficeMode: () => void;
  resumeOfficeMode: () => void;
  startNewOfficeSession: () => void;
  saveOfficeToHistory: (entry: Omit<OfficeHistoryEntry, "id">) => void;
  deleteOfficeHistory: (id: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      userName: "",
      userEmail: "",
      userPhone: "",
      userAvatar: "U",
      userAvatarUrl: null,
      userPlan: "",
      userMemberSince: new Date().getFullYear().toString(),
      userBio: "",
      userBirthday: "",
      userCountry: "India",
      userNotifications: true,
      language: "en",
      appIcon: "Default",
      currency: CURRENCIES[0],
      tripMode: "none",
      tripDestination: "",
      tripCountry: "",
      tripStartedAt: null,
      preTripCurrency: null,
      tripHistory: [],
      backTapAction: true,
      homeWidget: true,
      voiceInput: true,
      biometricLock: true,
      cloudSync: true,
      voiceAssistant: true,
      hapticFeedback: true,
      ocr: true,
      autoBackup: true,
      studentMode: false,
      studentStartedAt: null,
      studentHistory: [],
      studentPaused: false,

      officeMode: false,
      officeStartedAt: null,
      officeHistory: [],
      officePaused: false,

      setLanguage: (code) => set({ language: code }),
      setUserProfile: (name, email, avatar, phone, bio, birthday, country, avatarUrl) => set((state) => ({
        userName: name,
        userEmail: email,
        userAvatar: avatar,
        // Explicit avatar edit (letter picker) overrides the Google photo;
        // passing null restores automatic behaviour.
        ...(avatarUrl !== undefined && { userAvatarUrl: avatarUrl }),
        ...(phone !== undefined && { userPhone: phone }),
        ...(bio !== undefined && { userBio: bio }),
        ...(birthday !== undefined && { userBirthday: birthday }),
        ...(country !== undefined && { userCountry: country }),
      })),
      setAppIcon: (icon) => set({ appIcon: icon }),
      setCurrency: (c) => set({ currency: c }),
      setTripMode: (t) => set({ tripMode: t }),
      setTripDestination: (d) => set({ tripDestination: d }),

      startTrip: (mode, destination, countryCode) => {
        const state = get();
        const updates: Partial<SettingsState> = {
          tripMode: mode,
          tripDestination: destination,
          tripStartedAt: new Date().toISOString(),
          preTripCurrency: state.currency,
        };
        if (mode === "international" && countryCode) {
          updates.tripCountry = countryCode;
          const country = getCountryByCode(countryCode);
          if (country) {
            updates.currency = getCurrencyByCode(country.currencyCode);
          }
        }
        set(updates);
      },

      endTrip: () => {
        const state = get();
        const updates: Partial<SettingsState> = {
          tripMode: "none",
          tripDestination: "",
          tripCountry: "",
          tripStartedAt: null,
        };
        if (state.preTripCurrency) {
          updates.currency = state.preTripCurrency;
          updates.preTripCurrency = null;
        }
        set(updates);
      },

      saveTripToHistory: (entry) =>
        set((state) => ({
          tripHistory: [
            { ...entry, id: `trip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
            ...state.tripHistory,
          ],
        })),

      deleteTripHistory: (id) =>
        set((state) => ({
          tripHistory: state.tripHistory.filter((t) => t.id !== id),
        })),

      clearTripHistory: () => set({ tripHistory: [] }),

      toggle: (key) => set((state) => ({ [key]: !state[key] } as any)),

      setStudentMode: (enabled) => set({ studentMode: enabled }),

      startStudentMode: () => set({ studentMode: true, studentStartedAt: new Date().toISOString(), studentPaused: false }),

      endStudentMode: () => set({ studentMode: false, studentStartedAt: null, studentPaused: false }),

      pauseStudentMode: () => set({ studentPaused: true }),

      resumeStudentMode: () => set({ studentPaused: false }),

      startNewStudentSession: () => set({ studentMode: true, studentStartedAt: new Date().toISOString(), studentPaused: false }),

      saveStudentToHistory: (entry) =>
        set((state) => ({
          studentHistory: [
            { ...entry, id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
            ...state.studentHistory,
          ],
        })),

      deleteStudentHistory: (id) =>
        set((state) => ({
          studentHistory: state.studentHistory.filter((s) => s.id !== id),
        })),

      setOfficeMode: (enabled) => set({ officeMode: enabled }),
      startOfficeMode: () => set({ officeMode: true, officeStartedAt: new Date().toISOString(), officePaused: false }),
      endOfficeMode: () => set({ officeMode: false, officeStartedAt: null, officePaused: false }),
      pauseOfficeMode: () => set({ officePaused: true }),
      resumeOfficeMode: () => set({ officePaused: false }),
      startNewOfficeSession: () => set({ officeMode: true, officeStartedAt: new Date().toISOString(), officePaused: false }),
      saveOfficeToHistory: (entry) =>
        set((state) => ({
          officeHistory: [
            { ...entry, id: `office-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
            ...state.officeHistory,
          ],
        })),
      deleteOfficeHistory: (id) =>
        set((state) => ({
          officeHistory: state.officeHistory.filter((o) => o.id !== id),
        })),
    }),
    {
      name: "trackly-settings",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as any))),
      // CRITICAL: merge persisted state with new state — this ensures that
      // when Supabase loads fresh data via setState, it OVERWRITES the
      // persisted localStorage values instead of localStorage winning.
      merge: (persistedState: any, currentState: any) => ({
        ...currentState,
        ...persistedState,
      }),
    }
  )
);

export function formatCurrency(amount: number, currency?: Currency): string {
  const cur = currency ?? useSettings.getState().currency;
  return cur.symbol + amount.toLocaleString(cur.locale);
}
