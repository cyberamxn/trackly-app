"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ===== Types =====
export interface StudentClass {
  id: string;
  subject: string;
  code: string;
  time: string;
  duration: number;
  room: string;
  day: number;
  attended: boolean;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  type: "assignment" | "homework" | "project" | "lab";
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in-progress" | "completed" | "submitted";
  description?: string;
  attachments?: string[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  totalChapters: number;
  completedChapters: number;
  attendanceTotal: number;
  attendanceAttended: number;
  examDate?: string;
  color?: string;
}

export interface Exam {
  id: string;
  subject: string;
  date: string;
  time: string;
  venue: string;
  duration: number;
  topics: string[];
  prepared: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  type: "purchased" | "borrowed";
  totalPages: number;
  readPages: number;
  dueDate?: string;
  library?: string;
  notes?: string;
}

export interface MessMeal {
  id: string;
  day: number;
  meal: "breakfast" | "lunch" | "snacks" | "dinner";
  menu: string;
  time: string;
}

export interface HostelBill {
  id: string;
  type: "rent" | "electricity" | "wifi" | "laundry" | "water" | "deposit" | "other";
  label: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  paidDate?: string;
  recurring: boolean;
}

export interface StudyGoal {
  id: string;
  subject: string;
  topic: string;
  targetMinutes: number;
  completedMinutes: number;
  date: string;
}

export interface RoutineTask {
  id: string;
  label: string;
  time: string;
  icon: string;
  done: boolean;
}

interface StudentState {
  classes: StudentClass[];
  assignments: Assignment[];
  subjects: Subject[];
  exams: Exam[];
  books: Book[];
  messMeals: MessMeal[];
  hostelBills: HostelBill[];
  studyGoals: StudyGoal[];
  routine: RoutineTask[];

  // Class actions
  toggleClassAttended: (id: string) => void;

  // Assignment actions
  addAssignment: (a: Omit<Assignment, "id">) => void;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;

  // Subject actions
  addSubject: (s: Omit<Subject, "id">) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  markChapterComplete: (id: string) => void;

  // Exam actions
  addExam: (e: Omit<Exam, "id">) => void;
  updateExam: (id: string, updates: Partial<Exam>) => void;
  deleteExam: (id: string) => void;

  // Book actions
  addBook: (b: Omit<Book, "id">) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;

  // Mess actions
  addMessMeal: (m: Omit<MessMeal, "id">) => void;
  updateMessMeal: (id: string, updates: Partial<MessMeal>) => void;
  deleteMessMeal: (id: string) => void;

  // Hostel actions
  addHostelBill: (b: Omit<HostelBill, "id">) => void;
  updateHostelBill: (id: string, updates: Partial<HostelBill>) => void;
  deleteHostelBill: (id: string) => void;

  // Study goal actions
  addStudyGoal: (g: Omit<StudyGoal, "id">) => void;
  updateStudyGoal: (id: string, updates: Partial<StudyGoal>) => void;
  deleteStudyGoal: (id: string) => void;

  // Routine actions
  toggleRoutineTask: (id: string) => void;
  addRoutineTask: (t: Omit<RoutineTask, "id" | "done">) => void;
  deleteRoutineTask: (id: string) => void;

  // Class actions
  addClass: (c: Omit<StudentClass, "id" | "attended">) => void;
  deleteClass: (id: string) => void;

  // Reset all student data to empty (for "Start New Session")
  resetAllStudentData: () => void;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const inTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
const inMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

// Today's day of week (0=Sun, 1=Mon, ... 6=Sat)
const todayDow = new Date().getDay();

export const useStudentData = create<StudentState>()(
  persist(
    (set) => ({
      classes: [],
      assignments: [],
      subjects: [],
      exams: [],
      books: [],
      messMeals: [],
      hostelBills: [],
      studyGoals: [],
      routine: [],

      // ===== Class actions =====
      toggleClassAttended: (id) =>
        set((s) => ({ classes: s.classes.map((c) => c.id === id ? { ...c, attended: !c.attended } : c) })),

      // ===== Assignment actions =====
      addAssignment: (a) => set((s) => ({ assignments: [{ ...a, id: uid("a") }, ...s.assignments] })),
      updateAssignment: (id, updates) => set((s) => ({ assignments: s.assignments.map((a) => a.id === id ? { ...a, ...updates } : a) })),
      deleteAssignment: (id) => set((s) => ({ assignments: s.assignments.filter((a) => a.id !== id) })),

      // ===== Subject actions =====
      addSubject: (sub) => set((s) => ({ subjects: [...s.subjects, { ...sub, id: uid("s") }] })),
      updateSubject: (id, updates) => set((s) => ({ subjects: s.subjects.map((sub) => sub.id === id ? { ...sub, ...updates } : sub) })),
      deleteSubject: (id) => set((s) => ({ subjects: s.subjects.filter((sub) => sub.id !== id) })),
      markChapterComplete: (id) => set((s) => ({
        subjects: s.subjects.map((sub) =>
          sub.id === id && sub.completedChapters < sub.totalChapters
            ? { ...sub, completedChapters: sub.completedChapters + 1 }
            : sub
        ),
      })),

      // ===== Exam actions =====
      addExam: (e) => set((s) => ({ exams: [...s.exams, { ...e, id: uid("e") }] })),
      updateExam: (id, updates) => set((s) => ({ exams: s.exams.map((e) => e.id === id ? { ...e, ...updates } : e) })),
      deleteExam: (id) => set((s) => ({ exams: s.exams.filter((e) => e.id !== id) })),

      // ===== Book actions =====
      addBook: (b) => set((s) => ({ books: [...s.books, { ...b, id: uid("b") }] })),
      updateBook: (id, updates) => set((s) => ({ books: s.books.map((b) => b.id === id ? { ...b, ...updates } : b) })),
      deleteBook: (id) => set((s) => ({ books: s.books.filter((b) => b.id !== id) })),

      // ===== Mess actions =====
      addMessMeal: (m) => set((s) => ({ messMeals: [...s.messMeals, { ...m, id: uid("m") }] })),
      updateMessMeal: (id, updates) => set((s) => ({ messMeals: s.messMeals.map((m) => m.id === id ? { ...m, ...updates } : m) })),
      deleteMessMeal: (id) => set((s) => ({ messMeals: s.messMeals.filter((m) => m.id !== id) })),

      // ===== Hostel actions =====
      addHostelBill: (b) => set((s) => ({ hostelBills: [...s.hostelBills, { ...b, id: uid("h") }] })),
      updateHostelBill: (id, updates) => set((s) => ({ hostelBills: s.hostelBills.map((b) => b.id === id ? { ...b, ...updates } : b) })),
      deleteHostelBill: (id) => set((s) => ({ hostelBills: s.hostelBills.filter((b) => b.id !== id) })),

      // ===== Study Goal actions =====
      addStudyGoal: (g) => set((s) => ({ studyGoals: [...s.studyGoals, { ...g, id: uid("g") }] })),
      updateStudyGoal: (id, updates) => set((s) => ({ studyGoals: s.studyGoals.map((g) => g.id === id ? { ...g, ...updates } : g) })),
      deleteStudyGoal: (id) => set((s) => ({ studyGoals: s.studyGoals.filter((g) => g.id !== id) })),

      // ===== Routine actions =====
      toggleRoutineTask: (id) => set((s) => ({ routine: s.routine.map((r) => r.id === id ? { ...r, done: !r.done } : r) })),
      addRoutineTask: (t) => set((s) => ({ routine: [...s.routine, { ...t, id: uid("rt"), done: false }] })),
      deleteRoutineTask: (id) => set((s) => ({ routine: s.routine.filter((r) => r.id !== id) })),

      // ===== Class actions =====
      addClass: (c) => set((s) => ({ classes: [...s.classes, { ...c, id: uid("c"), attended: false }] })),
      deleteClass: (id) => set((s) => ({ classes: s.classes.filter((c) => c.id !== id) })),

      // ===== Reset all student data to empty (for "Start New Session") =====
      resetAllStudentData: () => set({
        classes: [],
        assignments: [],
        subjects: [],
        exams: [],
        books: [],
        messMeals: [],
        hostelBills: [],
        studyGoals: [],
        routine: [],
      }),
    }),
    {
      name: "trackly-student-data",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as any))),
    }
  )
);
