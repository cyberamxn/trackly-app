"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Sunrise, Sun, Sunset, Moon, BookOpen, Utensils, Brain, Dumbbell,
  FileText, Repeat, CheckCircle2, Circle, Clock, Trash2, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useStudentData } from "@/lib/trackly/studentData";
import {
  ScreenHeader, ScreenWrapper, Card, EmptyState, SheetModal,
} from "../../ui";
import type { LucideIcon } from "lucide-react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{label}</p>
      {children}
    </div>
  );
}

const ICON_MAP: Record<string, LucideIcon> = {
  sunrise: Sunrise,
  sun: Sun,
  sunset: Sunset,
  moon: Moon,
  "book-open": BookOpen,
  utensils: Utensils,
  brain: Brain,
  dumbbell: Dumbbell,
  "file-text": FileText,
  repeat: Repeat,
};

function iconFor(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle;
}

function timePeriod(time: string): "Morning" | "Afternoon" | "Evening" | "Night" {
  const h = parseInt(time.split(":")[0] ?? "0", 10);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Evening";
  return "Night";
}

const PERIOD_ORDER: Record<string, number> = {
  Morning: 0,
  Afternoon: 1,
  Evening: 2,
  Night: 3,
};

const PERIOD_ICON: Record<string, LucideIcon> = {
  Morning: Sunrise,
  Afternoon: Sun,
  Evening: Sunset,
  Night: Moon,
};

export function Routine() {
  const { setScreen } = useTracklyStore();
  const student = useStudentData();
  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("08:00");

  const addTask = () => {
    const l = label.trim();
    if (!l) { toast.error("Task ka naam likho"); return; }
    student.addRoutineTask({ label: l, time, icon: "book-open" });
    toast.success(`“${l}” routine me add ho gaya`);
    setLabel("");
    setTime("08:00");
    setAddOpen(false);
  };

  const sorted = useMemo(
    () => [...student.routine].sort((a, b) => a.time.localeCompare(b.time)),
    [student.routine]
  );

  const grouped = useMemo(() => {
    const groups: Record<string, typeof sorted> = { Morning: [], Afternoon: [], Evening: [], Night: [] };
    for (const t of sorted) {
      const p = timePeriod(t.time);
      groups[p].push(t);
    }
    return groups;
  }, [sorted]);

  const doneCount = student.routine.filter((r) => r.done).length;
  const totalCount = student.routine.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Find next task (first not done after current time)
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextTask = sorted.find((t) => {
    if (t.done) return false;
    const [h, m] = t.time.split(":").map((x) => parseInt(x, 10));
    return h * 60 + m >= nowMin;
  }) ?? sorted.find((t) => !t.done);

  const toggle = (id: string, label: string, wasDone: boolean) => {
    student.toggleRoutineTask(id);
    toast.success(wasDone ? `Unchecked: ${label}` : `Done: ${label}`);
  };

  return (
    <ScreenWrapper>
      <ScreenHeader
        title="Student Routine"
        subtitle="Your daily timeline"
        onBack={() => setScreen("student-dashboard")}
        right={
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setAddOpen(true)}
            aria-label="Add routine task"
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
          </motion.button>
        }
      />

      {/* Add task sheet */}
      <SheetModal open={addOpen} onClose={() => setAddOpen(false)} title="Add Routine Task">
        <div className="space-y-4">
          <Field label="TASK">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Revise DS notes"
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </Field>
          <Field label="TIME">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value || "08:00")}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none"
            />
          </Field>
          <p className="text-[12px] text-muted-foreground">
            Task apne time ke hisaab se timeline me jaayega (Morning / Afternoon / Evening / Night).
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={addTask}
            className="w-full h-[52px] rounded-2xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2"
          >
            <Check size={18} /> Add Task
          </motion.button>
        </div>
      </SheetModal>

      {/* Progress card */}
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="bg-foreground text-background">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Today's Progress</p>
                <p className="text-[28px] font-bold tracking-tight mt-0.5 text-display">
                  {doneCount}<span className="opacity-60 text-[18px]">/{totalCount}</span>
                </p>
                <p className="text-[12px] opacity-80 mt-0.5">tasks completed</p>
              </div>
              <div className="text-right">
                <p className="text-[32px] font-bold tabular-nums text-display">{pct}%</p>
                <p className="text-[10px] opacity-70 uppercase tracking-wider">{now.toLocaleDateString("en-US", { weekday: "long" })}</p>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-background/20 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                className="h-full bg-background rounded-full"
              />
            </div>
            {nextTask && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-background/10">
                <Clock size={14} className="opacity-90 shrink-0" />
                <p className="text-[12px] opacity-90">
                  Next: <span className="font-semibold">{nextTask.label}</span> at {nextTask.time}
                </p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Timeline */}
      <div className="px-5 mt-5 pb-32">
        {totalCount === 0 ? (
          <Card>
            <EmptyState
              icon={<Clock size={20} className="text-muted-foreground" />}
              title="No routine yet"
              description="Your daily tasks will appear here as a timeline."
            />
          </Card>
        ) : (
          <div className="space-y-5">
            {Object.keys(grouped)
              .sort((a, b) => PERIOD_ORDER[a] - PERIOD_ORDER[b])
              .map((period) => {
                const tasks = grouped[period];
                if (tasks.length === 0) return null;
                const PeriodIcon = PERIOD_ICON[period];
                const periodDone = tasks.filter((t) => t.done).length;
                return (
                  <div key={period}>
                    <div className="flex items-center justify-between mb-2.5 px-1">
                      <div className="flex items-center gap-2">
                        <PeriodIcon size={15} className="text-muted-foreground" />
                        <h2 className="text-[15px] font-bold tracking-tight">{period}</h2>
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular-nums font-medium">
                        {periodDone}/{tasks.length}
                      </span>
                    </div>
                    <Card className="p-0 overflow-hidden">
                      {tasks.map((t, i, arr) => {
                        const Icon = iconFor(t.icon);
                        const isLast = i === arr.length - 1;
                        return (
                          <div
                            key={t.id}
                            className={`flex items-center ${isLast ? "" : "border-b border-border"} ${t.done ? "opacity-60" : ""}`}
                          >
                            <motion.button
                              whileTap={{ scale: 0.99 }}
                              onClick={() => toggle(t.id, t.label, t.done)}
                              className="flex-1 flex items-center gap-3 px-4 py-3 text-left min-w-0"
                            >
                              <div className="flex flex-col items-center shrink-0 w-12">
                                <span className="text-[12px] font-bold tabular-nums">{t.time}</span>
                                {!isLast && <div className="w-px h-6 bg-border mt-1.5" />}
                              </div>
                              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${t.done ? "bg-foreground text-background" : "bg-muted"}`}>
                                <Icon size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[15px] font-medium truncate ${t.done ? "line-through" : ""}`}>{t.label}</p>
                              </div>
                              {t.done ? (
                                <CheckCircle2 size={22} className="text-foreground shrink-0" />
                              ) : (
                                <Circle size={22} className="text-muted-foreground shrink-0" />
                              )}
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              aria-label={`Delete ${t.label}`}
                              onClick={() => { student.deleteRoutineTask(t.id); toast.success("Task deleted"); }}
                              className="px-3 py-3 text-muted-foreground shrink-0"
                            >
                              <Trash2 size={16} />
                            </motion.button>
                          </div>
                        );
                      })}
                    </Card>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </ScreenWrapper>
  );
}
