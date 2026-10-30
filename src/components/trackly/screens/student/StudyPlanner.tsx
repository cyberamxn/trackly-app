"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, BookOpen, Calendar as CalendarIcon, Trash2, Pencil, CheckCircle2,
  GraduationCap, Target, Brain, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useStudentData, type Subject, type StudyGoal } from "@/lib/trackly/studentData";
import {
  ScreenHeader, ScreenWrapper, Card, SheetModal, EmptyState,
  ProgressBar, RingProgress,
} from "../../ui";

export function StudyPlanner() {
  const { setScreen } = useTracklyStore();
  const student = useStudentData();
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StudyGoal | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const totalChapters = student.subjects.reduce((s, sub) => s + sub.totalChapters, 0);
  const completedChapters = student.subjects.reduce((s, sub) => s + sub.completedChapters, 0);
  const syllabusPct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  const todayGoals = useMemo(
    () => student.studyGoals.filter((g) => g.date === today),
    [student.studyGoals, today]
  );
  const totalTargetMin = todayGoals.reduce((s, g) => s + g.targetMinutes, 0);
  const totalDoneMin = todayGoals.reduce((s, g) => s + g.completedMinutes, 0);
  const goalsPct = totalTargetMin > 0 ? Math.round((totalDoneMin / totalTargetMin) * 100) : 0;

  const sortedSubjects = useMemo(
    () => [...student.subjects].sort((a, b) =>
      (a.completedChapters / Math.max(1, a.totalChapters)) - (b.completedChapters / Math.max(1, b.totalChapters))
    ),
    [student.subjects]
  );

  const handleSaveSubject = (data: Omit<Subject, "id">) => {
    if (editingSubject) {
      student.updateSubject(editingSubject.id, data);
      toast.success("Subject updated");
    } else {
      student.addSubject(data);
      toast.success("Subject added");
    }
    setShowAddSubject(false);
    setEditingSubject(null);
  };

  const handleDeleteSubject = (id: string) => {
    student.deleteSubject(id);
    toast.success("Subject removed");
    setShowAddSubject(false);
    setEditingSubject(null);
  };

  const handleSaveGoal = (data: Omit<StudyGoal, "id">) => {
    if (editingGoal) {
      student.updateStudyGoal(editingGoal.id, data);
      toast.success("Goal updated");
    } else {
      student.addStudyGoal(data);
      toast.success("Study goal added");
    }
    setShowAddGoal(false);
    setEditingGoal(null);
  };

  const handleDeleteGoal = (id: string) => {
    student.deleteStudyGoal(id);
    toast.success("Goal removed");
    setShowAddGoal(false);
    setEditingGoal(null);
  };

  return (
    <ScreenWrapper>
      <ScreenHeader
        title="Study Planner"
        subtitle="Syllabus, subjects & daily goals"
        onBack={() => setScreen("student-dashboard")}
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setEditingSubject(null); setShowAddSubject(true); }}
            className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"
            aria-label="Add subject"
          >
            <Plus size={18} />
          </motion.button>
        }
      />

      {/* Overall syllabus completion ring */}
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="bg-foreground text-background">
            <div className="flex items-center gap-4">
              <RingProgress value={syllabusPct} size={88} stroke={7}>
                <div className="text-center">
                  <div className="text-[20px] font-bold leading-none">{syllabusPct}%</div>
                  <div className="text-[8px] opacity-70 mt-0.5 uppercase tracking-wider">done</div>
                </div>
              </RingProgress>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Syllabus Completion</p>
                <p className="text-[24px] font-bold tracking-tight mt-0.5">{completedChapters}/{totalChapters}</p>
                <p className="text-[12px] opacity-80 mt-0.5">chapters completed across {student.subjects.length} subjects</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Today's study goals */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Brain size={16} />
            <h2 className="text-[18px] font-bold tracking-tight">Today's Goals</h2>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setEditingGoal(null); setShowAddGoal(true); }}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center"
            aria-label="Add study goal"
          >
            <Plus size={14} />
          </motion.button>
        </div>

        {todayGoals.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Target size={20} className="text-muted-foreground" />}
              title="No goals for today"
              description="Set a study target to stay focused."
              action={
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setEditingGoal(null); setShowAddGoal(true); }}
                  className="px-4 py-2 rounded-full bg-foreground text-background text-[13px] font-semibold flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add goal
                </motion.button>
              }
            />
          </Card>
        ) : (
          <>
            <Card className="mb-2.5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[13px] font-medium">Total progress</p>
                  <p className="text-[11px] text-muted-foreground">{totalDoneMin}/{totalTargetMin} min · {goalsPct}%</p>
                </div>
                <span className="text-[20px] font-bold tabular-nums text-display">{goalsPct}%</span>
              </div>
              <ProgressBar value={goalsPct} className="h-2" />
            </Card>

            <div className="space-y-2">
              {todayGoals.map((g) => (
                <StudyGoalRow
                  key={g.id}
                  goal={g}
                  onEdit={() => { setEditingGoal(g); setShowAddGoal(true); }}
                  onIncrement={() => {
                    const next = Math.min(g.targetMinutes, g.completedMinutes + 15);
                    student.updateStudyGoal(g.id, { completedMinutes: next });
                    if (next >= g.targetMinutes) toast.success(`Goal complete: ${g.topic}`);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Subjects */}
      <div className="px-5 mt-6 pb-32">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[18px] font-bold tracking-tight">Subjects</h2>
          <span className="text-[12px] text-muted-foreground tabular-nums">{student.subjects.length}</span>
        </div>

        {student.subjects.length === 0 ? (
          <Card>
            <EmptyState
              icon={<GraduationCap size={20} className="text-muted-foreground" />}
              title="No subjects yet"
              description="Add your subjects to track chapters and attendance."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedSubjects.map((sub) => {
              const pct = sub.totalChapters > 0 ? Math.round((sub.completedChapters / sub.totalChapters) * 100) : 0;
              const attendancePct = sub.attendanceTotal > 0 ? Math.round((sub.attendanceAttended / sub.attendanceTotal) * 100) : 0;
              const complete = sub.completedChapters >= sub.totalChapters;
              return (
                <motion.div
                  key={sub.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[16px] font-semibold truncate">{sub.name}</p>
                          <span className="text-[11px] text-muted-foreground font-mono px-1.5 py-0.5 rounded bg-muted">{sub.code}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[12px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen size={12} /> {sub.completedChapters}/{sub.totalChapters} ch
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={12} /> {attendancePct}%
                          </span>
                          {sub.examDate && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon size={12} /> {new Date(sub.examDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setEditingSubject(sub); setShowAddSubject(true); }}
                        className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0"
                        aria-label="Edit subject"
                      >
                        <Pencil size={12} />
                      </motion.button>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] text-muted-foreground font-medium">Syllabus progress</p>
                        <p className="text-[11px] font-semibold tabular-nums">{pct}%</p>
                      </div>
                      <ProgressBar value={pct} className="h-1.5" />
                    </div>

                    <div className="flex gap-2 mt-3">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        disabled={complete}
                        onClick={() => {
                          student.markChapterComplete(sub.id);
                          toast.success(sub.completedChapters + 1 >= sub.totalChapters
                            ? `${sub.name} syllabus complete!`
                            : `Chapter ${sub.completedChapters + 1} marked complete`);
                        }}
                        className={`flex-1 h-9 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5 ${
                          complete
                            ? "bg-muted text-muted-foreground"
                            : "bg-foreground text-background"
                        }`}
                      >
                        {complete ? (
                          <><CheckCircle2 size={14} /> Complete</>
                        ) : (
                          <><Plus size={14} /> Mark chapter</>
                        )}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setScreen("student-attendance")}
                        className="h-9 px-3 rounded-xl border border-border text-[13px] font-semibold"
                      >
                        Attendance
                      </motion.button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sheets */}
      <AnimatePresence>
        {showAddSubject && (
          <SubjectFormSheet
            subject={editingSubject}
            onClose={() => { setShowAddSubject(false); setEditingSubject(null); }}
            onSave={handleSaveSubject}
            onDelete={editingSubject ? () => handleDeleteSubject(editingSubject.id) : undefined}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddGoal && (
          <StudyGoalFormSheet
            goal={editingGoal}
            subjectNames={student.subjects.map((s) => s.name)}
            onClose={() => { setShowAddGoal(false); setEditingGoal(null); }}
            onSave={handleSaveGoal}
            onDelete={editingGoal ? () => handleDeleteGoal(editingGoal.id) : undefined}
          />
        )}
      </AnimatePresence>
    </ScreenWrapper>
  );
}

function StudyGoalRow({
  goal,
  onEdit,
  onIncrement,
}: {
  goal: StudyGoal;
  onEdit: () => void;
  onIncrement: () => void;
}) {
  const pct = goal.targetMinutes > 0 ? Math.round((goal.completedMinutes / goal.targetMinutes) * 100) : 0;
  const done = goal.completedMinutes >= goal.targetMinutes;
  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
            <Target size={16} />
          </div>
          <div className="flex-1 min-w-0" onClick={onEdit}>
            <p className="text-[15px] font-semibold truncate">{goal.topic}</p>
            <p className="text-[12px] text-muted-foreground">{goal.subject} · {goal.completedMinutes}/{goal.targetMinutes} min</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[15px] font-bold tabular-nums">{pct}%</p>
            <Clock size={11} className="text-muted-foreground ml-auto mt-0.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <ProgressBar value={pct} className={`h-1.5 ${done ? "" : ""}`} />
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={done}
          onClick={onIncrement}
          className={`w-full h-8 mt-2.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 ${
            done ? "bg-muted text-muted-foreground" : "bg-muted text-foreground"
          }`}
        >
          {done ? "Completed" : "+15 min"}
        </motion.button>
      </Card>
    </motion.div>
  );
}

function SubjectFormSheet({
  subject,
  onClose,
  onSave,
  onDelete,
}: {
  subject: Subject | null;
  onClose: () => void;
  onSave: (data: Omit<Subject, "id">) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState<string>(subject?.name ?? "");
  const [code, setCode] = useState<string>(subject?.code ?? "");
  const [totalChapters, setTotalChapters] = useState<string>(subject ? String(subject.totalChapters) : "10");
  const [completedChapters, setCompletedChapters] = useState<string>(subject ? String(subject.completedChapters) : "0");
  const [attendanceTotal, setAttendanceTotal] = useState<string>(subject ? String(subject.attendanceTotal) : "0");
  const [attendanceAttended, setAttendanceAttended] = useState<string>(subject ? String(subject.attendanceAttended) : "0");
  const [examDate, setExamDate] = useState<string>(subject?.examDate ?? "");

  const valid = name.trim().length > 0 && code.trim().length > 0;

  const submit = () => {
    if (!valid) {
      toast.error("Please enter subject name and code");
      return;
    }
    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      totalChapters: Math.max(0, parseInt(totalChapters) || 0),
      completedChapters: Math.max(0, parseInt(completedChapters) || 0),
      attendanceTotal: Math.max(0, parseInt(attendanceTotal) || 0),
      attendanceAttended: Math.max(0, parseInt(attendanceAttended) || 0),
      examDate: examDate || undefined,
    });
  };

  return (
    <SheetModal open onClose={onClose} title={subject ? "Edit Subject" : "Add Subject"}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pb-2">
        <Field label="Subject name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Data Structures"
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </Field>
        <Field label="Code">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. CS201"
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground uppercase font-mono"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total chapters">
            <input
              type="number"
              inputMode="numeric"
              value={totalChapters}
              onChange={(e) => setTotalChapters(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none tabular-nums"
            />
          </Field>
          <Field label="Completed">
            <input
              type="number"
              inputMode="numeric"
              value={completedChapters}
              onChange={(e) => setCompletedChapters(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none tabular-nums"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Classes total">
            <input
              type="number"
              inputMode="numeric"
              value={attendanceTotal}
              onChange={(e) => setAttendanceTotal(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none tabular-nums"
            />
          </Field>
          <Field label="Attended">
            <input
              type="number"
              inputMode="numeric"
              value={attendanceAttended}
              onChange={(e) => setAttendanceAttended(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none tabular-nums"
            />
          </Field>
        </div>
        <Field label="Exam date (optional)">
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none"
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
            {subject ? "Save changes" : "Add subject"}
          </motion.button>
        </div>
      </div>
    </SheetModal>
  );
}

function StudyGoalFormSheet({
  goal,
  subjectNames,
  onClose,
  onSave,
  onDelete,
}: {
  goal: StudyGoal | null;
  subjectNames: string[];
  onClose: () => void;
  onSave: (data: Omit<StudyGoal, "id">) => void;
  onDelete?: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [subject, setSubject] = useState<string>(goal?.subject ?? subjectNames[0] ?? "");
  const [topic, setTopic] = useState<string>(goal?.topic ?? "");
  const [targetMinutes, setTargetMinutes] = useState<string>(goal ? String(goal.targetMinutes) : "60");
  const [completedMinutes, setCompletedMinutes] = useState<string>(goal ? String(goal.completedMinutes) : "0");

  const valid = subject.trim().length > 0 && topic.trim().length > 0;

  const submit = () => {
    if (!valid) {
      toast.error("Please choose a subject and topic");
      return;
    }
    onSave({
      subject: subject.trim(),
      topic: topic.trim(),
      targetMinutes: Math.max(1, parseInt(targetMinutes) || 60),
      completedMinutes: Math.max(0, parseInt(completedMinutes) || 0),
      date: goal?.date ?? today,
    });
  };

  return (
    <SheetModal open onClose={onClose} title={goal ? "Edit Goal" : "Add Study Goal"}>
      <div className="space-y-4">
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
        <Field label="Topic">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. AVL Trees"
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target (min)">
            <input
              type="number"
              inputMode="numeric"
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none tabular-nums"
            />
          </Field>
          <Field label="Done (min)">
            <input
              type="number"
              inputMode="numeric"
              value={completedMinutes}
              onChange={(e) => setCompletedMinutes(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none tabular-nums"
            />
          </Field>
        </div>

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
            {goal ? "Save changes" : "Add goal"}
          </motion.button>
        </div>
      </div>
    </SheetModal>
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
