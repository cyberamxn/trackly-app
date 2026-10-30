"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { istDate, istMonth } from "@/lib/trackly/ist";
import {
  monthlyBudget,
  type Expense, type Income, type ShoppingItem, type BorrowLend, type Habit, type Note, type CalendarEvent,
} from "./data";

export type { Expense, Income, ShoppingItem, BorrowLend, Habit, Note, CalendarEvent };

export type QuickAddType =
  | "expense" | "income" | "shopping" | "borrowed" | "lent"
  | "note" | "task" | "reminder" | "habit";

// Normalize "today" expenses to the actual current date so the dashboard
// filter `e.date === today` matches them.
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface AppDataState {
  expenses: Expense[];
  incomes: Income[];
  shopping: ShoppingItem[];
  borrowLend: BorrowLend[];
  habits: Habit[];
  notes: Note[];
  calendarEvents: CalendarEvent[];

  // ===== Archive — items removed from main view but kept for restore =====
  archivedExpenses: (Expense & { archivedAt: string })[];
  archivedIncomes: (Income & { archivedAt: string })[];
  archivedShopping: (ShoppingItem & { archivedAt: string })[];
  archivedBorrowLend: (BorrowLend & { archivedAt: string })[];

  // Trip snapshot — holds pre-trip data while trip mode is active
  tripSnapshot: {
    expenses: Expense[];
    incomes: Income[];
    shopping: ShoppingItem[];
    borrowLend: BorrowLend[];
  } | null;

  // Student snapshot — holds pre-student-mode data
  studentSnapshot: {
    expenses: Expense[];
    incomes: Income[];
    shopping: ShoppingItem[];
    borrowLend: BorrowLend[];
  } | null;

  // Mode backup — temporarily holds trip/student data while viewing normal mode
  modeBackup: {
    expenses: Expense[];
    incomes: Income[];
    shopping: ShoppingItem[];
    borrowLend: BorrowLend[];
  } | null;

  addExpense: (e: Omit<Expense, "id">) => void;
  addIncome: (i: Omit<Income, "id">) => void;
  addShopping: (s: Omit<ShoppingItem, "id">) => void;
  addBorrowLend: (b: Omit<BorrowLend, "id">) => void;
  addNote: (n: Omit<Note, "id" | "date" | "pinned">) => void;
  addCalendarEvent: (c: Omit<CalendarEvent, "id">) => void;
  addHabit: (h: Omit<Habit, "id" | "streak" | "done" | "history">) => void;
  updateHabit: (id: string, updates: Partial<Pick<Habit, "name" | "icon" | "goal" | "unit">>) => void;
  deleteHabit: (id: string) => void;
  updateExpense: (id: string, updates: Partial<Omit<Expense, "id">>) => void;
  deleteExpense: (id: string) => void;
  updateIncome: (id: string, updates: Partial<Omit<Income, "id">>) => void;
  deleteIncome: (id: string) => void;

  markShoppingPurchased: (id: string) => void;
  moveShoppingToWishlist: (id: string) => void;
  deleteShopping: (id: string) => void;
  recordBorrowPayment: (id: string) => void;
  deleteBorrowLend: (id: string) => void;
  settleBorrowLend: (id: string) => void;
  incrementHabit: (id: string) => void;
  toggleRoutineTask: (routineId: string, taskId: string) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;

  // ===== Archive actions =====
  archiveExpense: (id: string) => void;
  archiveIncome: (id: string) => void;
  archiveShopping: (id: string) => void;
  archiveBorrowLend: (id: string) => void;
  restoreExpense: (id: string) => void;
  restoreIncome: (id: string) => void;
  restoreShopping: (id: string) => void;
  restoreBorrowLend: (id: string) => void;
  permanentDeleteExpense: (id: string) => void;
  permanentDeleteIncome: (id: string) => void;
  permanentDeleteShopping: (id: string) => void;
  permanentDeleteBorrowLend: (id: string) => void;
  clearAllArchived: () => void;

  startTrip: () => void;
  endTrip: () => void;
  startStudentMode: () => void;
  endStudentMode: () => void;
  resetStudentData: () => void; // clears data without touching snapshot (for "Start New Session")
  // Temporarily show normal data (for "Exit Without Saving") without ending trip/student
  viewNormalMode: () => void;
  // Return from normal view back to trip/student data
  returnToMode: () => void;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useAppData = create<AppDataState>()(
  persist(
    (set) => ({
  expenses: [],
  incomes: [],
  shopping: [],
  borrowLend: [],
  habits: [],
  notes: [],
  calendarEvents: [],
  archivedExpenses: [],
  archivedIncomes: [],
  archivedShopping: [],
  archivedBorrowLend: [],
  tripSnapshot: null,
  studentSnapshot: null,
  modeBackup: null,

  addExpense: (e) =>
    set((s) => ({ expenses: [{ ...e, id: uid("exp") }, ...s.expenses] })),

  addIncome: (i) =>
    set((s) => ({ incomes: [{ ...i, id: uid("inc") }, ...s.incomes] })),

  addShopping: (item) =>
    set((s) => ({ shopping: [{ ...item, id: uid("shop") }, ...s.shopping] })),

  addBorrowLend: (b) =>
    set((s) => ({ borrowLend: [{ ...b, id: uid("bl") }, ...s.borrowLend] })),

  addNote: (n) =>
    set((s) => ({
      notes: [
        {
          ...n,
          id: uid("note"),
          date: new Date().toISOString().slice(0, 10),
          pinned: false,
        },
        ...s.notes,
      ],
    })),

  addCalendarEvent: (c) =>
    set((s) => ({ calendarEvents: [{ ...c, id: uid("cal") }, ...s.calendarEvents] })),

  addHabit: (h) =>
    set((s) => ({
      habits: [
        { ...h, id: uid("habit"), streak: 0, done: 0, history: [false, false, false, false, false, false, false] },
        ...s.habits,
      ],
    })),

  updateHabit: (id, updates) =>
    set((s) => ({
      habits: s.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    })),

  deleteHabit: (id) =>
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

  updateExpense: (id, updates) =>
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),

  deleteExpense: (id) =>
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

  updateIncome: (id, updates) =>
    set((s) => ({
      incomes: s.incomes.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),

  deleteIncome: (id) =>
    set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) })),

  markShoppingPurchased: (id) =>
    set((s) => ({
      shopping: s.shopping.map((x) =>
        x.id === id
          ? {
              ...x,
              status: "purchased" as const,
              hasBill: true,
              warranty: "1 Year",
              returnDeadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
            }
          : x
      ),
    })),

  moveShoppingToWishlist: (id) =>
    set((s) => ({
      shopping: s.shopping.map((x) => (x.id === id ? { ...x, status: "wishlist" as const } : x)),
    })),

  deleteShopping: (id) =>
    set((s) => ({
      shopping: s.shopping.filter((x) => x.id !== id),
    })),

  recordBorrowPayment: (id) =>
    set((s) => ({
      borrowLend: s.borrowLend.map((b) => {
        if (b.id !== id) return b;
        const remaining = b.amount - b.paid;
        const partial = Math.min(remaining, Math.max(500, Math.ceil(b.amount * 0.2)));
        return { ...b, paid: b.paid + partial };
      }),
    })),

  deleteBorrowLend: (id) =>
    set((s) => ({
      borrowLend: s.borrowLend.filter((b) => b.id !== id),
    })),

  settleBorrowLend: (id) =>
    set((s) => ({
      borrowLend: s.borrowLend.map((b) =>
        b.id === id ? { ...b, paid: b.amount } : b
      ),
    })),

  incrementHabit: (id) =>
    set((s) => ({
      habits: s.habits.map((h) => {
        if (h.id !== id) return h;
        const newDone = Math.min(h.goal, h.done + Math.max(1, Math.ceil(h.goal * 0.1)));
        return { ...h, done: newDone };
      }),
    })),

  toggleRoutineTask: () => {
    // Routine tasks are stored locally in the Routine component
    // since they reset daily; no global persistence needed
  },

  deleteNote: (id) =>
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

  togglePinNote: (id) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
    })),

  updateNote: (id, updates) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),

  // ===== Archive: move item to archive (removes from main view, keeps for restore) =====
  archiveExpense: (id) =>
    set((s) => {
      const item = s.expenses.find((e) => e.id === id);
      if (!item) return {};
      return {
        expenses: s.expenses.filter((e) => e.id !== id),
        archivedExpenses: [{ ...item, archivedAt: new Date().toISOString() }, ...s.archivedExpenses],
      };
    }),

  archiveIncome: (id) =>
    set((s) => {
      const item = s.incomes.find((i) => i.id === id);
      if (!item) return {};
      return {
        incomes: s.incomes.filter((i) => i.id !== id),
        archivedIncomes: [{ ...item, archivedAt: new Date().toISOString() }, ...s.archivedIncomes],
      };
    }),

  archiveShopping: (id) =>
    set((s) => {
      const item = s.shopping.find((x) => x.id === id);
      if (!item) return {};
      return {
        shopping: s.shopping.filter((x) => x.id !== id),
        archivedShopping: [{ ...item, archivedAt: new Date().toISOString() }, ...s.archivedShopping],
      };
    }),

  archiveBorrowLend: (id) =>
    set((s) => {
      const item = s.borrowLend.find((b) => b.id === id);
      if (!item) return {};
      return {
        borrowLend: s.borrowLend.filter((b) => b.id !== id),
        archivedBorrowLend: [{ ...item, archivedAt: new Date().toISOString() }, ...s.archivedBorrowLend],
      };
    }),

  // ===== Restore: move item back from archive to main view =====
  restoreExpense: (id) =>
    set((s) => {
      const item = s.archivedExpenses.find((e) => e.id === id);
      if (!item) return {};
      const { archivedAt, ...restored } = item;
      return {
        archivedExpenses: s.archivedExpenses.filter((e) => e.id !== id),
        expenses: [restored, ...s.expenses],
      };
    }),

  restoreIncome: (id) =>
    set((s) => {
      const item = s.archivedIncomes.find((i) => i.id === id);
      if (!item) return {};
      const { archivedAt, ...restored } = item;
      return {
        archivedIncomes: s.archivedIncomes.filter((i) => i.id !== id),
        incomes: [restored, ...s.incomes],
      };
    }),

  restoreShopping: (id) =>
    set((s) => {
      const item = s.archivedShopping.find((x) => x.id === id);
      if (!item) return {};
      const { archivedAt, ...restored } = item;
      return {
        archivedShopping: s.archivedShopping.filter((x) => x.id !== id),
        shopping: [restored, ...s.shopping],
      };
    }),

  restoreBorrowLend: (id) =>
    set((s) => {
      const item = s.archivedBorrowLend.find((b) => b.id === id);
      if (!item) return {};
      const { archivedAt, ...restored } = item;
      return {
        archivedBorrowLend: s.archivedBorrowLend.filter((b) => b.id !== id),
        borrowLend: [restored, ...s.borrowLend],
      };
    }),

  // ===== Permanent delete from archive (irreversible) =====
  permanentDeleteExpense: (id) =>
    set((s) => ({ archivedExpenses: s.archivedExpenses.filter((e) => e.id !== id) })),
  permanentDeleteIncome: (id) =>
    set((s) => ({ archivedIncomes: s.archivedIncomes.filter((i) => i.id !== id) })),
  permanentDeleteShopping: (id) =>
    set((s) => ({ archivedShopping: s.archivedShopping.filter((x) => x.id !== id) })),
  permanentDeleteBorrowLend: (id) =>
    set((s) => ({ archivedBorrowLend: s.archivedBorrowLend.filter((b) => b.id !== id) })),
  clearAllArchived: () =>
    set({
      archivedExpenses: [],
      archivedIncomes: [],
      archivedShopping: [],
      archivedBorrowLend: [],
    }),

  // ===== Trip Mode: snapshot current data, then reset to zero =====
  startTrip: () =>
    set((s) => ({
      tripSnapshot: {
        expenses: s.expenses,
        incomes: s.incomes,
        shopping: s.shopping,
        borrowLend: s.borrowLend,
      },
      expenses: [],
      incomes: [],
      shopping: [],
      borrowLend: [],
    })),

  // ===== End Trip: restore pre-trip data =====
  endTrip: () =>
    set((s) => {
      if (!s.tripSnapshot) {
        return { tripSnapshot: null };
      }
      return {
        expenses: s.tripSnapshot.expenses,
        incomes: s.tripSnapshot.incomes,
        shopping: s.tripSnapshot.shopping,
        borrowLend: s.tripSnapshot.borrowLend,
        tripSnapshot: null,
      };
    }),

  // ===== Student Mode: snapshot + reset (same pattern as Trip Mode) =====
  startStudentMode: () =>
    set((s) => ({
      studentSnapshot: {
        expenses: s.expenses,
        incomes: s.incomes,
        shopping: s.shopping,
        borrowLend: s.borrowLend,
      },
      expenses: [],
      incomes: [],
      shopping: [],
      borrowLend: [],
    })),

  // ===== End Student Mode: restore pre-student data =====
  endStudentMode: () =>
    set((s) => {
      if (!s.studentSnapshot) {
        return { studentSnapshot: null };
      }
      return {
        expenses: s.studentSnapshot.expenses,
        incomes: s.studentSnapshot.incomes,
        shopping: s.studentSnapshot.shopping,
        borrowLend: s.studentSnapshot.borrowLend,
        studentSnapshot: null,
      };
    }),

  // ===== Reset Student Data: clear to zero WITHOUT touching snapshot (for "Start New Session") =====
  resetStudentData: () =>
    set({
      expenses: [],
      incomes: [],
      shopping: [],
      borrowLend: [],
    }),

  // ===== View Normal Mode: temporarily show pre-trip/student data WITHOUT ending the mode =====
  viewNormalMode: () =>
    set((s) => {
      // Pick whichever snapshot is active (trip or student)
      const snapshot = s.tripSnapshot ?? s.studentSnapshot;
      if (!snapshot) return {}; // nothing to restore
      // Backup current (trip/student) data so we can return to it
      return {
        modeBackup: {
          expenses: s.expenses,
          incomes: s.incomes,
          shopping: s.shopping,
          borrowLend: s.borrowLend,
        },
        // Show the pre-mode data (normal data)
        expenses: snapshot.expenses,
        incomes: snapshot.incomes,
        shopping: snapshot.shopping,
        borrowLend: snapshot.borrowLend,
      };
    }),

  // ===== Return to Mode: go back to trip/student data from normal view =====
  returnToMode: () =>
    set((s) => {
      if (!s.modeBackup) return {};
      return {
        expenses: s.modeBackup.expenses,
        incomes: s.modeBackup.incomes,
        shopping: s.modeBackup.shopping,
        borrowLend: s.modeBackup.borrowLend,
        modeBackup: null,
      };
    }),
    }),
    {
      name: "trackly-archive-v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as any))),
      // ONLY the archived arrays persist to localStorage — without this they
      // were in-memory only and vanished on every page reload.
      // expenses/incomes/etc. stay per-user and load from Supabase.
      partialize: (s) =>
        ({
          archivedExpenses: s.archivedExpenses,
          archivedIncomes: s.archivedIncomes,
          archivedShopping: s.archivedShopping,
          archivedBorrowLend: s.archivedBorrowLend,
        }) as AppDataState,
    }
  )
);

// ===== Selector helpers =====
export const selectTodaySpending = (s: AppDataState): number => {
  // IST "today" — toISOString() gives UTC, which lags IST by 5:30 and calls
  // 12:00–5:30 AM expenses "yesterday" (caught in live QA).
  const today = istDate();
  return s.expenses
    .filter((e) => e.date === today)
    .reduce((sum, e) => sum + e.amount, 0);
};

export const selectMonthSpending = (s: AppDataState): number => {
  const ym = istMonth();
  return s.expenses
    .filter((e) => e.date.startsWith(ym))
    .reduce((sum, e) => sum + e.amount, 0);
};

export const selectMonthIncome = (s: AppDataState): number =>
  s.incomes.reduce((sum, i) => sum + i.amount, 0);

export const selectBudgetRemaining = (s: AppDataState): number =>
  monthlyBudget - selectMonthSpending(s);

export const selectTotalLentOut = (s: AppDataState): number =>
  s.borrowLend
    .filter((b) => b.type === "lent")
    .reduce((sum, b) => sum + (b.amount - b.paid), 0);

export const selectTotalBorrowed = (s: AppDataState): number =>
  s.borrowLend
    .filter((b) => b.type === "borrowed")
    .reduce((sum, b) => sum + (b.amount - b.paid), 0);

export { monthlyBudget };
