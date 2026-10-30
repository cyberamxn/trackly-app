"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Calendar as CalendarIcon, Clock, MapPin, Trash2, Pencil,
  CheckCircle2, Circle, BookOpen, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useStudentData, type Exam } from "@/lib/trackly/studentData";
import {
  ScreenHeader, ScreenWrapper, Card, SheetModal, EmptyState,
} from "../../ui";

export function Exams() {
  const { setScreen } = useTracklyStore();
  const student = useStudentData();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);

  const sorted = useMemo(
    () => [...student.exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [student.exams]
  );

  const upcoming = sorted.filter((e) => new Date(e.date).getTime() >= Date.now() && !e.prepared);
  const nextExam = sorted.find((e) => new Date(e.date).getTime() >= Date.now());
  const daysLeft = nextExam
    ? Math.ceil((new Date(nextExam.date).getTime() - Date.now()) / 86400000)
    : 0;

  const handleSave = (data: Omit<Exam, "id">) => {
    if (editing) {
      student.updateExam(editing.id, data);
      toast.success("Exam updated");
    } else {
      student.addExam(data);
      toast.success("Exam added");
    }
    setShowAdd(false);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    student.deleteExam(id);
    toast.success("Exam deleted");
    setShowAdd(false);
    setEditing(null);
  };

  const togglePrepared = (e: Exam) => {
    student.updateExam(e.id, { prepared: !e.prepared });
    toast.success(e.prepared ? "Marked as not prepared" : "Marked as prepared");
  };

  return (
    <ScreenWrapper>
      <ScreenHeader
        title="Exam Planner"
        subtitle={`${sorted.length} exams · ${upcoming.length} to prepare`}
        onBack={() => setScreen("student-dashboard")}
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setEditing(null); setShowAdd(true); }}
            className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"
            aria-label="Add exam"
          >
            <Plus size={18} />
          </motion.button>
        }
      />

      {/* Next exam countdown */}
      {nextExam ? (
        <div className="px-5">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <Card className="bg-foreground text-background">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Next Exam</p>
                <span className="text-[11px] opacity-70 tabular-nums">
                  {new Date(nextExam.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-[56px] font-bold tracking-tight leading-none text-display">{daysLeft}</p>
                <p className="text-[16px] font-semibold mb-2 opacity-80">day{daysLeft !== 1 ? "s" : ""} left</p>
              </div>
              <p className="text-[18px] font-bold mt-2">{nextExam.subject}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[12px] opacity-80">
                <span className="flex items-center gap-1"><Clock size={12} /> {nextExam.time}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {nextExam.venue}</span>
                <span className="flex items-center gap-1"><BookOpen size={12} /> {nextExam.duration}min</span>
              </div>
              {!nextExam.prepared && daysLeft <= 14 && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-background/10">
                  <AlertCircle size={14} className="opacity-90 shrink-0" />
                  <p className="text-[12px] opacity-90">
                    {daysLeft <= 3 ? "Last few days — final revision time." : `${daysLeft} days to prepare — start now.`}
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      ) : (
        <div className="px-5">
          <Card>
            <EmptyState
              icon={<CalendarIcon size={20} className="text-muted-foreground" />}
              title="No upcoming exams"
              description="Add your exam schedule to get countdowns and prep reminders."
            />
          </Card>
        </div>
      )}

      {/* Exam list */}
      <div className="px-5 mt-6 pb-32">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[18px] font-bold tracking-tight">All Exams</h2>
          <span className="text-[12px] text-muted-foreground tabular-nums">{sorted.length}</span>
        </div>

        {sorted.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CalendarIcon size={20} className="text-muted-foreground" />}
              title="No exams yet"
              description="Add your exam dates to plan your preparation."
              action={
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setEditing(null); setShowAdd(true); }}
                  className="px-4 py-2 rounded-full bg-foreground text-background text-[13px] font-semibold flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add exam
                </motion.button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((e) => {
              const d = Math.ceil((new Date(e.date).getTime() - Date.now()) / 86400000);
              const past = d < 0;
              const isNext = nextExam?.id === e.id;
              return (
                <motion.div key={e.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={isNext ? "border-2 border-foreground" : past ? "opacity-60" : ""}>
                    <div className="flex items-start gap-3">
                      <div className="text-center shrink-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          {new Date(e.date).toLocaleDateString("en-US", { month: "short" })}
                        </p>
                        <p className="text-[26px] font-bold leading-none tabular-nums">
                          {new Date(e.date).getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0" onClick={() => { setEditing(e); setShowAdd(true); }}>
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-semibold truncate">{e.subject}</p>
                          {isNext && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-foreground text-background">
                              Next
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 mt-1 text-[12px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock size={11} /> {e.time}</span>
                          <span className="flex items-center gap-1"><MapPin size={11} /> {e.venue}</span>
                          <span className="tabular-nums">{e.duration}min</span>
                        </div>
                        {e.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {e.topics.map((t) => (
                              <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground font-medium">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {!past && (
                          <p className="text-[11px] font-semibold mt-2 text-muted-foreground">
                            {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `${d} days away`}
                          </p>
                        )}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => togglePrepared(e)}
                        className="shrink-0"
                        aria-label="Toggle prepared"
                      >
                        {e.prepared ? (
                          <CheckCircle2 size={26} className="text-foreground" />
                        ) : (
                          <Circle size={26} className="text-muted-foreground" />
                        )}
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
          <ExamFormSheet
            exam={editing}
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

function ExamFormSheet({
  exam,
  subjectNames,
  onClose,
  onSave,
  onDelete,
}: {
  exam: Exam | null;
  subjectNames: string[];
  onClose: () => void;
  onSave: (data: Omit<Exam, "id">) => void;
  onDelete?: () => void;
}) {
  const [subject, setSubject] = useState<string>(exam?.subject ?? subjectNames[0] ?? "");
  const [date, setDate] = useState<string>(
    exam?.date ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [time, setTime] = useState<string>(exam?.time ?? "09:00");
  const [venue, setVenue] = useState<string>(exam?.venue ?? "");
  const [duration, setDuration] = useState<string>(exam ? String(exam.duration) : "180");
  const [topicsRaw, setTopicsRaw] = useState<string>(exam?.topics.join(", ") ?? "");
  const [prepared, setPrepared] = useState<boolean>(exam?.prepared ?? false);

  const valid = subject.trim().length > 0 && venue.trim().length > 0;

  const submit = () => {
    if (!valid) {
      toast.error("Please enter subject and venue");
      return;
    }
    onSave({
      subject: subject.trim(),
      date,
      time,
      venue: venue.trim(),
      duration: Math.max(15, parseInt(duration) || 180),
      topics: topicsRaw.split(",").map((t) => t.trim()).filter(Boolean),
      prepared,
    });
  };

  return (
    <SheetModal open onClose={onClose} title={exam ? "Edit Exam" : "Add Exam"}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pb-2">
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none"
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Venue">
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Hall A-101"
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </Field>
          <Field label="Duration (min)">
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none tabular-nums"
            />
          </Field>
        </div>

        <Field label="Topics (comma separated)">
          <input
            value={topicsRaw}
            onChange={(e) => setTopicsRaw(e.target.value)}
            placeholder="e.g. Trees, Graphs, Sorting"
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </Field>

        <div className="flex items-center justify-between p-3.5 bg-muted rounded-xl">
          <div>
            <p className="text-[14px] font-medium">Mark as prepared</p>
            <p className="text-[12px] text-muted-foreground">You've completed revision</p>
          </div>
          <button
            onClick={() => setPrepared(!prepared)}
            className={`relative h-7 w-12 rounded-full transition-colors shrink-0 ${prepared ? "bg-foreground" : "bg-muted-foreground/30"}`}
          >
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow-sm ${prepared ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
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
            {exam ? "Save changes" : "Add exam"}
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
