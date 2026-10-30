"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ===== Types =====
export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: "daily" | "weekly" | "as-needed";
  times: string[];
  days?: number[];
  startDate: string;
  endDate?: string;
  notes?: string;
  refillDate?: string;
  refillRemaining: number;
  refillTotal: number;
  active: boolean;
  takenToday: string[];
}

export interface HealthRecord {
  id: string;
  type: "checkup" | "lab" | "prescription" | "vaccine" | "allergy" | "condition";
  title: string;
  doctor?: string;
  date: string;
  notes?: string;
  attachments?: string[];
}

export interface RefillAlert {
  id: string;
  medicineId: string;
  medicineName: string;
  remaining: number;
  total: number;
  refillDate: string;
  daysUntilRefill: number;
}

interface HealthState {
  medicines: Medicine[];
  healthRecords: HealthRecord[];

  addMedicine: (m: Omit<Medicine, "id" | "takenToday">) => void;
  updateMedicine: (id: string, updates: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  markTaken: (id: string, time: string) => void;
  unmarkTaken: (id: string, time: string) => void;
  refillMedicine: (id: string) => void;

  addHealthRecord: (r: Omit<HealthRecord, "id">) => void;
  updateHealthRecord: (id: string, updates: Partial<HealthRecord>) => void;
  deleteHealthRecord: (id: string) => void;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const today = new Date().toISOString().slice(0, 10);

export const useHealthData = create<HealthState>()(
  persist(
    (set) => ({
      medicines: [],
      healthRecords: [],

      addMedicine: (m) => set((s) => ({ medicines: [...s.medicines, { ...m, id: uid("med"), takenToday: [] }] })),
      updateMedicine: (id, updates) => set((s) => ({ medicines: s.medicines.map((m) => m.id === id ? { ...m, ...updates } : m) })),
      deleteMedicine: (id) => set((s) => ({ medicines: s.medicines.filter((m) => m.id !== id) })),
      markTaken: (id, time) => set((s) => ({
        medicines: s.medicines.map((m) =>
          m.id === id && !m.takenToday.includes(time)
            ? { ...m, takenToday: [...m.takenToday, time], refillRemaining: Math.max(0, m.refillRemaining - 1) }
            : m
        ),
      })),
      unmarkTaken: (id, time) => set((s) => ({
        medicines: s.medicines.map((m) =>
          m.id === id
            ? { ...m, takenToday: m.takenToday.filter((t) => t !== time) }
            : m
        ),
      })),
      refillMedicine: (id) => set((s) => ({
        medicines: s.medicines.map((m) =>
          m.id === id ? { ...m, refillRemaining: m.refillTotal, refillDate: undefined } : m
        ),
      })),

      addHealthRecord: (r) => set((s) => ({ healthRecords: [...s.healthRecords, { ...r, id: uid("hr") }] })),
      updateHealthRecord: (id, updates) => set((s) => ({ healthRecords: s.healthRecords.map((r) => r.id === id ? { ...r, ...updates } : r) })),
      deleteHealthRecord: (id) => set((s) => ({ healthRecords: s.healthRecords.filter((r) => r.id !== id) })),
    }),
    {
      name: "trackly-health-data",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as any))),
    }
  )
);
