"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ===== Types =====
export interface WorkTask {
  id: string;
  title: string;
  project: string;
  priority: "low" | "medium" | "high";
  deadline: string;
  status: "todo" | "in-progress" | "done";
  recurring?: boolean;
  description?: string;
}

export interface Meeting {
  id: string;
  title: string;
  time: string;
  duration: number;
  attendees: string[];
  location: string;
  date: string;
  type: "meeting" | "event" | "holiday" | "leave";
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workHours: number;
  overtime: number;
  breakTime: number;
  status: "present" | "wfh" | "late" | "absent";
}

export interface SalaryEntry {
  id: string;
  month: string;
  amount: number;
  bonus: number;
  deduction: number;
  netAmount: number;
  received: boolean;
  receivedDate?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: "electric" | "internet" | "phone" | "rent" | "emi" | "other";
  paid: boolean;
  recurring: boolean;
}

export interface SavingsGoal {
  id: string;
  title: string;
  target: number;
  saved: number;
  deadline: string;
}

export interface PomodoroSession {
  id: string;
  date: string;
  duration: number;
  task?: string;
  completed: boolean;
}

export interface DailyGoal {
  id: string;
  title: string;
  target: number;
  done: number;
  unit: string;
  date: string;
}

// ===== Mock Data =====
const today = new Date().toISOString().slice(0, 10);
const todayDow = new Date().getDay();

const initialTasks: WorkTask[] = [
  { id: "t1", title: "Review Q3 report", project: "Finance", priority: "high", deadline: today, status: "in-progress", description: "Review and approve the Q3 financial report" },
  { id: "t2", title: "Client call — Acme Corp", project: "Sales", priority: "high", deadline: today, status: "todo", recurring: true },
  { id: "t3", title: "Update API documentation", project: "DevOps", priority: "medium", deadline: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), status: "todo" },
  { id: "t4", title: "Team standup", project: "General", priority: "low", deadline: today, status: "done", recurring: true },
  { id: "t5", title: "Submit expense report", project: "Finance", priority: "medium", deadline: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10), status: "todo" },
  { id: "t6", title: "Code review — PR #234", project: "DevOps", priority: "high", deadline: today, status: "todo" },
  { id: "t7", title: "Design feedback — landing page", project: "Marketing", priority: "low", deadline: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), status: "todo" },
];

const initialMeetings: Meeting[] = [
  { id: "m1", title: "Daily Standup", time: "09:30", duration: 15, attendees: ["Team"], location: "Zoom", date: today, type: "meeting" },
  { id: "m2", title: "Sprint Planning", time: "11:00", duration: 60, attendees: ["Dev Team", "PM"], location: "Conf Room A", date: today, type: "meeting" },
  { id: "m3", title: "1:1 with Manager", time: "15:00", duration: 30, attendees: ["You", "Rahul (Manager)"], location: "Office", date: today, type: "meeting" },
  { id: "m4", title: "Client Presentation", time: "16:30", duration: 45, attendees: ["Acme Corp", "Sales Team"], location: "Conf Room B", date: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10), type: "meeting" },
  { id: "m5", title: "Independence Day", time: "", duration: 0, attendees: [], location: "", date: "2026-08-15", type: "holiday" },
  { id: "m6", title: "Annual Day", time: "14:00", duration: 180, attendees: ["All Staff"], location: "Auditorium", date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), type: "event" },
];

const initialAttendance: AttendanceRecord[] = (() => {
  const records: AttendanceRecord[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 86400000);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const dateStr = d.toISOString().slice(0, 10);
    const isLate = i === 5 || i === 12;
    const isWFH = i === 8 || i === 15;
    records.push({
      id: `a${i}`,
      date: dateStr,
      checkIn: isLate ? "10:15" : "09:0" + (i % 10),
      checkOut: i < 1 ? "" : "18:0" + (i % 10),
      workHours: 8 + (i % 3),
      overtime: i % 4 === 0 ? 1.5 : 0,
      breakTime: 45 + (i % 30),
      status: isLate ? "late" : isWFH ? "wfh" : "present",
    });
  }
  return records;
})();

const initialSalary: SalaryEntry[] = [
  { id: "s1", month: "Jul 2026", amount: 85000, bonus: 5000, deduction: 2000, netAmount: 88000, received: true, receivedDate: "2026-07-01" },
  { id: "s2", month: "Jun 2026", amount: 85000, bonus: 0, deduction: 1500, netAmount: 83500, received: true, receivedDate: "2026-06-01" },
  { id: "s3", month: "May 2026", amount: 85000, bonus: 10000, deduction: 2000, netAmount: 93000, received: true, receivedDate: "2026-05-01" },
  { id: "s4", month: "Aug 2026", amount: 85000, bonus: 0, deduction: 0, netAmount: 85000, received: false },
];

const initialBills: Bill[] = [
  { id: "b1", name: "Electricity Bill", amount: 2400, dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), category: "electric", paid: false, recurring: true },
  { id: "b2", name: "Internet (Airtel)", amount: 1199, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), category: "internet", paid: false, recurring: true },
  { id: "b3", name: "Phone (Jio)", amount: 399, dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), category: "phone", paid: false, recurring: true },
  { id: "b4", name: "House Rent", amount: 18000, dueDate: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10), category: "rent", paid: false, recurring: true },
  { id: "b5", name: "Car Loan EMI", amount: 8500, dueDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10), category: "emi", paid: false, recurring: true },
  { id: "b6", name: "Netflix", amount: 649, dueDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), category: "other", paid: true, recurring: true },
];

const initialGoals: SavingsGoal[] = [
  { id: "g1", title: "Emergency Fund", target: 300000, saved: 187500, deadline: "2026-12-31" },
  { id: "g2", title: "New Laptop", target: 120000, saved: 85000, deadline: "2026-10-15" },
  { id: "g3", title: "Vacation — Goa", target: 50000, saved: 22000, deadline: "2026-11-30" },
];

const initialDailyGoals: DailyGoal[] = [
  { id: "d1", title: "Deep work hours", target: 4, done: 2, unit: "hours", date: today },
  { id: "d2", title: "Tasks completed", target: 8, done: 3, unit: "tasks", date: today },
  { id: "d3", title: "Pomodoro sessions", target: 6, done: 2, unit: "sessions", date: today },
];

const initialPomodoros: PomodoroSession[] = [
  { id: "p1", date: today, duration: 25, task: "Review Q3 report", completed: true },
  { id: "p2", date: today, duration: 25, task: "Code review", completed: true },
];

// ===== Store Interface =====
interface OfficeState {
  tasks: WorkTask[];
  meetings: Meeting[];
  attendance: AttendanceRecord[];
  salary: SalaryEntry[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
  dailyGoals: DailyGoal[];
  pomodoros: PomodoroSession[];

  // Task actions
  addTask: (t: Omit<WorkTask, "id">) => void;
  updateTask: (id: string, updates: Partial<WorkTask>) => void;
  deleteTask: (id: string) => void;
  cycleTaskStatus: (id: string) => void;

  // Meeting actions
  addMeeting: (m: Omit<Meeting, "id">) => void;
  deleteMeeting: (id: string) => void;

  // Attendance actions
  checkIn: () => void;
  checkOut: () => void;
  todayAttendance: () => AttendanceRecord | undefined;

  // Bill actions
  toggleBillPaid: (id: string) => void;
  addBill: (b: Omit<Bill, "id">) => void;
  deleteBill: (id: string) => void;

  // Salary actions
  toggleSalaryReceived: (id: string) => void;
  addSalary: (s: Omit<SalaryEntry, "id">) => void;
  deleteSalary: (id: string) => void;

  // Savings goal actions
  addToSavings: (id: string, amount: number) => void;
  addSavingsGoal: (g: Omit<SavingsGoal, "id">) => void;
  deleteSavingsGoal: (id: string) => void;

  // Daily goal actions
  incrementDailyGoal: (id: string) => void;
  addDailyGoal: (g: Omit<DailyGoal, "id">) => void;
  deleteDailyGoal: (id: string) => void;

  // Pomodoro actions
  addPomodoro: (p: Omit<PomodoroSession, "id">) => void;
}

function uid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const useOfficeData = create<OfficeState>()(
  persist(
    (set, get) => ({
      tasks: [],
      meetings: [],
      attendance: [],
      salary: [],
      bills: [],
      savingsGoals: [],
      dailyGoals: [],
      pomodoros: [],

      addTask: (t) => set((s) => ({ tasks: [{ ...t, id: uid("t") }, ...s.tasks] })),
      updateTask: (id, updates) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      cycleTaskStatus: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const next = t.status === "todo" ? "in-progress" : t.status === "in-progress" ? "done" : "todo";
            return { ...t, status: next };
          }),
        })),

      addMeeting: (m) => set((s) => ({ meetings: [{ ...m, id: uid("m") }, ...s.meetings] })),
      deleteMeeting: (id) => set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) })),

      checkIn: () => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const existing = get().attendance.find((a) => a.date === todayStr);
        const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        if (existing) {
          set((s) => ({
            attendance: s.attendance.map((a) =>
              a.date === todayStr ? { ...a, checkIn: time, status: time > "09:30" ? "late" : "present" } : a
            ),
          }));
        } else {
          set((s) => ({
            attendance: [
              {
                id: uid("a"),
                date: todayStr,
                checkIn: time,
                checkOut: "",
                workHours: 0,
                overtime: 0,
                breakTime: 0,
                status: time > "09:30" ? "late" : "present",
              },
              ...s.attendance,
            ],
          }));
        }
      },
      checkOut: () => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        set((s) => ({
          attendance: s.attendance.map((a) => {
            if (a.date !== todayStr) return a;
            const [inH, inM] = a.checkIn.split(":").map(Number);
            const [outH, outM] = time.split(":").map(Number);
            const workHours = (outH * 60 + outM - inH * 60 - inM) / 60;
            return {
              ...a,
              checkOut: time,
              workHours: Math.max(0, workHours - 0.75),
              overtime: Math.max(0, workHours - 8.75),
            };
          }),
        }));
      },
      todayAttendance: () => {
        const todayStr = new Date().toISOString().slice(0, 10);
        return get().attendance.find((a) => a.date === todayStr);
      },

      toggleBillPaid: (id) =>
        set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, paid: !b.paid } : b)) })),
      addBill: (b) => set((s) => ({ bills: [{ ...b, id: uid("b") }, ...s.bills] })),
      deleteBill: (id) => set((s) => ({ bills: s.bills.filter((b) => b.id !== id) })),

      toggleSalaryReceived: (id) =>
        set((s) => ({
          salary: s.salary.map((r) =>
            r.id === id
              ? { ...r, received: !r.received, receivedDate: !r.received ? new Date().toISOString().slice(0, 10) : undefined }
              : r
          ),
        })),
      addSalary: (sal) => set((s) => ({ salary: [{ ...sal, id: uid("s") }, ...s.salary] })),
      deleteSalary: (id) => set((s) => ({ salary: s.salary.filter((r) => r.id !== id) })),

      addToSavings: (id, amount) =>
        set((s) => ({
          savingsGoals: s.savingsGoals.map((g) =>
            g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g
          ),
        })),
      addSavingsGoal: (g) => set((s) => ({ savingsGoals: [{ ...g, id: uid("g") }, ...s.savingsGoals] })),
      deleteSavingsGoal: (id) => set((s) => ({ savingsGoals: s.savingsGoals.filter((g) => g.id !== id) })),

      incrementDailyGoal: (id) =>
        set((s) => ({
          dailyGoals: s.dailyGoals.map((g) =>
            g.id === id ? { ...g, done: Math.min(g.target, g.done + 1) } : g
          ),
        })),
      addDailyGoal: (g) => set((s) => ({ dailyGoals: [...s.dailyGoals, { ...g, id: uid("d") }] })),
      deleteDailyGoal: (id) => set((s) => ({ dailyGoals: s.dailyGoals.filter((g) => g.id !== id) })),

      addPomodoro: (p) => set((s) => ({ pomodoros: [{ ...p, id: uid("p") }, ...s.pomodoros] })),
    }),
    {
      name: "trackly-office-data",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as any))),
    }
  )
);
