"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, FileText, Trash2, Pencil, Calendar as CalendarIcon, AlertCircle,
  Clock, CheckCircle2, Circle, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useStudentData, type Assignment } from "@/lib/trackly/studentData";
import {
  ScreenHeader, ScreenWrapper, Card, SheetModal, EmptyState,
  SegmentedControl,
} from "../../ui";

type FilterTab = "all" | "pending" | "in-progress" | "completed";

const STATUS_FLOW: Assignment["status"][] = ["pending", "in-progress", "completed"];
const STATUS_LABEL: Record<Assignment["status"], string> = {
  "pending": "Pending",
  "in-progress": "In Progress",
  "completed": "Completed",
  "submitted": "Submitted",
};

const PRIORITY_BADGE: Record<Assignment["priority"], string> = {
  urgent: "bg-foreground text-background",
  high: "bg-muted text-foreground",
  medium: "border border-border text-foreground bg-transparent",
  low: "border border-border text-muted-foreground bg-transparent",
};

const TYPE_LABEL: Record<Assignment["type"], string> = {
  assignment: "Assignment",
  homework: "Homework",
  project: "Project",
  lab: "Lab",
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function dueLabel(dateStr: string): { label: string; urgent: boolean; overdue: boolean } {
  const d = daysUntil(dateStr);
  if (d < 0) return { label: `${Math.abs(d)}d overdue`, urgent: true, overdue: true };
  if (d === 0) return { label: "Due today", urgent: true, overdue: false };
  if (d === 1) return { label: "Tomorrow", urgent: true, overdue: false };
  if (d <= 3) return { label: `${d}d left`, urgent: true, overdue: false };
  return { label: `${d}d left`, urgent: false, overdue: false };
}

export function Assignments() {
  const { setScreen } = useTracklyStore();
  const student = useStudentData();
  const [tab, setTab] = useState<FilterTab>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);

  const counts = useMemo(() => ({
    all: student.assignments.length,
    pending: student.assignments.filter((a) => a.status === "pending").length,
    "in-progress": student.assignments.filter((a) => a.status === "in-progress").length,
    completed: student.assignments.filter((a) => a.status === "completed" || a.status === "submitted").length,
  }), [student.assignments]);

  const filtered = useMemo(() => {
    const list = tab === "all"
      ? student.assignments
      : tab === "completed"
        ? student.assignments.filter((a) => a.status === "completed" || a.status === "submitted")
        : student.assignments.filter((a) => a.status === tab);
    return [...list].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [student.assignments, tab]);

  const cycleStatus = (a: Assignment) => {
    const idx = STATUS_FLOW.indexOf(a.status === "submitted" ? "completed" : a.status);
    const next = STATUS_FLOW[(idx + 1) % STATUS_FLOW.length];
    student.updateAssignment(a.id, { status: next });
    toast.success(`Marked ${STATUS_LABEL[next]}`);
  };

  const handleSave = (data: Omit<Assignment, "id">) => {
    if (editing) {
      student.updateAssignment(editing.id, data);
      toast.success("Assignment updated");
    } else {
      student.addAssignment(data);
      toast.success("Assignment added");
    }
    setShowAdd(false);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    student.deleteAssignment(id);
    toast.success("Assignment deleted");
    setShowAdd(false);
    setEditing(null);
  };

  return (
    <ScreenWrapper>
      <ScreenHeader
        title="Assignments"
        subtitle={`${counts.all} total · ${counts.pending + counts["in-progress"]} active`}
        onBack={() => setScreen("student-dashboard")}
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setEditing(null); setShowAdd(true); }}
            className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"
            aria-label="Add assignment"
          >
            <Plus size={18} />
          </motion.button>
        }
      />

      {/* Filter tabs */}
      <div className="px-5">
        <SegmentedControl<FilterTab>
          value={tab}
          onChange={setTab}
          options={[
            { label: `All ${counts.all}`, value: "all" },
            { label: `Pending ${counts.pending}`, value: "pending" },
            { label: `Active ${counts["in-progress"]}`, value: "in-progress" },
            { label: `Done ${counts.completed}`, value: "completed" },
          ]}
          className="w-full flex"
        />
      </div>

      {/* List */}
      <div className="px-5 mt-4 pb-32">
        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<FileText size={20} className="text-muted-foreground" />}
              title="Nothing here"
              description={tab === "all" ? "Add your first assignment to get started." : "No assignments in this view."}
              action={tab === "all" && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setEditing(null); setShowAdd(true); }}
                  className="px-4 py-2 rounded-full bg-foreground text-background text-[13px] font-semibold flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add assignment
                </motion.button>
              )}
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((a) => {
              const due = dueLabel(a.dueDate);
              const done = a.status === "completed" || a.status === "submitted";
              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <div className="flex items-start gap-3">
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => cycleStatus(a)}
                        className="shrink-0 mt-0.5"
                        aria-label="Toggle status"
                      >
                        {done ? (
                          <CheckCircle2 size={24} className="text-foreground" />
                        ) : a.status === "in-progress" ? (
                          <Loader2 size={24} className="text-foreground animate-spin" style={{ animationDuration: "3s" }} />
                        ) : (
                          <Circle size={24} className="text-muted-foreground" />
                        )}
                      </motion.button>

                      <div className="flex-1 min-w-0" onClick={() => { setEditing(a); setShowAdd(true); }}>
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[15px] font-semibold leading-snug ${done ? "line-through opacity-60" : ""}`}>
                            {a.title}
                          </p>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${PRIORITY_BADGE[a.priority]} shrink-0`}>
                            {a.priority}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{a.subject} · {TYPE_LABEL[a.type]}</p>
                        {a.description && !done && (
                          <p className="text-[12px] text-muted-foreground mt-1.5 leading-snug line-clamp-2">{a.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[12px]">
                          <span className={`flex items-center gap-1 font-medium ${due.urgent && !done ? "text-foreground" : "text-muted-foreground"}`}>
                            {due.overdue ? <AlertCircle size={12} /> : <CalendarIcon size={12} />}
                            {new Date(a.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                          <span className={`flex items-center gap-1 ${due.urgent && !done ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                            <Clock size={12} /> {due.label}
                          </span>
                          {a.status === "in-progress" && (
                            <span className="text-muted-foreground capitalize">· {STATUS_LABEL[a.status]}</span>
                          )}
                        </div>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setEditing(a); setShowAdd(true); }}
                        className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0"
                        aria-label="Edit"
                      >
                        <Pencil size={12} />
                      </motion.button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AssignmentFormSheet
            assignment={editing}
            subjectNames={student.subjects.map((s) => s.name)}
            onClose={() => { setShowAdd(false); setEditing(null); }}
            onSave={handleSave}
            onDelete={editing ? () => handleDelete(editing.id) : undefined}
          />
        )}
      </AnimatePresence>
    </ScreenWrapper>
  );
}

function AssignmentFormSheet({
  assignment,
  subjectNames,
  onClose,
  onSave,
  onDelete,
}: {
  assignment: Assignment | null;
  subjectNames: string[];
  onClose: () => void;
  onSave: (data: Omit<Assignment, "id">) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState<string>(assignment?.title ?? "");
  const [subject, setSubject] = useState<string>(assignment?.subject ?? subjectNames[0] ?? "");
  const [type, setType] = useState<Assignment["type"]>(assignment?.type ?? "assignment");
  const [dueDate, setDueDate] = useState<string>(
    assignment?.dueDate ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [priority, setPriority] = useState<Assignment["priority"]>(assignment?.priority ?? "medium");
  const [description, setDescription] = useState<string>(assignment?.description ?? "");

  const valid = title.trim().length > 0 && subject.trim().length > 0;

  const submit = () => {
    if (!valid) {
      toast.error("Please enter a title and subject");
      return;
    }
    onSave({
      title: title.trim(),
      subject: subject.trim(),
      type,
      dueDate,
      priority,
      status: assignment?.status ?? "pending",
      description: description.trim() || undefined,
    });
  };

  return (
    <SheetModal open onClose={onClose} title={assignment ? "Edit Assignment" : "Add Assignment"}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pb-2">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. DS Assignment 4 — Trees"
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </Field>

        <Field label="Subject">
          {subjectNames.length > 0 ? (
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none"
            >
              {subjectNames.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Data Structures"
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
            />
          )}
        </Field>

        <Field label="Type">
          <div className="flex gap-1.5 flex-wrap">
            {(["assignment", "homework", "project", "lab"] as const).map((t) => (
              <Chip key={t} label={TYPE_LABEL[t]} active={type === t} onClick={() => setType(t)} />
            ))}
          </div>
        </Field>

        <Field label="Due date">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none"
          />
        </Field>

        <Field label="Priority">
          <div className="flex gap-1.5 flex-wrap">
            {(["low", "medium", "high", "urgent"] as const).map((p) => (
              <Chip key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} active={priority === p} onClick={() => setPriority(p)} />
            ))}
          </div>
        </Field>

        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes, requirements, or links..."
            rows={3}
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground resize-none"
          />
        </Field>

        <div className="flex gap-2 pt-2">
          {onDelete && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onDelete}
              className="h-12 px-4 rounded-2xl border border-border flex items-center justify-center gap-2 text-[14px] font-semibold"
            >
              <Trash2 size={16} />
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={submit}
            className={`flex-1 h-12 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 ${
              valid ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            {assignment ? "Save changes" : "Add assignment"}
          </motion.button>
        </div>
      </div>
    </SheetModal>
  );
}

function Chip({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
        active ? "bg-foreground text-background border-foreground" : "bg-transparent text-foreground border-border"
      }`}
    >
      {label}
    </motion.button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{label}</p>
      {children}
    </div>
  );
}
