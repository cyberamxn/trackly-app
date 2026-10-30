"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useAuth } from "./auth";
import { useAppData } from "@/lib/trackly/appData";
import { useSettings } from "@/lib/trackly/settings";
import { useOfficeData } from "@/lib/trackly/officeData";
import { useStudentData } from "@/lib/trackly/studentData";
import { supabase } from "./client";
import { isDataLoaded, subscribeToDataLoaded } from "./dataLoadState";
import { mirrorUserCache } from "./localCache";
import { isRefPending, activateReferral } from "@/lib/referrals/client";
import { toast } from "sonner";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * AutoSaveHook — watches all app data stores and automatically saves
 * changes to Supabase (per-user). Uses a debounce to avoid too many writes.
 *
 * CRITICAL: Will NOT save until isDataLoaded() returns true.
 * This prevents overwriting cloud data with empty/defaults during login.
 */
const DEBOUNCE_MS = 2000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1500, 4000, 10000];

async function withRetry<T>(
  operation: () => Promise<{ error: PostgrestError | null }>,
  label: string
): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { error } = await operation();
    if (!error) return;
    const code = (error as PostgrestError).code;
    if (code === "42501" || code === "PGRST301" || code === "JWT") {
      console.error(`[AutoSave:${label}] Auth/RLS error — not retrying:`, error.message);
      return;
    }
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt] ?? 10000;
      console.warn(`[AutoSave:${label}] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      await new Promise((r) => setTimeout(r, delay));
    } else {
      console.error(`[AutoSave:${label}] All ${MAX_RETRIES + 1} attempts failed:`, error.message);
    }
  }
}

/**
 * buildSettingsJson — settings ka complete JSON banata hai.
 * lastActiveAt har save par fresh inject hota hai — admin panel isko
 * real-time "Last Active" ke liye use karta hai (Supabase auth ka
 * last_sign_in_at sirf naye LOGIN par update hota hai, session-based
 * app open me wo stale rehta hai).
 */
function buildSettingsJson(): Record<string, any> {
  const settings = useSettings.getState();
  const appData = useAppData.getState();
  return {
    lastActiveAt: new Date().toISOString(),
    userName: settings.userName, userEmail: settings.userEmail, userPhone: settings.userPhone,
    userAvatar: settings.userAvatar, userBio: settings.userBio, userBirthday: settings.userBirthday,
    userCountry: settings.userCountry, userPlan: settings.userPlan,
    userMemberSince: settings.userMemberSince, userNotifications: settings.userNotifications,
    language: settings.language, appIcon: settings.appIcon, currency: settings.currency,
    studentMode: settings.studentMode, officeMode: settings.officeMode,
    studentStartedAt: settings.studentStartedAt, officeStartedAt: settings.officeStartedAt,
    studentPaused: settings.studentPaused, officePaused: settings.officePaused,
    tripMode: settings.tripMode, tripDestination: settings.tripDestination,
    tripCountry: settings.tripCountry, tripStartedAt: settings.tripStartedAt,
    preTripCurrency: settings.preTripCurrency,
    backTapAction: settings.backTapAction, homeWidget: settings.homeWidget,
    voiceInput: settings.voiceInput, biometricLock: settings.biometricLock,
    cloudSync: settings.cloudSync, voiceAssistant: settings.voiceAssistant,
    hapticFeedback: settings.hapticFeedback, ocr: settings.ocr, autoBackup: settings.autoBackup,
    tripHistory: settings.tripHistory, studentHistory: settings.studentHistory,
    officeHistory: settings.officeHistory,
    tripSnapshot: appData.tripSnapshot, studentSnapshot: appData.studentSnapshot,
  };
}

export function AutoSaveHook() {
  const { user } = useAuth();
  const userId = user?.id;
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dataLoaded = useSyncExternalStore(
    subscribeToDataLoaded,
    isDataLoaded,
    () => false
  );

  // ===== CRITICAL DATA-LOSS GUARD (engine 24) =====
  // Student/Trip modes RESET appData's money arrays to [] (snapshot kept in
  // memory). Without this guard, autoSave would push that empty array to the
  // cloud (delete-all + insert-nothing) and WIPE the user's personal data.
  // If the in-memory snapshot is later lost (reload/crash), the data would be
  // gone forever. So while ANY mode/snapshot is active, the money tables are
  // NEVER synced — the cloud keeps the personal data safe.
  const studentModeOn = useSettings((s) => !!s.studentMode);
  // NOTE: tripMode is "none" | "national" | "international" — a plain truthy
  // check is ALWAYS true ("none" is a non-empty string) and would block every
  // user's money sync forever. Compare against "none" explicitly.
  const tripModeOn = useSettings((s) => !!s.tripMode && s.tripMode !== "none");
  const snapshotActive = useAppData((s) => !!(s.studentSnapshot || s.tripSnapshot || s.modeBackup));
  const moneySyncBlocked = studentModeOn || tripModeOn || snapshotActive;

  // ===== Local mirror — ALWAYS keep a fresh localStorage copy of the main
  // arrays so data survives reloads even when Supabase writes fail.
  // Runs independently of the Supabase saves below.
  const mExpenses = useAppData((s) => s.expenses);
  const mIncomes = useAppData((s) => s.incomes);
  const mShopping = useAppData((s) => s.shopping);
  const mBorrowLend = useAppData((s) => s.borrowLend);
  const mHabits = useAppData((s) => s.habits);
  const mNotes = useAppData((s) => s.notes);
  const mCalendar = useAppData((s) => s.calendarEvents);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (timersRef.current.mirror) clearTimeout(timersRef.current.mirror);
    timersRef.current.mirror = setTimeout(() => {
      mirrorUserCache(userId);
    }, 600);
  }, [mExpenses, mIncomes, mShopping, mBorrowLend, mHabits, mNotes, mCalendar, userId, dataLoaded]);

  // ===== Expenses =====
  const expenses = useAppData((s) => s.expenses);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (moneySyncBlocked) {
      if (timersRef.current.expenses) clearTimeout(timersRef.current.expenses);
      return;
    }
    if (timersRef.current.expenses) clearTimeout(timersRef.current.expenses);
    timersRef.current.expenses = setTimeout(async () => {
      await withRetry(async () => {
        await supabase.from("expenses").delete().eq("user_id", userId);
        const rows = expenses.map((e) => ({
          user_id: userId, title: e.title, merchant: e.merchant, amount: e.amount,
          category: e.category, method: e.method, date: e.date, time: e.time,
          notes: e.notes ?? "", tags: e.tags ?? [],
        }));
        if (rows.length > 0) return await supabase.from("expenses").insert(rows);
        return { error: null };
      }, "expenses");
    }, DEBOUNCE_MS);
  }, [expenses, userId, dataLoaded, moneySyncBlocked]);

  // ===== Incomes =====
  const incomes = useAppData((s) => s.incomes);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (moneySyncBlocked) {
      if (timersRef.current.incomes) clearTimeout(timersRef.current.incomes);
      return;
    }
    if (timersRef.current.incomes) clearTimeout(timersRef.current.incomes);
    timersRef.current.incomes = setTimeout(async () => {
      await withRetry(async () => {
        await supabase.from("incomes").delete().eq("user_id", userId);
        const rows = incomes.map((i) => ({ user_id: userId, source: i.source, amount: i.amount, date: i.date, method: i.method }));
        if (rows.length > 0) return await supabase.from("incomes").insert(rows);
        return { error: null };
      }, "incomes");
    }, DEBOUNCE_MS);
  }, [incomes, userId, dataLoaded, moneySyncBlocked]);

  // ===== Shopping =====
  const shopping = useAppData((s) => s.shopping);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (moneySyncBlocked) {
      if (timersRef.current.shopping) clearTimeout(timersRef.current.shopping);
      return;
    }
    if (timersRef.current.shopping) clearTimeout(timersRef.current.shopping);
    timersRef.current.shopping = setTimeout(async () => {
      await withRetry(async () => {
        await supabase.from("shopping").delete().eq("user_id", userId);
        const rows = shopping.map((s) => ({
          user_id: userId, name: s.name, store: s.store ?? "", price: s.price, status: s.status,
          has_bill: s.hasBill ?? false, warranty: s.warranty ?? null, return_deadline: s.returnDeadline ?? null,
        }));
        if (rows.length > 0) return await supabase.from("shopping").insert(rows);
        return { error: null };
      }, "shopping");
    }, DEBOUNCE_MS);
  }, [shopping, userId, dataLoaded, moneySyncBlocked]);

  // ===== Borrow/Lend =====
  const borrowLend = useAppData((s) => s.borrowLend);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (moneySyncBlocked) {
      if (timersRef.current.borrowLend) clearTimeout(timersRef.current.borrowLend);
      return;
    }
    if (timersRef.current.borrowLend) clearTimeout(timersRef.current.borrowLend);
    timersRef.current.borrowLend = setTimeout(async () => {
      await withRetry(async () => {
        await supabase.from("borrow_lend").delete().eq("user_id", userId);
        const rows = borrowLend.map((b) => ({
          user_id: userId, person: b.person, type: b.type, amount: b.amount, paid: b.paid,
          due_date: b.dueDate ?? null, note: b.note ?? null,
          reason: (b as any).reason ?? null, payment_method: (b as any).paymentMethod ?? null, date: (b as any).date ?? null,
        }));
        if (rows.length > 0) return await supabase.from("borrow_lend").insert(rows);
        return { error: null };
      }, "borrow_lend");
    }, DEBOUNCE_MS);
  }, [borrowLend, userId, dataLoaded, moneySyncBlocked]);

  // ===== Habits =====
  const habits = useAppData((s) => s.habits);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (timersRef.current.habits) clearTimeout(timersRef.current.habits);
    timersRef.current.habits = setTimeout(async () => {
      await withRetry(async () => {
        await supabase.from("habits").delete().eq("user_id", userId);
        const rows = habits.map((h) => ({
          user_id: userId, name: h.name, icon: h.icon, streak: h.streak, goal: h.goal,
          done: h.done, unit: h.unit, history: h.history ?? [],
        }));
        if (rows.length > 0) return await supabase.from("habits").insert(rows);
        return { error: null };
      }, "habits");
    }, DEBOUNCE_MS);
  }, [habits, userId, dataLoaded]);

  // ===== Notes =====
  const notes = useAppData((s) => s.notes);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (timersRef.current.notes) clearTimeout(timersRef.current.notes);
    timersRef.current.notes = setTimeout(async () => {
      await withRetry(async () => {
        await supabase.from("notes").delete().eq("user_id", userId);
        const rows = notes.map((n) => ({
          user_id: userId, title: n.title, preview: n.preview ?? "",
          body: (n as any).body ?? "", pinned: n.pinned ?? false, tags: n.tags ?? [],
          color: (n as any).color ?? null,
        }));
        if (rows.length > 0) return await supabase.from("notes").insert(rows);
        return { error: null };
      }, "notes");
    }, DEBOUNCE_MS);
  }, [notes, userId, dataLoaded]);

  // ===== Calendar Events =====
  const calendarEvents = useAppData((s) => s.calendarEvents);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (timersRef.current.calendar) clearTimeout(timersRef.current.calendar);
    timersRef.current.calendar = setTimeout(async () => {
      await withRetry(async () => {
        await supabase.from("calendar_events").delete().eq("user_id", userId);
        const rows = calendarEvents.map((c) => ({ user_id: userId, title: c.title, date: c.date, type: c.type }));
        if (rows.length > 0) return await supabase.from("calendar_events").insert(rows);
        return { error: null };
      }, "calendar_events");
    }, DEBOUNCE_MS);
  }, [calendarEvents, userId, dataLoaded]);

  // ===== Settings (JSONB — ALL settings + snapshots) =====
  const studentMode = useSettings((s) => s.studentMode);
  const officeMode = useSettings((s) => s.officeMode);
  const language = useSettings((s) => s.language);
  const currencyCode = useSettings((s) => s.currency.code);
  const userName = useSettings((s) => s.userName);
  const userEmail = useSettings((s) => s.userEmail);
  const tripMode = useSettings((s) => s.tripMode);
  const tripDestination = useSettings((s) => s.tripDestination);
  const tripStartedAt = useSettings((s) => s.tripStartedAt);
  const tripHistory = useSettings((s) => s.tripHistory);
  const studentHistory = useSettings((s) => s.studentHistory);
  const officeHistory = useSettings((s) => s.officeHistory);
  const studentPaused = useSettings((s) => s.studentPaused);
  const officePaused = useSettings((s) => s.officePaused);
  const studentStartedAt = useSettings((s) => s.studentStartedAt);
  const officeStartedAt = useSettings((s) => s.officeStartedAt);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (timersRef.current.settings) clearTimeout(timersRef.current.settings);
    timersRef.current.settings = setTimeout(async () => {
      const settingsJson = buildSettingsJson();
      await withRetry(async () => {
        return await supabase.from("user_settings").upsert({
          user_id: userId, settings: settingsJson, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }, "user_settings");
    }, DEBOUNCE_MS);
  }, [userId, dataLoaded, studentMode, officeMode, language, currencyCode, userName, userEmail, tripMode, tripDestination, tripStartedAt, tripHistory, studentHistory, officeHistory, studentPaused, officePaused, studentStartedAt, officeStartedAt]);

  // ===== Watch appData snapshots (trip/student mode) — trigger settings save =====
  const tripSnapshot = useAppData((s) => s.tripSnapshot);
  const studentSnapshot = useAppData((s) => s.studentSnapshot);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (timersRef.current.settings) clearTimeout(timersRef.current.settings);
    timersRef.current.settings = setTimeout(async () => {
      const settingsJson = buildSettingsJson();
      await withRetry(async () => {
        return await supabase.from("user_settings").upsert({
          user_id: userId, settings: settingsJson, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }, "user_settings_snapshot");
    }, DEBOUNCE_MS);
  }, [userId, dataLoaded, tripSnapshot, studentSnapshot]);

  // ===== Last-active heartbeat =====
  // App open par immediate + phir har ~4 min par user_settings.lastActiveAt
  // refresh karta hai (60s interval me throttled check). Tab visibility wapas
  // aane par bhi touch. Admin panel "Last Active" / "Active Users" isi par
  // chalte hain — real-time activity, sirf sign-in nahi.
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    let alive = true;
    let lastTouchAt = 0;
    const TOUCH_THROTTLE = 4 * 60 * 1000;
    const touch = async () => {
      if (!alive) return;
      const now = Date.now();
      if (now - lastTouchAt < TOUCH_THROTTLE) return;
      lastTouchAt = now;
      const settingsJson = buildSettingsJson();
      await withRetry(async () => {
        return await supabase.from("user_settings").upsert({
          user_id: userId, settings: settingsJson, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }, "last_active");
    };
    touch();
    const iv = setInterval(touch, 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") touch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, dataLoaded]);

  // ===== Office Data =====
  const officeTasks = useOfficeData((s) => s.tasks);
  const officeMeetings = useOfficeData((s) => s.meetings);
  const officeAttendance = useOfficeData((s) => s.attendance);
  const officeSalary = useOfficeData((s) => s.salary);
  const officeBills = useOfficeData((s) => s.bills);
  const officeGoals = useOfficeData((s) => s.savingsGoals);
  const officeDaily = useOfficeData((s) => s.dailyGoals);
  const officePomodoros = useOfficeData((s) => s.pomodoros);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (timersRef.current.office) clearTimeout(timersRef.current.office);
    timersRef.current.office = setTimeout(async () => {
      const office = useOfficeData.getState();
      await withRetry(async () => {
        return await supabase.from("office_data").upsert({
          user_id: userId, tasks: office.tasks, meetings: office.meetings,
          attendance: office.attendance, salary: office.salary, bills: office.bills,
          savings_goals: office.savingsGoals, daily_goals: office.dailyGoals,
          pomodoros: office.pomodoros, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }, "office_data");
    }, DEBOUNCE_MS);
  }, [userId, dataLoaded, officeTasks, officeMeetings, officeAttendance, officeSalary, officeBills, officeGoals, officeDaily, officePomodoros]);

  // ===== Student Data =====
  const studentSubjects = useStudentData((s) => s.subjects);
  const studentAssignments = useStudentData((s) => s.assignments);
  const studentExams = useStudentData((s) => s.exams);
  const studentBooks = useStudentData((s) => s.books);
  const studentClasses = useStudentData((s) => s.classes);
  const studentMessMeals = useStudentData((s) => s.messMeals);
  const studentHostelBills = useStudentData((s) => s.hostelBills);
  const studentStudyGoals = useStudentData((s) => s.studyGoals);
  const studentRoutine = useStudentData((s) => s.routine);
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    if (timersRef.current.student) clearTimeout(timersRef.current.student);
    timersRef.current.student = setTimeout(async () => {
      const student = useStudentData.getState();
      await withRetry(async () => {
        return await supabase.from("student_data").upsert({
          user_id: userId, subjects: student.subjects, assignments: student.assignments,
          exams: student.exams, books: student.books, classes: student.classes,
          mess_meals: student.messMeals, hostel_bills: student.hostelBills,
          study_goals: student.studyGoals, routine: student.routine,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }, "student_data");
    }, DEBOUNCE_MS);
  }, [userId, dataLoaded, studentSubjects, studentAssignments, studentExams, studentBooks, studentClasses, studentMessMeals, studentHostelBills, studentStudyGoals, studentRoutine]);

  // ===== Referral activation poller (referee side) =====
  // While a PENDING referral exists, try completing it every 60s — the
  // referee's first real expense/task/note triggers completion without
  // needing an app reload.
  // NOTE: the pending flag is checked INSIDE the interval, not at effect
  // start — the claim runs AFTER dataLoaded flips true (async chain in
  // app/page.tsx), so a start-time gate would never see the flag and the
  // interval would never start (caught in prod UI QA).
  useEffect(() => {
    if (!userId || !dataLoaded) return;
    let alive = true;
    let pendingTicks = 0;
    const tryActivate = async () => {
      if (!alive) return;
      if (!isRefPending()) return; // no pending referral — free no-op tick
      if (++pendingTicks > 30) return; // ~30 min of fetches per session max
      const msg = await activateReferral(true);
      if (msg && alive) toast.success(msg);
    };
    const iv = setInterval(tryActivate, 60_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [userId, dataLoaded]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  return null;
}
