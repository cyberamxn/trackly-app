"use client";

// ===== Shared Add/Edit form modals =====
// Used by Dashboard (empty-state quick add), Habits screen and Routine screen,
// so "add" is always one tap away — no matter which screen the user is on.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "./CategoryIcon";
import { SheetModal } from "./ui";
import { istTime } from "@/lib/trackly/ist";
import { loadRoutines, saveRoutines } from "@/lib/trackly/routine";
import type { Routine } from "@/lib/trackly/data";

export const HABIT_ICONS = ["flame", "droplet", "dumbbell", "book", "footprints", "heart", "brain", "sun", "moon", "coffee", "apple", "leaf"];

export const ROUTINE_PERIODS: { id: Routine["period"]; icon: string }[] = [
  { id: "Morning", icon: "sunrise" },
  { id: "Afternoon", icon: "sun" },
  { id: "Evening", icon: "sunset" },
  { id: "Night", icon: "moon" },
];

/** Auto-pick a period from the current IST hour (same logic as QuickAdd). */
export function defaultPeriod(): Routine["period"] {
  const hour = parseInt(istTime(new Date()).split(":")[0], 10);
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

// ===== Habit form — handles BOTH add (habit=null) and edit (habit given) =====
export function HabitFormModal({
  open,
  onClose,
  onSave,
  habit,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: { name: string; icon: string; goal: number; unit: string }) => void;
  habit?: { name: string; icon: string; goal: number; unit: string } | null;
}) {
  const isEdit = !!habit;
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("flame");
  const [goal, setGoal] = useState("1");
  const [unit, setUnit] = useState("time");

  // Sync local state each time the modal opens
  useEffect(() => {
    if (open) {
      setName(habit?.name ?? "");
      setIcon(habit?.icon ?? "flame");
      setGoal(habit ? String(habit.goal) : "1");
      setUnit(habit?.unit ?? "time");
    }
  }, [open, habit]);

  return (
    <SheetModal open={open} onClose={onClose} title={isEdit ? "Edit habit" : "Add habit"}>
      <div className="space-y-4 pb-2">
        <div>
          <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Habit name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Drink Water"
            className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Daily goal</label>
            <input
              type="number"
              min="1"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] outline-none"
            />
          </div>
          <div>
            <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Unit</label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="glass, time, min…"
              className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div>
          <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Icon</label>
          <div className="grid grid-cols-6 gap-2">
            {HABIT_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`h-11 rounded-xl flex items-center justify-center transition-colors ${
                  icon === ic ? "bg-foreground text-background" : "bg-muted"
                }`}
              >
                <CategoryIcon name={ic} size={18} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-muted text-[14px] font-medium"
          >
            Cancel
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              const g = parseInt(goal, 10);
              if (!name.trim()) { toast.error("Name required"); return; }
              if (isNaN(g) || g < 1) { toast.error("Goal must be at least 1"); return; }
              onSave({ name: name.trim(), icon, goal: g, unit: unit.trim() || "time" });
            }}
            className="flex-1 h-11 rounded-xl bg-foreground text-background text-[14px] font-semibold"
          >
            {isEdit ? "Save" : "Add habit"}
          </motion.button>
        </div>
      </div>
    </SheetModal>
  );
}

// ===== Task form — add a task with a period picker (Morning/…/Night) =====
export function TaskFormModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (label: string, period: Routine["period"]) => void;
}) {
  const [label, setLabel] = useState("");
  const [period, setPeriod] = useState<Routine["period"]>("Morning");

  useEffect(() => {
    if (open) {
      setLabel("");
      setPeriod(defaultPeriod()); // smart default from current IST time
    }
  }, [open]);

  return (
    <SheetModal open={open} onClose={onClose} title="Add task">
      <div className="space-y-4 pb-2">
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && label.trim()) onSubmit(label, period);
          }}
          placeholder="e.g. Study 30 min"
          className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <div>
          <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">When?</label>
          <div className="grid grid-cols-4 gap-2">
            {ROUTINE_PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                  period === p.id ? "bg-foreground text-background" : "bg-muted text-foreground"
                }`}
              >
                <CategoryIcon name={p.icon} size={16} />
                <span className="text-[11px] font-medium">{p.id}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-muted text-[14px] font-medium"
          >
            Cancel
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onSubmit(label, period)}
            disabled={!label.trim()}
            className="flex-1 h-11 rounded-xl bg-foreground text-background text-[14px] font-semibold disabled:opacity-30"
          >
            Add task
          </motion.button>
        </div>
      </div>
    </SheetModal>
  );
}

// ===== Shared helper — add a task to routine storage & notify all screens =====
export function addTaskToRoutine(label: string, period: Routine["period"]): boolean {
  if (!label.trim() || typeof window === "undefined") return false;
  const routines = loadRoutines();
  const target = routines.find((r) => r.period === period) ?? routines[0];
  if (!target) return false;
  target.tasks = [...target.tasks, { id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label: label.trim(), done: false }];
  saveRoutines(routines);
  window.dispatchEvent(new CustomEvent("trackly-routines-changed"));
  return true;
}

// ===== Small reusable "+ Add …" pill button (empty states) =====
export function AddPillButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="mt-3 h-9 px-4 rounded-xl bg-foreground text-background text-[13px] font-semibold inline-flex items-center gap-1.5"
    >
      <Plus size={14} strokeWidth={2.5} /> {label}
    </motion.button>
  );
}

// ===== Small icon "+" button (section headers) =====
export function AddIconButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      aria-label={label}
      className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground"
    >
      <Plus size={16} strokeWidth={2.5} />
    </motion.button>
  );
}
