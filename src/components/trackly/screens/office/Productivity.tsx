"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer, Play, Pause, RotateCcw, Target, Plus, Check, Trash2, X,
} from "lucide-react";
import { ScreenHeader, Card, ProgressBar } from "../../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { useOfficeData } from "@/lib/trackly/officeData";
import { toast } from "sonner";

export function Productivity() {
  const { setScreen } = useTracklyStore();
  const office = useOfficeData();

  // Pomodoro
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoTask, setPomoTask] = useState("");

  // Add daily goal
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("1");
  const [goalUnit, setGoalUnit] = useState("tasks");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const todayPomodoros = office.pomodoros.filter((p) => p.date === today && p.completed);
  const totalPomoMinutes = todayPomodoros.reduce((s, p) => s + p.duration, 0);

  useEffect(() => {
    if (pomoRunning && pomoTime > 0) {
      intervalRef.current = setInterval(() => {
        setPomoTime((t) => {
          if (t <= 1) {
            setPomoRunning(false);
            office.addPomodoro({ date: today, duration: 25, task: pomoTask || "Focus session", completed: true });
            toast.success("Pomodoro completed! 🍅 Take a 5-min break.");
            return 25 * 60;
          }
          return t - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [pomoRunning]);

  const mins = Math.floor(pomoTime / 60);
  const secs = pomoTime % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const pomoPct = Math.round(((25 * 60 - pomoTime) / (25 * 60)) * 100);

  const resetPomo = () => {
    setPomoRunning(false);
    setPomoTime(25 * 60);
  };

  // Daily goals
  const goals = office.dailyGoals.filter((g) => g.date === today);
  const totalProgress = goals.length > 0
    ? Math.round((goals.reduce((s, g) => s + g.done / g.target, 0) / goals.length) * 100)
    : 0;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader title="Productivity" subtitle="Pomodoro & daily goals" onBack={() => setScreen("office-dashboard")} />

      {/* Pomodoro Timer */}
      <div className="px-5 mt-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-foreground text-background p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Timer size={18} />
            <p className="text-[13px] uppercase tracking-wider opacity-70 font-semibold">Pomodoro Focus</p>
          </div>
          <p className="text-[56px] font-bold tracking-tighter text-display tabular-nums">{timeStr}</p>
          <div className="mt-2 mb-4">
            <div className="h-1.5 rounded-full bg-background/20 overflow-hidden">
              <motion.div
                className="h-full bg-background rounded-full"
                animate={{ width: `${pomoPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <input
            value={pomoTask}
            onChange={(e) => setPomoTask(e.target.value)}
            placeholder="What are you working on?"
            className="w-full h-10 px-4 rounded-xl bg-background/10 text-[13px] outline-none placeholder:text-background/50 text-center mb-4"
          />
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setPomoRunning(!pomoRunning)}
              className="flex-1 h-12 rounded-xl bg-background text-foreground font-semibold text-[15px] flex items-center justify-center gap-2"
            >
              {pomoRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={resetPomo}
              className="h-12 w-12 rounded-xl bg-background/15 flex items-center justify-center"
            >
              <RotateCcw size={18} />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Pomodoro stats */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-[24px] font-bold text-display">{todayPomodoros.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Sessions Today</p>
        </Card>
        <Card className="text-center">
          <p className="text-[24px] font-bold text-display">{totalPomoMinutes}m</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Focus Minutes</p>
        </Card>
      </div>

      {/* Daily Goals */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[18px] font-bold tracking-tight flex items-center gap-2">
            <Target size={18} /> Daily Goals
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground font-medium">{totalProgress}% done</span>
            <button onClick={() => setShowAddGoal(true)} className="text-[13px] text-muted-foreground font-medium flex items-center gap-0.5"><Plus size={14} /> Add</button>
          </div>
        </div>
        <div className="space-y-2">
          {goals.map((g) => {
            const pct = Math.round((g.done / g.target) * 100);
            return (
              <Card key={g.id}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold">{g.title}</p>
                    <p className="text-[11px] text-muted-foreground">{g.done} / {g.target} {g.unit} · {pct}%</p>
                    <ProgressBar value={pct} className="h-2 mt-2" />
                  </div>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => office.incrementDailyGoal(g.id)} className="h-10 w-10 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0"><Plus size={18} strokeWidth={2.5} /></motion.button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => { office.deleteDailyGoal(g.id); toast.success("Goal deleted"); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0"><Trash2 size={13} /></motion.button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent pomodoro sessions */}
      {todayPomodoros.length > 0 && (
        <div className="px-5 mt-5">
          <h2 className="text-[18px] font-bold tracking-tight mb-2">Today's Sessions</h2>
          <div className="space-y-2">
            {todayPomodoros.map((p) => (
              <Card key={p.id}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate">{p.task}</p>
                    <p className="text-[11px] text-muted-foreground">{p.duration} min focus session</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">🍅</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Daily Goal modal */}
      <AnimatePresence>
        {showAddGoal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddGoal(false)} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} className="fixed sheet-bottom left-0 right-0 z-50 rounded-t-[32px] bg-background sheet-safe-pb">
              <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
              <div className="px-5 pt-2">
                <div className="flex items-center justify-between mb-4"><h2 className="text-[20px] font-bold">Add Daily Goal</h2><button onClick={() => setShowAddGoal(false)} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><X size={16} /></button></div>
                <div className="space-y-3">
                  <div><label className="text-[12px] text-muted-foreground font-medium">Goal title</label><input autoFocus value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="e.g. Read 10 pages" className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[12px] text-muted-foreground font-medium">Target</label><input type="text" inputMode="numeric" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 10" className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none" /></div>
                    <div><label className="text-[12px] text-muted-foreground font-medium">Unit</label><input value={goalUnit} onChange={(e) => setGoalUnit(e.target.value)} placeholder="e.g. pages" className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none" /></div>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (!goalTitle.trim()) { toast.error("Title required"); return; } office.addDailyGoal({ title: goalTitle.trim(), target: parseInt(goalTarget) || 1, done: 0, unit: goalUnit.trim() || "items", date: today }); toast.success("Goal added"); setGoalTitle(""); setGoalTarget("1"); setGoalUnit("tasks"); setShowAddGoal(false); }} className="w-full h-[52px] mt-2 rounded-2xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2"><Check size={18} /> Add Goal</motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
