"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "../CategoryIcon";
import { Card, ProgressBar, ScreenHeader, RingProgress, SheetModal } from "../ui";
import { ActionSheet } from "../ActionSheet";
import { TaskFormModal, AddIconButton, addTaskToRoutine } from "../FormModals";
import type { Routine, RoutineTask } from "@/lib/trackly/data";
import { EMPTY_ROUTINES, loadRoutines, saveRoutines } from "@/lib/trackly/routine";
import { useTrashStore } from "@/lib/trackly/trash";
import { useTracklyStore } from "@/lib/trackly/store";

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function Routine() {
  const { setScreen } = useTracklyStore();
  const [routines, setRoutines] = useState<Routine[]>(EMPTY_ROUTINES);
  const [hydrated, setHydrated] = useState(false);
  const addToTrash = useTrashStore((s) => s.addToTrash);
  const [actionTarget, setActionTarget] = useState<{ routine: Routine; task: RoutineTask } | null>(null);
  const [addOpen, setAddOpen] = useState<{ routineId: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ routine: Routine; task: RoutineTask } | null>(null);
  const [headerAddOpen, setHeaderAddOpen] = useState(false);

  // Hydrate from localStorage on mount (+ live refresh when QuickAdd/Trash modify routine storage)
  useEffect(() => {
    const refresh = () => setRoutines(loadRoutines());
    refresh();
    setHydrated(true);
    window.addEventListener("trackly-routines-changed", refresh);
    return () => window.removeEventListener("trackly-routines-changed", refresh);
  }, []);

  // Persist on every change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveRoutines(routines);
  }, [routines, hydrated]);

  const toggleTask = (routineId: string, taskId: string) => {
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routineId
          ? { ...r, tasks: r.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
          : r
      )
    );
  };

  const addTask = (routineId: string, label: string) => {
    if (!label.trim()) return;
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routineId
          ? { ...r, tasks: [...r.tasks, { id: uid("t"), label: label.trim(), done: false }] }
          : r
      )
    );
    toast.success("Task added");
  };

  const editTask = (routineId: string, taskId: string, newLabel: string) => {
    if (!newLabel.trim()) return;
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routineId
          ? { ...r, tasks: r.tasks.map((t) => (t.id === taskId ? { ...t, label: newLabel.trim() } : t)) }
          : r
      )
    );
    toast.success("Task updated");
  };

  const deleteTask = (routineId: string, taskId: string) => {
    // Soft delete — task moves to the Deleted Items folder (counted, restorable)
    const routine = routines.find((r) => r.id === routineId);
    const task = routine?.tasks.find((t) => t.id === taskId);
    if (routine && task) {
      addToTrash({
        type: "task",
        title: task.label,
        subtitle: `${routine.period} · task`,
        data: task,
        meta: { routineId: routine.id, period: routine.period },
      });
    }
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routineId ? { ...r, tasks: r.tasks.filter((t) => t.id !== taskId) } : r
      )
    );
    toast.success("Task moved to Deleted Items");
  };

  const allTasks = routines.flatMap((r) => r.tasks);
  const doneCount = allTasks.filter((t) => t.done).length;
  const pct = allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Routine"
        subtitle="Daily structure"
        large
        onBack={() => setScreen("dashboard")}
        right={
          <AddIconButton onClick={() => setHeaderAddOpen(true)} label="Add task" />
        }
      />

      <div className="px-5 mt-1">
        <Card className="bg-foreground text-background">
          <div className="flex items-center gap-5">
            <RingProgress value={pct} size={80} stroke={7}>
              <div className="text-center">
                <div className="text-[20px] font-bold leading-none">{pct}%</div>
                <div className="text-[9px] opacity-70 mt-0.5 uppercase">Done</div>
              </div>
            </RingProgress>
            <div>
              <p className="text-[14px] opacity-80">Today's routine</p>
              <p className="text-[22px] font-bold mt-1">{doneCount} / {allTasks.length} tasks</p>
              <p className="text-[12px] opacity-70 mt-1">Tap a task for options · tap its circle to mark done.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {routines.map((r) => {
          const tdone = r.tasks.filter((t) => t.done).length;
          const tpct = r.tasks.length > 0 ? Math.round((tdone / r.tasks.length) * 100) : 0;
          return (
            <div key={r.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CategoryIcon name={r.icon} size={16} />
                  <h2 className="text-[17px] font-bold tracking-tight">{r.period}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground font-medium">{tdone}/{r.tasks.length}</span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setAddOpen({ routineId: r.id })}
                    className="h-6 w-6 rounded-full bg-muted flex items-center justify-center"
                    aria-label="Add task"
                  >
                    <Plus size={14} />
                  </motion.button>
                </div>
              </div>
              <Card className="p-0 overflow-hidden">
                {r.tasks.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-[13px] text-muted-foreground">No tasks yet</p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAddOpen({ routineId: r.id })}
                      className="mt-2 h-8 px-3 rounded-lg bg-foreground text-background text-[12px] font-medium inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> Add task
                    </motion.button>
                  </div>
                ) : (
                  r.tasks.map((t, i, arr) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      isLast={i === arr.length - 1}
                      onToggle={() => toggleTask(r.id, t.id)}
                      onShowOptions={() => setActionTarget({ routine: r, task: t })}
                    />
                  ))
                )}
              </Card>
              <ProgressBar value={tpct} className="mt-2 h-1" />
            </div>
          );
        })}
      </div>

      {/* ===== Task options — opens on direct TAP (Edit / Delete) ===== */}
      <ActionSheet
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={actionTarget?.task.label || "Task"}
        subtitle={actionTarget?.routine.period}
        onEdit={() => {
          if (actionTarget) setEditTarget(actionTarget);
        }}
        onDelete={() => {
          if (actionTarget) deleteTask(actionTarget.routine.id, actionTarget.task.id);
        }}
        editLabel="Edit task"
        deleteLabel="Delete — move to Deleted Items"
      />

      {/* ===== Add Task (header +) — with period picker ===== */}
      <TaskFormModal
        open={headerAddOpen}
        onClose={() => setHeaderAddOpen(false)}
        onSubmit={(label, period) => {
          if (addTaskToRoutine(label, period)) {
            toast.success(`Task added to ${period}`);
            setHeaderAddOpen(false);
          }
        }}
      />

      {/* ===== Add Task Modal (per-period + buttons) ===== */}
      <AddEditTaskModal
        open={!!addOpen}
        onClose={() => setAddOpen(null)}
        title="Add task"
        initialLabel=""
        onSubmit={(label) => {
          if (addOpen) addTask(addOpen.routineId, label);
          setAddOpen(null);
        }}
      />

      {/* ===== Edit Task Modal ===== */}
      <AddEditTaskModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit task"
        initialLabel={editTarget?.task.label || ""}
        onSubmit={(label) => {
          if (editTarget) editTask(editTarget.routine.id, editTarget.task.id, label);
          setEditTarget(null);
        }}
      />
    </div>
  );
}

// ===== Task Row: circle tap = toggle done, tap anywhere else = options sheet =====
function TaskRow({
  task,
  isLast,
  onToggle,
  onShowOptions,
}: {
  task: RoutineTask;
  isLast: boolean;
  onToggle: () => void;
  onShowOptions: () => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFiredRef = useRef(false);

  const handlePressStart = () => {
    longFiredRef.current = false;
    longPressTimer.current = setTimeout(() => {
      longFiredRef.current = true;
      onShowOptions();
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Direct tap on the task → options sheet (Edit / Delete). Long-press opens the same.
  const handleTap = () => {
    if (longFiredRef.current) {
      longFiredRef.current = false;
      return; // long-press already fired — ignore the trailing click
    }
    onShowOptions();
  };

  return (
    <div className={`w-full flex items-center gap-3 px-4 py-3 ${isLast ? "" : "border-b border-border"}`}>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onToggle}
        aria-label={task.done ? `Mark "${task.label}" pending` : `Mark "${task.label}" done`}
        className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center transition-colors ${task.done ? "bg-foreground" : "border-2 border-muted-foreground/40"}`}
      >
        {task.done && <Check size={14} className="text-background" strokeWidth={3} />}
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.99 }}
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerLeave={handlePressEnd}
        onClick={handleTap}
        className="flex-1 min-w-0 text-left"
      >
        <span className={`text-[14px] transition-colors ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.label}</span>
      </motion.button>
    </div>
  );
}

// ===== Add / Edit Task Modal =====
function AddEditTaskModal({
  open,
  onClose,
  title,
  initialLabel,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  initialLabel: string;
  onSubmit: (label: string) => void;
}) {
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    if (open) setLabel(initialLabel);
  }, [open, initialLabel]);

  return (
    <SheetModal open={open} onClose={onClose} title={title}>
      <div className="space-y-4 pb-2">
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && label.trim()) onSubmit(label);
          }}
          placeholder="e.g. Drink water (500ml)"
          className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
        />
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
            onClick={() => onSubmit(label)}
            disabled={!label.trim()}
            className="flex-1 h-11 rounded-xl bg-foreground text-background text-[14px] font-semibold disabled:opacity-30"
          >
            {title.startsWith("Edit") ? "Save" : "Add"}
          </motion.button>
        </div>
      </div>
    </SheetModal>
  );
}
