"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ===== Deleted Items (Trash) store =====
// Everything the user deletes (transactions, habits, tasks, notes,
// shopping, borrow/lend) lands here — counted per type, restorable,
// and survives page reloads via localStorage.

export type TrashType =
  | "expense"
  | "income"
  | "habit"
  | "task"
  | "note"
  | "shopping"
  | "borrow";

export interface TrashItem {
  trashId: string;
  type: TrashType;
  title: string;
  subtitle: string;
  /** category id (expenses) — used for the row icon */
  icon?: string;
  deletedAt: string; // ISO
  /** full original item — used to restore */
  data: any;
  /** extra restore context, e.g. { routineId, period } for tasks */
  meta?: Record<string, any>;
}

export const TRASH_TYPE_LABELS: Record<TrashType, string> = {
  expense: "Expenses",
  income: "Incomes",
  habit: "Habits",
  task: "Tasks",
  note: "Notes",
  shopping: "Shopping",
  borrow: "Borrow/Lend",
};

interface TrashState {
  items: TrashItem[];
  addToTrash: (item: Omit<TrashItem, "trashId" | "deletedAt">) => void;
  /** removes from trash and returns the item so the caller can re-insert it */
  restoreItem: (trashId: string) => TrashItem | undefined;
  /** irreversible — removes the entry entirely */
  permanentRemove: (trashId: string) => void;
  emptyTrash: () => void;
}

function tid(): string {
  return `trash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useTrashStore = create<TrashState>()(
  persist(
    (set, get) => ({
      items: [],

      addToTrash: (item) =>
        set((s) => ({
          items: [{ ...item, trashId: tid(), deletedAt: new Date().toISOString() }, ...s.items],
        })),

      restoreItem: (trashId) => {
        const item = get().items.find((t) => t.trashId === trashId);
        if (!item) return undefined;
        set((s) => ({ items: s.items.filter((t) => t.trashId !== trashId) }));
        return item;
      },

      permanentRemove: (trashId) =>
        set((s) => ({ items: s.items.filter((t) => t.trashId !== trashId) })),

      emptyTrash: () => set({ items: [] }),
    }),
    {
      name: "trackly-trash-v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as any))),
    }
  )
);

// ===== Selector helpers =====
export function countByType(items: TrashItem[]): { type: TrashType; label: string; count: number }[] {
  const types: TrashType[] = ["expense", "income", "habit", "task", "note", "shopping", "borrow"];
  return types
    .map((type) => ({
      type,
      label: TRASH_TYPE_LABELS[type],
      count: items.filter((t) => t.type === type).length,
    }))
    .filter((t) => t.count > 0);
}

export function totalTrashCount(items: TrashItem[]): number {
  return items.length;
}

/** "just now" / "5m ago" / "3h ago" / "2d ago" */
export function relativeDeletedAt(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
