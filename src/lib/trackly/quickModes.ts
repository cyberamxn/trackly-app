"use client";

// ===== Quick Mode switching (used by the TabBar quick-mode strip) =====
// Lets the user instantly activate/deactivate Trip / Student / Office modes
// from anywhere. Behaviour mirrors the Settings screen flows:
// - Starting a mode snapshots current data (appData.startX)
// - Ending a mode SAVES the mode data to history before restoring, so
//   nothing is ever lost (same as Settings "End & Save").

import { toast } from "sonner";
import { useSettings } from "./settings";
import { useAppData } from "./appData";
import { useTracklyStore } from "./store";

export type QuickMode = "normal" | "trip" | "student" | "office";

/** Which mode is currently active for rendering */
export function getActiveMode(): QuickMode {
  const s = useSettings.getState();
  if (s.tripMode !== "none") return "trip";
  if (s.studentMode) return "student";
  if (s.officeMode) return "office";
  return "normal";
}

/**
 * Activate a mode instantly.
 * normal = end whatever mode is active (with confirm + history save).
 */
export function activateQuickMode(mode: QuickMode): void {
  if (typeof window === "undefined") return;
  const active = getActiveMode();

  // Tapping the already-active chip (or Normal while normal) does nothing
  if (mode === active) return;

  // Normal → end the active mode (with confirmation — data gets saved to history)
  if (mode === "normal") {
    confirmAndDeactivate(active);
    return;
  }

  // Switching directly between modes: end the current one first
  if (active !== "normal") {
    if (!window.confirm(`Switch from ${label(active)} to ${label(mode)} mode? Your ${label(active)} data will be saved to history.`)) {
      return;
    }
    deactivateMode(active);
  }

  const settings = useSettings.getState();
  const appData = useAppData.getState();
  const { setScreen } = useTracklyStore.getState();

  if (mode === "trip") {
    // National trip — quick city prompt (same as the Settings flow)
    const city = window.prompt("Enter destination city:");
    if (!city || !city.trim()) return;
    settings.startTrip("national", city.trim());
    appData.startTrip();
    setScreen("dashboard");
    toast.success(`Trip to ${city.trim()} started. Counting reset to zero.`);
    return;
  }

  if (mode === "student") {
    if (settings.officeMode) settings.setOfficeMode(false);
    settings.startStudentMode();
    appData.startStudentMode();
    setScreen("student-dashboard");
    toast.success("Student Mode enabled. Counting reset to zero.");
    return;
  }

  // office
  if (settings.studentMode) settings.setStudentMode(false);
  settings.setOfficeMode(true);
  setScreen("office-dashboard");
  toast.success("Office Mode enabled — dashboard updated");
}

function confirmAndDeactivate(active: QuickMode): void {
  if (active === "normal") return;
  const ok = window.confirm(
    `End ${label(active)} mode? Your ${label(active)} data will be saved to history and your previous data restored.`
  );
  if (!ok) return;
  deactivateMode(active);
}

/** End the given mode — history save + data restore (Settings parity) */
export function deactivateMode(mode: QuickMode): void {
  if (typeof window === "undefined") return;
  const settings = useSettings.getState();
  const appData = useAppData.getState();
  const { setScreen } = useTracklyStore.getState();

  if (mode === "trip") {
    const tripExpenses = appData.expenses;
    const tripIncomes = appData.incomes;
    const tripShopping = appData.shopping;
    const tripBorrowLend = appData.borrowLend;
    const totalSpent = tripExpenses.reduce((s, e) => s + e.amount, 0);
    const totalIncome = tripIncomes.reduce((s, i) => s + i.amount, 0);
    const durationDays = settings.tripStartedAt
      ? Math.max(1, Math.ceil((Date.now() - new Date(settings.tripStartedAt).getTime()) / 86400000))
      : 1;
    settings.saveTripToHistory({
      mode: settings.tripMode,
      destination: settings.tripDestination,
      countryCode: settings.tripCountry,
      flag: "🧳",
      startedAt: settings.tripStartedAt ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationDays,
      currencyCode: settings.currency.code,
      currencySymbol: settings.currency.symbol,
      totalSpent,
      totalIncome,
      expenseCount: tripExpenses.length,
      incomeCount: tripIncomes.length,
      shoppingCount: tripShopping.length,
      borrowLendCount: tripBorrowLend.length,
      expenses: tripExpenses,
      incomes: tripIncomes,
      shopping: tripShopping,
      borrowLend: tripBorrowLend,
    });
    settings.endTrip();
    appData.endTrip();
    setScreen("dashboard");
    toast.success("Trip ended & saved to history. Your previous data has been restored.");
    return;
  }

  if (mode === "student") {
    // If paused, return to mode first so student data is back in appData
    if (settings.studentPaused) appData.returnToMode();
    const d = useAppData.getState();
    const studentExpenses = d.expenses;
    const studentIncomes = d.incomes;
    const studentShopping = d.shopping;
    const studentBorrowLend = d.borrowLend;
    const totalSpent = studentExpenses.reduce((s, e) => s + e.amount, 0);
    const totalIncome = studentIncomes.reduce((s, i) => s + i.amount, 0);
    const durationDays = settings.studentStartedAt
      ? Math.max(1, Math.ceil((Date.now() - new Date(settings.studentStartedAt).getTime()) / 86400000))
      : 1;
    settings.saveStudentToHistory({
      startedAt: settings.studentStartedAt ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationDays,
      totalSpent,
      totalIncome,
      expenseCount: studentExpenses.length,
      incomeCount: studentIncomes.length,
      shoppingCount: studentShopping.length,
      borrowLendCount: studentBorrowLend.length,
      expenses: studentExpenses,
      incomes: studentIncomes,
      shopping: studentShopping,
      borrowLend: studentBorrowLend,
    });
    settings.endStudentMode();
    appData.endStudentMode();
    setScreen("dashboard");
    toast.success("Student Mode ended — session saved to history, data restored.");
    return;
  }

  if (mode === "office") {
    settings.setOfficeMode(false);
    setScreen("dashboard");
    toast.success("Office Mode disabled");
  }
}

function label(mode: QuickMode): string {
  if (mode === "trip") return "Trip";
  if (mode === "student") return "Student";
  if (mode === "office") return "Office";
  return "Normal";
}
