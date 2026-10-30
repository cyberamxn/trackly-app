"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Clock, CheckCircle2, Circle, Loader2, Trash2, X, Check,
} from "lucide-react";
import { ScreenHeader, Card, EmptyState, SegmentedControl } from "../../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { useOfficeData } from "@/lib/trackly/officeData";
import { toast } from "sonner";

export function WorkTasks() {
  const { setScreen } = useTracklyStore();
  const office = useOfficeData();
  const [filter, setFilter] = useState<"all" | "todo" | "in-progress" | "done">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addProject, setAddProject] = useState("");
  const [addPriority, setAddPriority] = useState<"low" | "medium" | "high">("medium");
  const [addDeadline, setAddDeadline] = useState(new Date().toISOString().slice(0, 10));

  const filtered = filter === "all"
    ? office.tasks
    : office.tasks.filter((t) => t.status === filter);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = office.tasks.filter((t) => t.status !== "done" && t.deadline < today);
  const dueToday = office.tasks.filter((t) => t.status !== "done" && t.deadline === today);

  const handleAdd = () => {
    if (!addTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    office.addTask({
      title: addTitle.trim(),
      project: addProject.trim() || "General",
      priority: addPriority,
      deadline: addDeadline,
      status: "todo",
    });
    toast.success("Task added");
    setAddTitle("");
    setAddProject("");
    setAddPriority("medium");
    setAddDeadline(today);
    setShowAdd(false);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Work Tasks"
        subtitle={`${office.tasks.filter((t) => t.status !== "done").length} pending · ${overdue.length} overdue`}
        onBack={() => setScreen("office-dashboard")}
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAdd(true)}
            className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"
          >
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>
        }
      />

      {/* Stats */}
      <div className="px-5 mt-2 grid grid-cols-3 gap-2">
        <Card className="text-center">
          <p className="text-[20px] font-bold text-display">{dueToday.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Due Today</p>
        </Card>
        <Card className="text-center">
          <p className="text-[20px] font-bold text-display">{overdue.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Overdue</p>
        </Card>
        <Card className="text-center">
          <p className="text-[20px] font-bold text-display">{office.tasks.filter((t) => t.status === "done").length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Done</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="px-5 mt-4">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "todo", label: "To-Do" },
            { value: "in-progress", label: "Active" },
            { value: "done", label: "Done" },
          ]}
        />
      </div>

      {/* Task list */}
      <div className="px-5 mt-3 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={20} className="text-muted-foreground" />}
            title="No tasks here"
            description="Add a new task or change the filter."
          />
        ) : (
          filtered.map((t) => {
            const isOverdue = t.status !== "done" && t.deadline < today;
            const isToday = t.deadline === today;
            return (
              <motion.div key={t.id} layout whileTap={{ scale: 0.99 }}>
                <Card className={t.status === "done" ? "opacity-60" : ""}>
                  <div className="flex items-start gap-3">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => office.cycleTaskStatus(t.id)}
                      className="shrink-0 mt-0.5"
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
                      {t.description && (
                        <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground font-medium">{t.project}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          t.priority === "high" ? "bg-foreground text-background" :
                          t.priority === "medium" ? "bg-muted" : "border border-border"
                        }`}>
                          {t.priority}
                        </span>
                        <span className={`text-[10px] flex items-center gap-0.5 ${
                          isOverdue ? "text-red-500" : isToday ? "text-foreground font-semibold" : "text-muted-foreground"
                        }`}>
                          <Clock size={10} />
                          {isOverdue ? "Overdue" : isToday ? "Today" : new Date(t.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                        {t.recurring && <span className="text-[10px] text-muted-foreground">↻ Recurring</span>}
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => { office.deleteTask(t.id); toast.success("Task deleted"); }}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0"
                    >
                      <Trash2 size={13} />
                    </motion.button>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed sheet-bottom left-0 right-0 z-50 rounded-t-[32px] bg-background sheet-safe-pb max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
              <div className="px-5 pt-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[20px] font-bold">New Task</h2>
                  <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] text-muted-foreground font-medium">Task title</label>
                    <input autoFocus value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="e.g. Prepare presentation" className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground" />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground font-medium">Project</label>
                    <input value={addProject} onChange={(e) => setAddProject(e.target.value)} placeholder="e.g. Sales, DevOps" className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground" />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground font-medium">Priority</label>
                    <div className="flex gap-2 mt-1">
                      {(["low", "medium", "high"] as const).map((p) => (
                        <button key={p} onClick={() => setAddPriority(p)} className={`flex-1 h-11 rounded-xl border text-[13px] font-semibold capitalize ${addPriority === p ? "bg-foreground text-background border-foreground" : "border-border"}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground font-medium">Deadline</label>
                    <input type="date" value={addDeadline} onChange={(e) => setAddDeadline(e.target.value)} className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none" />
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd} className="w-full h-[52px] mt-2 rounded-2xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2">
                    <Check size={18} /> Add Task
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
