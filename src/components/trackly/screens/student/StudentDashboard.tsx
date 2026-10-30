"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Calendar as CalendarIcon, ChevronRight, Clock, Flame, GraduationCap,
  AlertCircle, CheckCircle2, Utensils, Home, Wallet, Brain, Bell, TrendingUp, Trash2, Check,
} from "lucide-react";
import { useTracklyStore } from "@/lib/trackly/store";
import { useStudentData } from "@/lib/trackly/studentData";
import { useAppData } from "@/lib/trackly/appData";
import { Card, ProgressBar, RingProgress, EmptyState, SheetModal } from "../../ui";
import { formatINR } from "@/lib/trackly/data";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{label}</p>
      {children}
    </div>
  );
}

export function StudentDashboard() {
  const { setScreen, openAIChat } = useTracklyStore();
  const student = useStudentData();
  const expenses = useAppData((s) => s.expenses);

  const [classFormOpen, setClassFormOpen] = useState(false);
  const [cSubject, setCSubject] = useState("");
  const [cCode, setCCode] = useState("");
  const [cRoom, setCRoom] = useState("");
  const [cTime, setCTime] = useState("09:00");
  const [cDay, setCDay] = useState(new Date().getDay());

  const addClass = () => {
    const sub = cSubject.trim();
    if (!sub) { toast.error("Subject ka naam likho"); return; }
    student.addClass({
      subject: sub,
      code: cCode.trim() || "—",
      room: cRoom.trim() || "—",
      time: cTime || "09:00",
      duration: 60,
      day: cDay,
    });
    toast.success(`“${sub}” class add ho gayi`);
    setCSubject(""); setCCode(""); setCRoom(""); setCTime("09:00");
    setClassFormOpen(false);
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayDow = new Date().getDay();

  // Today's classes
  const todayClasses = student.classes.filter((c) => c.day === todayDow);
  const attendedClasses = todayClasses.filter((c) => c.attended).length;

  // Assignments due
  const pendingAssignments = student.assignments.filter((a) => a.status !== "completed" && a.status !== "submitted");
  const dueToday = pendingAssignments.filter((a) => a.dueDate === today);
  const dueSoon = pendingAssignments.filter((a) => {
    const days = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 3;
  });

  // Next exam countdown
  const upcomingExams = student.exams
    .filter((e) => new Date(e.date).getTime() >= Date.now())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextExam = upcomingExams[0];
  const examDaysLeft = nextExam ? Math.ceil((new Date(nextExam.date).getTime() - Date.now()) / 86400000) : 0;

  // Attendance
  const totalAttended = student.subjects.reduce((s, sub) => s + sub.attendanceAttended, 0);
  const totalClasses = student.subjects.reduce((s, sub) => s + sub.attendanceTotal, 0);
  const attendancePct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

  // Syllabus completion
  const totalChapters = student.subjects.reduce((s, sub) => s + sub.totalChapters, 0);
  const completedChapters = student.subjects.reduce((s, sub) => s + sub.completedChapters, 0);
  const syllabusPct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  // Today's expenses
  const todaySpending = expenses.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);

  // Today's mess meals
  const todayMeals = student.messMeals.filter((m) => m.day === todayDow);

  // Hostel bills due
  const unpaidBills = student.hostelBills.filter((b) => !b.paid);
  const billsDueSoon = unpaidBills.filter((b) => {
    const days = Math.ceil((new Date(b.dueDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  });

  // Study goals today
  const todayGoals = student.studyGoals.filter((g) => g.date === today);
  const totalStudyMin = todayGoals.reduce((s, g) => s + g.targetMinutes, 0);
  const doneStudyMin = todayGoals.reduce((s, g) => s + g.completedMinutes, 0);

  // Routine progress
  const routineDone = student.routine.filter((r) => r.done).length;
  const routineTotal = student.routine.length;

  // Books reading progress
  const readingBooks = student.books.filter((b) => b.readPages < b.totalPages);
  const totalPages = student.books.reduce((s, b) => s + b.totalPages, 0);
  const readPages = student.books.reduce((s, b) => s + b.readPages, 0);

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      {/* Header */}
      <div className="px-5 pt-2 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground font-medium flex items-center gap-1.5">
            <GraduationCap size={14} />
            Student Mode · {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" })}
          </p>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight">Student Hub</h1>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setScreen("notifications")} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center relative" aria-label="Notifications">
          <Bell size={18} />
          {dueToday.length > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-foreground" />}
        </motion.button>
      </div>

      {/* Hero: Attendance + Syllabus */}
      <div className="px-5 mt-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="bg-foreground text-background p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] opacity-70 font-medium">Attendance</p>
                <p className="text-[40px] font-bold tracking-tight mt-1 text-display">{attendancePct}%</p>
                <div className="flex items-center gap-1.5 mt-2 text-[13px] opacity-80">
                  <CheckCircle2 size={13} />
                  <span>{totalAttended}/{totalClasses} classes attended</span>
                </div>
              </div>
              <RingProgress value={syllabusPct} size={64} stroke={5}>
                <div className="text-center">
                  <div className="text-[15px] font-bold leading-none">{syllabusPct}%</div>
                  <div className="text-[8px] opacity-70 mt-0.5 uppercase">syllabus</div>
                </div>
              </RingProgress>
            </div>
            <div className="h-px bg-background/20 my-4" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] opacity-70">Syllabus completed</p>
                <p className="text-[17px] font-semibold mt-0.5">{completedChapters}/{totalChapters} chapters</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setScreen("student-study")}
                className="text-[13px] font-medium opacity-80 flex items-center gap-0.5"
              >
                Study plan <ChevronRight size={14} />
              </motion.button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Quick stats */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        <StatCard label="Exam Countdown" value={nextExam ? `${examDaysLeft}d` : "—"} sub={nextExam?.subject ?? "No exams"} icon={<CalendarIcon size={14} />} onClick={() => setScreen("student-exams")} />
        <StatCard label="Pending Tasks" value={pendingAssignments.length} sub={`${dueToday.length} due today`} icon={<AlertCircle size={14} />} onClick={() => setScreen("student-assignments")} />
      </div>

      {/* Today's Classes */}
      <Section
        title="Today's Classes"
        action="Full schedule"
        onAction={() => setScreen("student-routine")}
        extra={
          <button onClick={() => setClassFormOpen(true)} className="text-[13px] text-muted-foreground font-medium">
            + Add
          </button>
        }
      >
        {todayClasses.length === 0 ? (
          <EmptyState title="No classes today" description="Enjoy your free day — ya + Add se class schedule karo!" />
        ) : (
          <Card className="p-0 overflow-hidden">
            {todayClasses.map((c, i, arr) => (
              <div key={c.id} className={`flex items-center ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={() => { student.toggleClassAttended(c.id); toast.success(c.attended ? "Marked absent" : "Marked attended"); }}
                  className="flex-1 flex items-center gap-3 px-4 py-3 text-left min-w-0"
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${c.attended ? "bg-foreground text-background" : "bg-muted"}`}>
                    <BookOpen size={18} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[15px] font-medium truncate">{c.subject}</p>
                    <p className="text-[12px] text-muted-foreground">{c.code} · {c.room} · {c.time}</p>
                  </div>
                  {c.attended ? (
                    <CheckCircle2 size={20} className="text-foreground" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40" />
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  aria-label={`Delete ${c.subject} class`}
                  onClick={() => { student.deleteClass(c.id); toast.success("Class deleted"); }}
                  className="px-3 py-3 text-muted-foreground shrink-0"
                >
                  <Trash2 size={16} />
                </motion.button>
              </div>
            ))}
          </Card>
        )}
      </Section>

      {/* Add class sheet */}
      <SheetModal open={classFormOpen} onClose={() => setClassFormOpen(false)} title="Add Class">
        <div className="space-y-4">
          <Field label="SUBJECT">
            <input value={cSubject} onChange={(e) => setCSubject(e.target.value)} placeholder="e.g. Data Structures" className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CODE">
              <input value={cCode} onChange={(e) => setCCode(e.target.value)} placeholder="e.g. CS201" className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground" />
            </Field>
            <Field label="ROOM">
              <input value={cRoom} onChange={(e) => setCRoom(e.target.value)} placeholder="e.g. A-101" className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="TIME">
              <input type="time" value={cTime} onChange={(e) => setCTime(e.target.value || "09:00")} className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none" />
            </Field>
            <Field label="DAY">
              <select value={cDay} onChange={(e) => setCDay(parseInt(e.target.value, 10))} className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none">
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </Field>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Class sirf us din ke hub pe dikhegi (day ke hisaab se). Tap karke attendance mark karo.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={addClass}
            className="w-full h-[52px] rounded-2xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2"
          >
            <Check size={18} /> Add Class
          </motion.button>
        </div>
      </SheetModal>

      {/* Today's Tasks (Assignments) */}
      <Section title="Assignments Due" action="All" onAction={() => setScreen("student-assignments")}>
        {dueSoon.length === 0 ? (
          <EmptyState title="All caught up!" description="No assignments due soon." />
        ) : (
          <Card className="p-0 overflow-hidden">
            {dueSoon.slice(0, 4).map((a, i, arr) => {
              const days = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000);
              const urgent = days <= 1;
              return (
                <motion.div
                  key={a.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setScreen("student-assignments")}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${urgent ? "bg-foreground text-background" : "bg-muted"}`}>
                    <AlertCircle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium truncate">{a.title}</p>
                    <p className="text-[12px] text-muted-foreground">{a.subject} · {a.priority}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[13px] font-semibold ${urgent ? "text-foreground" : "text-muted-foreground"}`}>
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                    </p>
                    <p className="text-[11px] text-muted-foreground capitalize">{a.status.replace("-", " ")}</p>
                  </div>
                </motion.div>
              );
            })}
          </Card>
        )}
      </Section>

      {/* Today's Meals */}
      <Section title="Today's Meals" action="Mess" onAction={() => setScreen("student-mess")}>
        {todayMeals.length === 0 ? (
          <EmptyState title="No meals scheduled" description="Add your mess menu." />
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
            {todayMeals.map((m) => (
              <motion.div
                key={m.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setScreen("student-mess")}
                className="shrink-0 w-[150px] bg-card border border-border rounded-2xl p-3.5"
              >
                <div className="flex items-center justify-between">
                  <Utensils size={14} className="text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{m.time}</span>
                </div>
                <p className="text-[13px] font-semibold mt-2 capitalize">{m.meal}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{m.menu}</p>
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      {/* Rent & Bills */}
      <Section title="Rent & Bills" action="All" onAction={() => setScreen("student-hostel")}>
        <Card className="p-0 overflow-hidden">
          {billsDueSoon.slice(0, 3).map((b, i, arr) => {
            const days = Math.ceil((new Date(b.dueDate).getTime() - Date.now()) / 86400000);
            return (
              <motion.div
                key={b.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => setScreen("student-hostel")}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${i < arr.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Home size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium truncate">{b.label}</p>
                  <p className="text-[12px] text-muted-foreground capitalize">{b.type} · {days === 0 ? "Due today" : `${days}d left`}</p>
                </div>
                <p className="text-[15px] font-semibold tabular-nums">{formatINR(b.amount)}</p>
              </motion.div>
            );
          })}
          {billsDueSoon.length === 0 && (
            <EmptyState title="No bills due" description="All paid up!" />
          )}
        </Card>
      </Section>

      {/* Study Goals + Expenses */}
      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        <motion.div whileTap={{ scale: 0.97 }} onClick={() => setScreen("student-study")}>
          <Card className="h-full">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Brain size={12} />
              STUDY TODAY
            </div>
            <p className="text-[20px] font-bold mt-1.5 text-display">{doneStudyMin}/{totalStudyMin}m</p>
            <ProgressBar value={totalStudyMin > 0 ? (doneStudyMin / totalStudyMin) * 100 : 0} className="mt-2 h-1.5" />
          </Card>
        </motion.div>
        <motion.div whileTap={{ scale: 0.97 }} onClick={() => setScreen("student-budget")}>
          <Card className="h-full">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Wallet size={12} />
              SPENT TODAY
            </div>
            <p className="text-[20px] font-bold mt-1.5 text-display">{formatINR(todaySpending)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Today's expenses</p>
          </Card>
        </motion.div>
      </div>

      {/* Daily Routine */}
      <Section title="Daily Routine" action="Track" onAction={() => setScreen("student-routine")}>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[15px] font-semibold">{routineDone}/{routineTotal} completed</p>
            <span className="text-[20px] font-bold tabular-nums">{Math.round((routineDone / routineTotal) * 100)}%</span>
          </div>
          <ProgressBar value={(routineDone / routineTotal) * 100} className="h-2" />
        </Card>
      </Section>

      {/* Reading Progress */}
      <Section title="Reading Progress" action="Library" onAction={() => setScreen("student-books")}>
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[14px] font-medium">{readPages.toLocaleString()} / {totalPages.toLocaleString()} pages</p>
              <p className="text-[12px] text-muted-foreground">{readingBooks.length} books in progress</p>
            </div>
            <span className="text-[20px] font-bold tabular-nums">{totalPages > 0 ? Math.round((readPages / totalPages) * 100) : 0}%</span>
          </div>
          <ProgressBar value={totalPages > 0 ? (readPages / totalPages) * 100 : 0} className="h-2" />
        </Card>
      </Section>

      {/* AI Study Assistant */}
      <div className="px-5 mt-5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // Real AI needs a session — anonymous demo visitors fall back
            // to the offline canned assistant (works without auth).
            supabase.auth
              .getSession()
              .then(({ data }) => {
                if (data.session) openAIChat("student");
                else setScreen("student-ai");
              })
              .catch(() => setScreen("student-ai"));
          }}
          className="w-full rounded-2xl border border-dashed border-border p-4 flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center">
            <Brain size={18} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-semibold">AI Study Assistant</p>
            <p className="text-[12px] text-muted-foreground">Real AI — study plans, data actions & tips</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </motion.button>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, onClick }: { label: string; value: string | number; sub: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} onClick={onClick}>
      <Card>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
          {icon}
          {label}
        </div>
        <p className="text-[20px] font-bold mt-1.5 text-display">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </Card>
    </motion.div>
  );
}

function Section({ title, action, onAction, extra, children }: { title: string; action?: string; onAction?: () => void; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="px-5 flex items-center justify-between mb-2.5">
        <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
        <div className="flex items-center gap-3">
          {extra}
          {action && (
            <button onClick={onAction} className="text-[13px] text-muted-foreground font-medium">
              {action}
            </button>
          )}
        </div>
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}
