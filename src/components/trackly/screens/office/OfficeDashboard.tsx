"use client";

import { motion } from "framer-motion";
import {
  Briefcase, ChevronRight, Clock, CheckCircle2, Circle, Loader2,
  Calendar as CalendarIcon, Wallet, Target, TrendingUp, Bell, Plus,
  Search, Settings as SettingsIcon,
} from "lucide-react";
import { useTracklyStore } from "@/lib/trackly/store";
import { useOfficeData } from "@/lib/trackly/officeData";
import { useAppData } from "@/lib/trackly/appData";
import { Card, ProgressBar, RingProgress } from "../../ui";
import { formatINR } from "@/lib/trackly/data";
import { toast } from "sonner";

export function OfficeDashboard() {
  const { setScreen, openQuickAdd } = useTracklyStore();
  const office = useOfficeData();
  const expenses = useAppData((s) => s.expenses);

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const hour = now.getHours();

  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : hour < 21 ? "Good Evening" : "Good Night";

  // Today's tasks
  const todayTasks = office.tasks.filter((t) => t.deadline === today);
  const pendingTasks = todayTasks.filter((t) => t.status !== "done");
  const doneTasks = todayTasks.filter((t) => t.status === "done");

  // Today's meetings
  const todayMeetings = office.meetings.filter((m) => m.date === today && m.type === "meeting");
  const nextMeeting = todayMeetings[0];

  // Today's expenses
  const todayExpenses = expenses.filter((e) => e.date === today);
  const todaySpending = todayExpenses.reduce((s, e) => s + e.amount, 0);

  // Attendance
  const todayAtt = office.todayAttendance();
  const isCheckedIn = !!todayAtt?.checkIn;
  const workHours = todayAtt?.workHours ?? 0;

  // Daily goals
  const goals = office.dailyGoals.filter((g) => g.date === today);
  const totalGoalProgress = goals.length > 0
    ? Math.round((goals.reduce((s, g) => s + g.done / g.target, 0) / goals.length) * 100)
    : 0;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      {/* Header */}
      <div className="px-5 pt-2 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground font-medium">{now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" })}</p>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight">Office</h1>
        </div>
        <div className="flex items-center gap-1">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setScreen("search")} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center" aria-label="Search">
            <Search size={18} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setScreen("notifications")} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center relative" aria-label="Notifications">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-foreground" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setScreen("settings")} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center" aria-label="Settings">
            <SettingsIcon size={18} />
          </motion.button>
        </div>
      </div>

      {/* Greeting */}
      <div className="px-5 mt-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-foreground text-background p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-background/15 flex items-center justify-center shrink-0">
              <Briefcase size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">{greeting}</p>
              <h2 className="text-[22px] font-bold tracking-tight leading-tight">Let's get to work!</h2>
              <p className="text-[13px] opacity-80 mt-0.5">
                {pendingTasks.length} tasks pending · {todayMeetings.length} meetings today
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick stats row */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScreen("office-tasks")}>
          <Card>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <CheckCircle2 size={14} />
              Today's Tasks
            </div>
            <p className="text-[24px] font-bold mt-1.5 text-display">
              {doneTasks.length}<span className="text-[14px] text-muted-foreground">/{todayTasks.length}</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{pendingTasks.length} pending</p>
          </Card>
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScreen("office-attendance")}>
          <Card>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Clock size={14} />
              Work Hours
            </div>
            <p className="text-[24px] font-bold mt-1.5 text-display">{workHours.toFixed(1)}h</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isCheckedIn ? `Checked in at ${todayAtt?.checkIn}` : "Not checked in"}
            </p>
          </Card>
        </motion.button>
      </div>

      {/* Next Meeting */}
      {nextMeeting && (
        <div className="px-5 mt-3">
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setScreen("office-calendar")} className="w-full text-left">
            <Card>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <CalendarIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Next Meeting</p>
                  <p className="text-[15px] font-semibold truncate">{nextMeeting.title}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {nextMeeting.time} · {nextMeeting.duration}min · {nextMeeting.location}
                  </p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              </div>
            </Card>
          </motion.button>
        </div>
      )}

      {/* Today's Spending */}
      <div className="px-5 mt-3">
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setScreen("office-salary")} className="w-full text-left">
          <Card>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Wallet size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Today's Spending</p>
                <p className="text-[20px] font-bold mt-0.5">{formatINR(todaySpending)}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">{todayExpenses.length} transactions</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </div>
          </Card>
        </motion.button>
      </div>

      {/* Daily Goal */}
      <div className="px-5 mt-3">
        <Card>
          <div className="flex items-center gap-3">
            <RingProgress value={totalGoalProgress} size={56} stroke={5}>
              <div className="text-center">
                <div className="text-[12px] font-bold leading-none">{totalGoalProgress}%</div>
              </div>
            </RingProgress>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                <Target size={12} />
                Daily Goal
              </div>
              <p className="text-[15px] font-semibold mt-0.5">
                {goals.reduce((s, g) => s + g.done, 0)} / {goals.reduce((s, g) => s + g.target, 0)} completed
              </p>
              <div className="mt-2 space-y-1">
                {goals.slice(0, 2).map((g) => (
                  <div key={g.id} className="flex items-center gap-2">
                    <p className="text-[11px] text-muted-foreground flex-1 truncate">{g.title}</p>
                    <p className="text-[11px] font-medium tabular-nums">{g.done}/{g.target} {g.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Today's Tasks list */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[18px] font-bold tracking-tight">Today's Tasks</h2>
          <button onClick={() => setScreen("office-tasks")} className="text-[13px] text-muted-foreground font-medium">
            View all
          </button>
        </div>
        {todayTasks.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted-foreground text-center py-4">No tasks for today. Enjoy! 🎉</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayTasks.slice(0, 4).map((t) => (
              <motion.div key={t.id} layout whileTap={{ scale: 0.99 }}>
                <Card className={t.status === "done" ? "opacity-60" : ""}>
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => office.cycleTaskStatus(t.id)}
                      className="shrink-0"
                    >
                      {t.status === "done" ? (
                        <CheckCircle2 size={22} className="text-foreground" />
                      ) : t.status === "in-progress" ? (
                        <Loader2 size={22} className="text-foreground animate-spin" />
                      ) : (
                        <Circle size={22} className="text-muted-foreground" />
                      )}
                    </motion.button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[14px] font-semibold ${t.status === "done" ? "line-through" : ""}`}>{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{t.project}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          t.priority === "high" ? "bg-foreground text-background" :
                          t.priority === "medium" ? "bg-muted" : "border border-border"
                        }`}>
                          {t.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick navigation */}
      <div className="px-5 mt-5">
        <h2 className="text-[18px] font-bold tracking-tight mb-2">Quick Access</h2>
        <div className="grid grid-cols-2 gap-2">
          <QuickNav icon={<CalendarIcon size={16} />} label="Calendar" onClick={() => setScreen("office-calendar")} />
          <QuickNav icon={<Clock size={16} />} label="Attendance" onClick={() => setScreen("office-attendance")} />
          <QuickNav icon={<Wallet size={16} />} label="Salary" onClick={() => setScreen("office-salary")} />
          <QuickNav icon={<Target size={16} />} label="Productivity" onClick={() => setScreen("office-productivity")} />
          <QuickNav icon={<TrendingUp size={16} />} label="Analytics" onClick={() => setScreen("office-analytics")} />
          <QuickNav icon={<Plus size={16} />} label="Quick Add" onClick={openQuickAdd} />
        </div>
      </div>
    </div>
  );
}

function QuickNav({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}>
      <Card className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
        <span className="text-[13px] font-semibold">{label}</span>
        <ChevronRight size={14} className="text-muted-foreground ml-auto" />
      </Card>
    </motion.button>
  );
}
