"use client";

import { supabase } from "./client";
import { useAppData } from "@/lib/trackly/appData";
import { useSettings } from "@/lib/trackly/settings";
import { useOfficeData } from "@/lib/trackly/officeData";
import { useStudentData } from "@/lib/trackly/studentData";
import { useTrashStore } from "@/lib/trackly/trash";
import { setDataLoaded } from "./dataLoadState";
import { readUserCache, writeUserCache, clearAllUserCaches, type UserCacheShape } from "./localCache";

/**
 * Loads ALL user data from Supabase into local stores.
 * Falls back to the per-user localStorage cache when a cloud read fails or
 * when the cloud is empty but a newer local copy exists (previous write
 * failed) — so user-added items NEVER silently disappear on reload.
 *
 * CRITICAL: Sets dataLoaded flag at the end so AutoSave can start writing.
 */
export async function loadUserDataFromSupabase(userId: string) {
  // Reset flag at start — blocks autoSave during load
  setDataLoaded(false);
  try {
    console.log("[Trackly] Loading user data from Supabase for:", userId);
    const cache = readUserCache(userId);

    /** cloud read failed → cached copy; cloud empty but cache has items → cached copy */
    const fallback = <T,>(err: unknown | null, cloud: T[], cached: T[] | undefined, key: string): T[] => {
      if (err) {
        console.warn(`[Trackly] ${key} cloud read failed — using local cache:`, (err as any)?.message);
        return cached ?? [];
      }
      if (cloud.length === 0 && cached && cached.length > 0) {
        console.warn(`[Trackly] ${key} empty in cloud but local cache has ${cached.length} — keeping local copy`);
        return cached;
      }
      return cloud;
    };

    // Step 1: Fetch ALL data in parallel — use select() with only needed columns
    const [
      expensesRes,
      incomesRes,
      shoppingRes,
      borrowLendRes,
      habitsRes,
      notesRes,
      calendarRes,
      settingsRes,
      officeRes,
      studentRes,
    ] = await Promise.all([
      supabase.from("expenses").select("id,title,merchant,amount,category,method,date,time,notes,tags").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("incomes").select("id,source,amount,date,method").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("shopping").select("id,name,store,price,status,has_bill,warranty,return_deadline").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("borrow_lend").select("id,person,type,amount,paid,due_date,note,reason,payment_method,date").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("habits").select("id,name,icon,streak,goal,done,unit,history").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("notes").select("id,title,preview,body,pinned,tags").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("calendar_events").select("id,title,date,type").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("user_settings").select("settings").eq("user_id", userId).maybeSingle(),
      supabase.from("office_data").select("tasks,meetings,attendance,salary,bills,savings_goals,daily_goals,pomodoros").eq("user_id", userId).maybeSingle(),
      supabase.from("student_data").select("subjects,assignments,exams,books,classes,mess_meals,hostel_bills,study_goals,routine").eq("user_id", userId).maybeSingle(),
    ]);

    // Step 2: Resolve each collection — cloud data when healthy, cache when not.
    // Cache entries are already app-shaped (camelCase); cloud rows get mapped below.
    const fromCache = <T>(key: keyof UserCacheShape): T[] => (cache?.[key] as T[]) ?? [];

    const expensesSrc = fallback(expensesRes.error, expensesRes.data ?? [], fromCache<any>("expenses"), "expenses");
    const incomesSrc = fallback(incomesRes.error, incomesRes.data ?? [], fromCache<any>("incomes"), "incomes");
    const shoppingSrc = fallback(shoppingRes.error, shoppingRes.data ?? [], fromCache<any>("shopping"), "shopping");
    const borrowLendSrc = fallback(borrowLendRes.error, borrowLendRes.data ?? [], fromCache<any>("borrowLend"), "borrowLend");
    const habitsSrc = fallback(habitsRes.error, habitsRes.data ?? [], fromCache<any>("habits"), "habits");
    const notesSrc = fallback(notesRes.error, notesRes.data ?? [], fromCache<any>("notes"), "notes");
    const calendarSrc = fallback(calendarRes.error, calendarRes.data ?? [], fromCache<any>("calendarEvents"), "calendarEvents");

    // A collection came from cache (already app-shaped) when it has an error OR cloud-empty+cache-nonempty
    const usedCache = (res: { error: unknown | null }, cloud: unknown[], cached: unknown[], key: string) =>
      !!res.error || (cloud.length === 0 && cached.length > 0);

    const expenses = usedCache(expensesRes, expensesRes.data ?? [], fromCache<any>("expenses"), "expenses") ? expensesSrc : expensesSrc.map((e: any) => ({
      id: e.id,
      title: e.title,
      merchant: e.merchant || "",
      amount: e.amount,
      category: e.category,
      method: e.method || "Card",
      date: e.date,
      time: e.time || "",
      notes: e.notes || "",
      tags: e.tags || [],
    }));
    const incomes = usedCache(incomesRes, incomesRes.data ?? [], fromCache<any>("incomes"), "incomes") ? incomesSrc : incomesSrc.map((i: any) => ({
      id: i.id,
      source: i.source,
      amount: i.amount,
      date: i.date,
      method: i.method || "Card",
    }));
    const shopping = usedCache(shoppingRes, shoppingRes.data ?? [], fromCache<any>("shopping"), "shopping") ? shoppingSrc : shoppingSrc.map((s: any) => ({
      id: s.id,
      name: s.name,
      store: s.store || "",
      price: s.price,
      status: s.status,
      hasBill: s.has_bill || false,
      warranty: s.warranty || undefined,
      returnDeadline: s.return_deadline || undefined,
    }));
    const borrowLend = usedCache(borrowLendRes, borrowLendRes.data ?? [], fromCache<any>("borrowLend"), "borrowLend") ? borrowLendSrc : borrowLendSrc.map((b: any) => ({
      id: b.id,
      person: b.person,
      type: b.type,
      amount: b.amount,
      paid: b.paid,
      dueDate: b.due_date || undefined,
      note: b.note || undefined,
      reason: b.reason || undefined,
      paymentMethod: b.payment_method || undefined,
      date: b.date || undefined,
    }));
    const habits = usedCache(habitsRes, habitsRes.data ?? [], fromCache<any>("habits"), "habits") ? habitsSrc : habitsSrc.map((h: any) => ({
      id: h.id,
      name: h.name,
      icon: h.icon || "flame",
      streak: h.streak || 0,
      goal: h.goal || 1,
      done: h.done || 0,
      unit: h.unit || "time",
      history: h.history || [],
    }));
    const notes = usedCache(notesRes, notesRes.data ?? [], fromCache<any>("notes"), "notes") ? notesSrc : notesSrc.map((n: any) => ({
      id: n.id,
      title: n.title,
      preview: n.preview || "",
      date: n.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      pinned: n.pinned || false,
      body: n.body || "",
      tags: n.tags || [],
      hasImage: false,
      hasVoice: false,
      hasChecklist: false,
    }));
    const calendarEvents = usedCache(calendarRes, calendarRes.data ?? [], fromCache<any>("calendarEvents"), "calendarEvents") ? calendarSrc : calendarSrc.map((c: any) => ({
      id: c.id,
      title: c.title,
      date: c.date,
      type: c.type || "task",
    }));

    const settingsRow = settingsRes.data;
    const officeRow = officeRes.data;
    const studentRow = studentRes.data;

    // Step 3: Hydrate appData store using set()
    // (expenses / incomes / … are already app-shaped — mapped from cloud rows
    //  in Step 2, or taken as-is from the local cache)
    useAppData.setState({
      expenses,
      incomes,
      shopping,
      borrowLend,
      habits,
      notes,
      calendarEvents,
    });

    // Keep the local cache in sync with what we just loaded
    writeUserCache(userId, {
      expenses, incomes, shopping, borrowLend, habits, notes, calendarEvents,
    });

    // Step 4: Hydrate settings store
    if (settingsRow?.settings) {
      const s = settingsRow.settings;
      useSettings.setState({
        // User profile
        userName: s.userName ?? "User",
        userEmail: s.userEmail ?? "",
        userPhone: s.userPhone ?? "",
        userAvatar: s.userAvatar ?? "U",
        // Server has no avatarUrl column — only apply when present so the
        // Google/Gmail profile photo (set at login from auth metadata)
        // survives data hydration.
        ...(s.userAvatarUrl ? { userAvatarUrl: s.userAvatarUrl } : {}),
        userBio: s.userBio ?? "",
        userBirthday: s.userBirthday ?? "",
        userCountry: s.userCountry ?? "India",
        userPlan: s.userPlan ?? "Trackly Free",
        userMemberSince: s.userMemberSince ?? new Date().getFullYear().toString(),
        userNotifications: s.userNotifications ?? true,
        // Preferences
        language: s.language ?? "en",
        appIcon: s.appIcon ?? "Default",
        currency: s.currency ?? { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
        // Modes
        studentMode: s.studentMode ?? false,
        officeMode: s.officeMode ?? false,
        studentStartedAt: s.studentStartedAt ?? null,
        officeStartedAt: s.officeStartedAt ?? null,
        studentPaused: s.studentPaused ?? false,
        officePaused: s.officePaused ?? false,
        // Trip
        tripMode: s.tripMode ?? "none",
        tripDestination: s.tripDestination ?? "",
        tripCountry: s.tripCountry ?? "",
        tripStartedAt: s.tripStartedAt ?? null,
        preTripCurrency: s.preTripCurrency ?? null,
        // Device toggles
        backTapAction: s.backTapAction ?? true,
        homeWidget: s.homeWidget ?? true,
        voiceInput: s.voiceInput ?? true,
        biometricLock: s.biometricLock ?? true,
        cloudSync: s.cloudSync ?? true,
        voiceAssistant: s.voiceAssistant ?? true,
        hapticFeedback: s.hapticFeedback ?? true,
        ocr: s.ocr ?? true,
        autoBackup: s.autoBackup ?? true,
        // History
        tripHistory: s.tripHistory ?? [],
        studentHistory: s.studentHistory ?? [],
        officeHistory: s.officeHistory ?? [],
      });
    }

    // ===== CRITICAL: Restore appData snapshots (for Trip/Student mode persistence) =====
    // ONLY while the mode is still ACTIVE. A snapshot without its active mode
    // is STALE (mode was ended; the snapshot should have been consumed) —
    // restoring it would permanently block money-sync (autoSave guard) and
    // the user's new expenses would never reach the cloud.
    if (settingsRow?.settings) {
      const s = settingsRow.settings;
      // tripMode is "none" | "national" | "international" — truthy "none"
      // must NOT count as an active trip (same guard as autoSave).
      const tripActive = !!s.tripMode && s.tripMode !== "none";
      useAppData.setState({
        tripSnapshot: tripActive ? (s.tripSnapshot ?? null) : null,
        studentSnapshot: s.studentMode ? (s.studentSnapshot ?? null) : null,
      });
    }

    // Step 5: Hydrate office data store
    if (officeRow) {
      useOfficeData.setState({
        tasks: officeRow.tasks || [],
        meetings: officeRow.meetings || [],
        attendance: officeRow.attendance || [],
        salary: officeRow.salary || [],
        bills: officeRow.bills || [],
        savingsGoals: officeRow.savings_goals || [],
        dailyGoals: officeRow.daily_goals || [],
        pomodoros: officeRow.pomodoros || [],
      });
    }

    // Step 6: Hydrate student data store
    if (studentRow) {
      useStudentData.setState({
        subjects: studentRow.subjects || [],
        assignments: studentRow.assignments || [],
        exams: studentRow.exams || [],
        books: studentRow.books || [],
        classes: studentRow.classes || [],
        messMeals: studentRow.mess_meals || [],
        hostelBills: studentRow.hostel_bills || [],
        studyGoals: studentRow.study_goals || [],
        routine: studentRow.routine || [],
      });
    }

    // Step 7: Mark onboarding as complete (user already signed up)
    if (typeof window !== "undefined") {
      localStorage.setItem("trackly-onboarding-complete", "1");
    }

    console.log("[Trackly] Data loaded successfully:", {
      expenses: (expenses || []).length,
      incomes: (incomes || []).length,
      shopping: (shopping || []).length,
      borrowLend: (borrowLend || []).length,
      habits: (habits || []).length,
      notes: (notes || []).length,
      calendarEvents: (calendarEvents || []).length,
      hasSettings: !!settingsRow?.settings,
      hasOffice: !!officeRow,
      hasStudent: !!studentRow,
    });

    // CRITICAL: Set flag LAST so AutoSave can now write
    setDataLoaded(true);
    return true;
  } catch (err) {
    console.error("Failed to load user data from Supabase — restoring from local cache:", err);
    // Total failure (network down / auth expired): restore the newest local
    // mirror so the user still sees ALL their data instead of an empty app.
    const cache = readUserCache(userId);
    if (cache) {
      useAppData.setState({
        expenses: cache.expenses as any[],
        incomes: cache.incomes as any[],
        shopping: cache.shopping as any[],
        borrowLend: cache.borrowLend as any[],
        habits: cache.habits as any[],
        notes: cache.notes as any[],
        calendarEvents: cache.calendarEvents as any[],
      });
      console.log("[Trackly] Restored from local cache:", {
        expenses: cache.expenses.length,
        habits: cache.habits.length,
      });
    }
    // Even on error, allow autoSave so user can still save new data
    setDataLoaded(true);
    return false;
  }
}

/**
 * Clears ALL local stores — used on logout for fresh start.
 */
export function clearAllLocalData() {
  // Clear the per-user data mirror (device-local)
  clearAllUserCaches();

  // Reset appData store state (persist will save to localStorage)
  useAppData.setState({
    expenses: [],
    incomes: [],
    shopping: [],
    borrowLend: [],
    habits: [],
    notes: [],
    calendarEvents: [],
    tripSnapshot: null,
    studentSnapshot: null,
    modeBackup: null,
    // archived + deleted folders are device-local — clear on logout too
    archivedExpenses: [],
    archivedIncomes: [],
    archivedShopping: [],
    archivedBorrowLend: [],
  });

  // Clear the Deleted Items folder (device-local)
  useTrashStore.setState({ items: [] });

  // Reset settings store state (persist will save to localStorage)
  useSettings.setState({
    studentMode: false,
    officeMode: false,
    studentStartedAt: null,
    officeStartedAt: null,
    studentPaused: false,
    officePaused: false,
    tripMode: "none",
    tripDestination: "",
    tripCountry: "",
    tripStartedAt: null,
    tripHistory: [],
    studentHistory: [],
    officeHistory: [],
    userName: "",
    userEmail: "",
    userPhone: "",
    userAvatar: "U",
    userPlan: "",
    userBio: "",
    userBirthday: "",
  });

  // Reset office data store state
  useOfficeData.setState({
    tasks: [],
    meetings: [],
    attendance: [],
    salary: [],
    bills: [],
    savingsGoals: [],
    dailyGoals: [],
    pomodoros: [],
  });

  // Reset student data store state
  useStudentData.setState({
    subjects: [],
    assignments: [],
    exams: [],
    books: [],
    classes: [],
    messMeals: [],
    hostelBills: [],
    studyGoals: [],
    routine: [],
  });

  // Clear budget from localStorage
  if (typeof window !== "undefined") {
    localStorage.removeItem("trackly-monthly-budget");
    localStorage.removeItem("trackly-demo-monthly-budget");
  }

  // Reset dataLoaded flag so autoSave doesn't write during next login load
  setDataLoaded(false);
}
