"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Send, Sparkles, CalendarClock, FileText, Target,
  AlertCircle, BookOpen, GraduationCap,
} from "lucide-react";
import { useTracklyStore } from "@/lib/trackly/store";
import { useStudentData } from "@/lib/trackly/studentData";
import {
  ScreenHeader, ScreenWrapper,
} from "../../ui";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  bullets?: string[];
}

const SUGGESTIONS = [
  { label: "Plan my study", icon: Brain },
  { label: "Revision schedule", icon: CalendarClock },
  { label: "Summarize notes", icon: FileText },
  { label: "Daily targets", icon: Target },
  { label: "Deadline reminder", icon: AlertCircle },
];

function uid(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export function AIAssistant() {
  const { setScreen } = useTracklyStore();
  const student = useStudentData();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "assistant",
      content: "Hi! I'm your AI study assistant. I can help you plan study sessions, track deadlines, and stay on top of exams. What would you like to do?",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build a context snapshot of the student data
  const ctx = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const pendingAssignments = student.assignments
      .filter((a) => a.status !== "completed" && a.status !== "submitted")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const upcomingExams = student.exams
      .filter((e) => new Date(e.date).getTime() >= Date.now())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lowAttendance = student.subjects
      .filter((s) => s.attendanceTotal > 0 && (s.attendanceAttended / s.attendanceTotal) < 0.75);
    const todayGoals = student.studyGoals.filter((g) => g.date === today);
    const totalChapters = student.subjects.reduce((s, sub) => s + sub.totalChapters, 0);
    const completedChapters = student.subjects.reduce((s, sub) => s + sub.completedChapters, 0);
    const syllabusPct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    return {
      pendingAssignments,
      upcomingExams,
      lowAttendance,
      todayGoals,
      subjects: student.subjects,
      syllabusPct,
      completedChapters,
      totalChapters,
    };
  }, [student]);

  // Generate a smart canned response
  const generateResponse = (userText: string): ChatMessage => {
    const text = userText.toLowerCase();

    // Plan my study
    if (text.includes("plan") && text.includes("study")) {
      const subjects = ctx.subjects.slice(0, 4);
      const plan = subjects.map((s) => {
        const pct = s.totalChapters > 0 ? Math.round((s.completedChapters / s.totalChapters) * 100) : 0;
        const remaining = s.totalChapters - s.completedChapters;
        return `${s.name} (${pct}% done, ${remaining} ch left) — focus on weakest topics`;
      });
      return {
        id: uid(),
        role: "assistant",
        content: `Here's a study plan based on your ${ctx.subjects.length} subjects (overall syllabus ${ctx.syllabusPct}% complete). Prioritize by syllabus gap:`,
        bullets: plan.length > 0 ? plan : ["Add subjects in Study Planner to get a personalized plan."],
      };
    }

    // Revision schedule
    if (text.includes("revision") || text.includes("schedule")) {
      if (ctx.upcomingExams.length === 0) {
        return {
          id: uid(),
          role: "assistant",
          content: "No upcoming exams scheduled. Add your exam dates in the Exam Planner and I'll build a revision timeline for you.",
        };
      }
      const next = ctx.upcomingExams[0];
      const days = Math.max(1, daysUntil(next.date));
      const perTopicDays = Math.max(1, Math.floor(days / Math.max(1, next.topics.length)));
      const bullets = next.topics.map((t, i) => {
        const startDay = i * perTopicDays + 1;
        const endDay = Math.min(days, (i + 1) * perTopicDays);
        return `Day ${startDay}-${endDay}: ${t} (${next.subject})`;
      });
      return {
        id: uid(),
        role: "assistant",
        content: `Your next exam is ${next.subject} in ${days} day${days !== 1 ? "s" : ""}. Here's a revision schedule covering ${next.topics.length} topic${next.topics.length !== 1 ? "s" : ""}:`,
        bullets,
      };
    }

    // Summarize notes
    if (text.includes("summarize") || text.includes("notes")) {
      return {
        id: uid(),
        role: "assistant",
        content: "For summarizing notes, I recommend the Cornell method: split each page into cues, notes, and summary. Focus on key terms from your subjects — currently you're tracking " +
          `${ctx.completedChapters}/${ctx.totalChapters} chapters. Try summarizing one chapter per session in under 200 words, then quiz yourself.`,
        bullets: [
          "Use Cornell notes: cues · notes · summary",
          "Target 1 chapter per session, ~200 words",
          "Self-quiz at the end of each summary",
        ],
      };
    }

    // Daily targets
    if (text.includes("daily") || text.includes("target")) {
      if (ctx.todayGoals.length === 0) {
        return {
          id: uid(),
          role: "assistant",
          content: "You have no study goals set for today. I'd suggest setting 2-3 focused targets of 45-60 minutes each. Head to the Study Planner to add goals.",
        };
      }
      const totalMin = ctx.todayGoals.reduce((s, g) => s + g.targetMinutes, 0);
      const doneMin = ctx.todayGoals.reduce((s, g) => s + g.completedMinutes, 0);
      const bullets = ctx.todayGoals.map((g) => {
        const pct = g.targetMinutes > 0 ? Math.round((g.completedMinutes / g.targetMinutes) * 100) : 0;
        return `${g.topic} (${g.subject}) — ${g.completedMinutes}/${g.targetMinutes}min, ${pct}%`;
      });
      return {
        id: uid(),
        role: "assistant",
        content: `You have ${ctx.todayGoals.length} goal${ctx.todayGoals.length !== 1 ? "s" : ""} today (${doneMin}/${totalMin} min done). Here's the breakdown:`,
        bullets,
      };
    }

    // Deadline reminder
    if (text.includes("deadline") || text.includes("due") || text.includes("reminder")) {
      if (ctx.pendingAssignments.length === 0) {
        return {
          id: uid(),
          role: "assistant",
          content: "You're all caught up! No pending assignments. Great work — consider getting ahead on revision or reading.",
        };
      }
      const next3 = ctx.pendingAssignments.slice(0, 4);
      const bullets = next3.map((a) => {
        const d = daysUntil(a.dueDate);
        const label = d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : d === 1 ? "Tomorrow" : `${d}d left`;
        return `${a.title} (${a.subject}) — ${label} · ${a.priority} priority`;
      });
      return {
        id: uid(),
        role: "assistant",
        content: `You have ${ctx.pendingAssignments.length} pending assignment${ctx.pendingAssignments.length !== 1 ? "s" : ""}. Most urgent:`,
        bullets,
      };
    }

    // Attendance concerns
    if (text.includes("attendance")) {
      if (ctx.lowAttendance.length === 0) {
        return {
          id: uid(),
          role: "assistant",
          content: "Your attendance looks healthy across all subjects — you're above the 75% threshold everywhere. Keep it up!",
        };
      }
      const bullets = ctx.lowAttendance.map((s) => {
        const pct = Math.round((s.attendanceAttended / s.attendanceTotal) * 100);
        const need = Math.max(1, Math.ceil(3 * s.attendanceTotal - 4 * s.attendanceAttended));
        return `${s.name} — ${pct}% (attend ${need} more to reach 75%)`;
      });
      return {
        id: uid(),
        role: "assistant",
        content: `${ctx.lowAttendance.length} subject${ctx.lowAttendance.length !== 1 ? "s" : ""} below 75% attendance. Prioritize these classes:`,
        bullets,
      };
    }

    // Default fallback
    return {
      id: uid(),
      role: "assistant",
      content: `I can help with study planning, revision schedules, daily targets, deadline reminders, and attendance analysis. You currently have ${ctx.pendingAssignments.length} pending assignments and ${ctx.upcomingExams.length} upcoming exam${ctx.upcomingExams.length !== 1 ? "s" : ""}. Try one of the suggestion chips below.`,
    };
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    const userMsg: ChatMessage = { id: uid(), role: "user", content: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    const delay = 600 + Math.min(1400, trimmed.length * 25);
    setTimeout(() => {
      const reply = generateResponse(trimmed);
      setMessages((m) => [...m, reply]);
      setTyping(false);
    }, delay);
  };

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, typing]);

  return (
    <ScreenWrapper scrollable={false}>
      <ScreenHeader
        title="AI Study Assistant"
        subtitle="Plans, reminders & tips"
        onBack={() => setScreen("student-dashboard")}
        right={
          <div className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center">
            <Brain size={18} />
          </div>
        }
      />

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar ios-scroll px-5 pb-3"
        style={{ height: "calc(100vh - 220px)" }}
      >
        <div className="space-y-3">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {typing && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-start gap-2"
              >
                <div className="h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={13} />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "240ms" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Suggestion chips */}
      <div className="px-5 pt-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {SUGGESTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <motion.button
                key={s.label}
                whileTap={{ scale: 0.94 }}
                onClick={() => sendMessage(s.label)}
                disabled={typing}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-border text-[12px] font-medium disabled:opacity-50"
              >
                <Icon size={12} />
                {s.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <div className="px-5 pt-2 pb-6">
        <div className="flex items-center gap-2 bg-muted rounded-2xl pl-4 pr-1.5 py-1.5">
          <GraduationCap size={18} className="text-muted-foreground shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input); }}
            placeholder="Ask about your studies..."
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground py-2"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || typing}
            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
              input.trim() && !typing ? "bg-foreground text-background" : "bg-background text-muted-foreground"
            }`}
            aria-label="Send"
          >
            <Send size={16} />
          </motion.button>
        </div>
      </div>
    </ScreenWrapper>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isUser ? "bg-muted" : "bg-foreground text-background"
      }`}>
        {isUser ? <BookOpen size={13} /> : <Sparkles size={13} />}
      </div>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`px-4 py-2.5 text-[14px] leading-relaxed ${
          isUser
            ? "bg-foreground text-background rounded-2xl rounded-tr-md"
            : "bg-muted text-foreground rounded-2xl rounded-tl-md"
        }`}>
          {message.content}
        </div>
        {message.bullets && message.bullets.length > 0 && (
          <div className="mt-1.5 space-y-1 w-full">
            {message.bullets.map((b, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 px-3 py-2 rounded-xl text-[13px] ${
                  isUser ? "bg-muted" : "bg-card border border-border"
                }`}
              >
                <span className="text-muted-foreground font-bold tabular-nums shrink-0">{i + 1}.</span>
                <span className="flex-1">{b}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
