"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Sparkles, X, Loader2, Bot, User, Trash2, Plus, History as HistoryIcon, ChevronDown, ChevronLeft,
  TrendingDown, GraduationCap, Briefcase, Plane, Gift, Mic,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useAppData, selectTodaySpending, selectMonthSpending, selectMonthIncome, selectTotalLentOut, selectTotalBorrowed } from "@/lib/trackly/appData";
import { expenseCategories, paymentMethods } from "@/lib/trackly/data";
import { loadRoutines } from "@/lib/trackly/routine";
import { istDate, istMonth, istTime } from "@/lib/trackly/ist";
import { useSettings } from "@/lib/trackly/settings";
import { useStudentData } from "@/lib/trackly/studentData";
import { useOfficeData } from "@/lib/trackly/officeData";
import { useTracklyStore } from "@/lib/trackly/store";

type Mode = "personal" | "student" | "office" | "trip";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AIChatProps {
  mode: Mode;
  onClose: () => void;
  onModeChange: (mode: Mode) => void;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const MODE_LIST: { id: Mode; label: string; icon: any }[] = [
  { id: "personal", label: "Personal", icon: TrendingDown },
  { id: "student", label: "Student", icon: GraduationCap },
  { id: "office", label: "Office", icon: Briefcase },
  { id: "trip", label: "Trip", icon: Plane },
];

// ===== AI data-action support =====
// The server strips ```action {json}``` blocks from the visible stream and
// re-emits them as {"type":"action"} SSE events. This helper hides any
// residual blocks (e.g. old stored messages) from the UI and history.
const ACTION_BLOCK_RE = /```action[\s\S]*?(```|$)/g;
function stripActionBlocks(t: string): string {
  return t.replace(ACTION_BLOCK_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

const EXPENSE_CAT_IDS = expenseCategories.map((c) => c.id as string);

/** Applies a structured AI action to the local stores. AutoSave picks the
 *  change up and syncs it to the cloud within ~2s — no extra roundtrip. */
function applyAIAction(action: any): string | null {
  if (!action || typeof action.type !== "string") return null;
  const items: any[] = Array.isArray(action.items) ? action.items.filter((it) => it && typeof it === "object") : [];
  if (items.length === 0) return null;
  const store = useAppData.getState();
  const now = new Date();
  const today = istDate(now); // IST — expense dates are stored in IST
  const nowTime = istTime(now);
  const iso = (v: any): string | null => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null);
  const hhmm = (v: any): string | null => (/^\d{1,2}:\d{2}$/.test(String(v || "")) ? String(v) : null);

  switch (action.type) {
    case "add_expense": {
      items.forEach((it) => store.addExpense({
        title: String(it.title || it.name || "Expense").slice(0, 60),
        merchant: String(it.merchant || "").slice(0, 60),
        amount: Math.round(Number(it.amount) || 0),
        category: EXPENSE_CAT_IDS.includes(it.category) ? it.category : "others",
        method: (paymentMethods as string[]).includes(it.method) ? it.method : "Cash",
        date: today,
        time: hhmm(it.time) || nowTime,
        notes: "", tags: [],
      }));
      return `${items.length} expense${items.length > 1 ? "s" : ""} added`;
    }
    case "add_task": {
      items.forEach((it) => store.addCalendarEvent({
        title: String(it.title || "Task").slice(0, 60),
        date: iso(it.date) || today,
        type: "task",
      }));
      return `${items.length} task${items.length > 1 ? "s" : ""} added`;
    }
    case "add_habit": {
      items.forEach((it) => store.addHabit({
        name: String(it.name || it.title || "Habit").slice(0, 60),
        icon: "flame",
        goal: Math.max(1, Math.round(Number(it.goal) || 1)),
        unit: String(it.unit || "time").slice(0, 12),
      }));
      return `${items.length} habit${items.length > 1 ? "s" : ""} added`;
    }
    case "add_note": {
      items.forEach((it) => {
        const body = String(it.body || it.text || "").slice(0, 2000);
        store.addNote({
          title: String(it.title || "Note").slice(0, 60),
          preview: body.slice(0, 80),
          body, tags: [],
        } as any);
      });
      return `${items.length} note${items.length > 1 ? "s" : ""} added`;
    }
    case "add_income": {
      items.forEach((it) => store.addIncome({
        source: String(it.source || "Income").slice(0, 60),
        amount: Math.round(Number(it.amount) || 0),
        date: today,
        method: (paymentMethods as string[]).includes(it.method) ? it.method : "Cash",
      }));
      return `${items.length} income entr${items.length > 1 ? "ies" : "y"} added`;
    }
    case "add_borrowLend": {
      items.forEach((it) => store.addBorrowLend({
        person: String(it.person || "Someone").slice(0, 60),
        type: it.kind === "lent" ? "lent" : "borrowed",
        amount: Math.round(Number(it.amount) || 0),
        paid: 0,
        dueDate: iso(it.dueDate) || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        reason: String(it.reason || "").slice(0, 120),
        paymentMethod: it.method === "online" ? "online" : "cash",
        date: today,
      } as any));
      return `${items.length} borrow/lend entr${items.length > 1 ? "ies" : "y"} added`;
    }
    case "add_office_task": {
      const office = useOfficeData.getState();
      items.forEach((it) => office.addTask({
        title: String(it.title || "Task").slice(0, 60),
        project: String(it.project || "").slice(0, 40),
        priority: ["high", "medium", "low"].includes(it.priority) ? it.priority : "medium",
        deadline: iso(it.deadline) || iso(it.date) || today,
        status: "todo",
      }));
      return `${items.length} work task${items.length > 1 ? "s" : ""} added`;
    }
    default:
      return null;
  }
}

const MODE_TITLE: Record<Mode, string> = {
  personal: "Trackly AI",
  student: "Student AI",
  office: "Office AI",
  trip: "Trip AI",
};

const SUGGESTIONS: Record<Mode, string[]> = {
  personal: [
    "Aaj kitna kharcha hua?",
    "Agla month kitna save kar sakta hoon?",
    "Kisko paise dene hain?",
    "Mere kharche pe budget tips do",
  ],
  student: [
    "Aaj ka study plan bana do",
    "Kaunsa subject pehle padhun?",
    "Agla exam kab hai?",
    "Revision schedule bana do",
  ],
  office: [
    "Aaj kya prioritize karun?",
    "Pending bills ka summary do",
    "Salary se savings tips do",
    "Is week ki deadlines batao",
  ],
  trip: [
    "Kya main zyada kharch kar raha hoon?",
    "Baki trip ka budget batao",
    "Daily limit kitni rakhun?",
    "Trip ka kharcha summary do",
  ],
};

function uid(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function sid(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const STORAGE_KEY = (mode: Mode) => `trackly-ai-sessions-${mode}`;
const MEMORY_KEY = "trackly-ai-memory";

// ===== Cross-session memory (persists across modes and sessions) =====
interface PastSession {
  timestamp: string;
  firstQuestion: string;
  topic: string;
  mode: Mode;
}
interface UserMemory {
  userName?: string;
  commonTopics: string[];
  lastInteraction?: string;
  lastMode?: Mode;
  pastSessions: PastSession[];
  totalConversations: number;
  preferences?: Record<string, any>;
}

function loadMemory(): UserMemory {
  if (typeof window === "undefined") return { commonTopics: [], pastSessions: [], totalConversations: 0 };
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { commonTopics: [], pastSessions: [], totalConversations: 0, ...parsed };
    }
  } catch {}
  return { commonTopics: [], pastSessions: [], totalConversations: 0 };
}

function saveMemory(memory: UserMemory) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch (e) {
    console.warn("[AIChat] Failed to save memory:", e);
  }
}

// ===== Build historical data from past expenses (last 6 months) =====
function buildHistoricalData(): any {
  if (typeof window === "undefined") return {};
  try {
    const appData = useAppData.getState();
    const settings = useSettings.getState();
    const now = new Date();

    // Past 6 months spending breakdown
    const pastMonths: any[] = [];
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthExpenses = appData.expenses.filter((e) => e.date.startsWith(ym));
      if (monthExpenses.length > 0) {
        const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
        const catTotals: Record<string, number> = {};
        monthExpenses.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
        const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
        pastMonths.push({
          month: d.toLocaleString("en-IN", { month: "short", year: "numeric" }),
          totalSpent,
          expenseCount: monthExpenses.length,
          topCategory,
        });
      }
    }

    // Past trips from tripHistory
    const pastTrips = (settings.tripHistory || []).slice(0, 5).map((t: any) => ({
      destination: t.destination || "Unknown",
      durationDays: t.durationDays || 0,
      totalSpent: t.totalSpent || 0,
      avgDaily: t.durationDays ? Math.round((t.totalSpent || 0) / t.durationDays) : 0,
    }));

    return { pastMonths, pastTrips };
  } catch (e) {
    console.error("[AIChat] Failed to build historical data:", e);
    return {};
  }
}

function loadSessions(mode: Mode): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY(mode));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveSessions(mode: Mode, sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY(mode), JSON.stringify(sessions.slice(0, 20)));
  } catch (e) {
    console.warn("[AIChat] Failed to save sessions:", e);
  }
}

function makeWelcome(mode: Mode): ChatMessage {
  return {
    id: uid(),
    role: "assistant",
    content: getWelcomeMessage(mode),
    timestamp: new Date().toISOString(),
  };
}

export function AIChat({ mode, onClose, onModeChange }: AIChatProps) {
  const setScreen = useTracklyStore((s) => s.setScreen);
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions(mode));
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const loaded = loadSessions(mode);
    return loaded.length > 0 ? loaded[0].id : null;
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const loaded = loadSessions(mode);
    if (loaded.length > 0 && loaded[0].messages.length > 0) return loaded[0].messages;
    return [makeWelcome(mode)];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false); // reply text is flowing in live
  const [showHistory, setShowHistory] = useState(false);
  // ===== Claude-style daily quota state (server is the guard; this is display) =====
  const [quota, setQuota] = useState<{ remaining: number; limit: number; resetLabel: string; premium?: boolean } | null>(null);
  const [limitHit, setLimitHit] = useState<{ limit: number; resetLabel: string; resetAt: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ===== Voice input (Web Speech API) — Task 21 ka open interpretation
  // ("text reply ka option": voice-input promise). en-IN → Roman Hinglish
  // output (Task 22 style — Devanagari kabhi nahi) + Indian accent native.
  // Transcript live input me aata hai; user review/edit karke SEND dabata hai
  // (paisa galat sunne pe auto-send risk nahi). API na ho (Firefox/in-app
  // browsers) to button hi nahi dikhta — graceful.
  const [listening, setListening] = useState(false);
  const [speechSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)
  );
  const recogRef = useRef<any>(null);

  const stopListening = () => {
    try { recogRef.current?.stop?.(); } catch {}
    recogRef.current = null;
    setListening(false);
  };

  const startListening = () => {
    if (listening) { stopListening(); return; } // toggle: dobara tap = stop
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    try {
      const rec = new SR();
      rec.lang = "en-IN";
      rec.continuous = false; // ek utterance per tap — phir review/edit/send
      rec.interimResults = true; // live transcript input box me
      let finalText = "";
      rec.onresult = (ev: any) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) finalText += r[0].transcript + " ";
          else interim += r[0].transcript;
        }
        const combined = (finalText + " " + interim).trim().replace(/\s+/g, " ");
        if (combined) setInput(combined);
      };
      rec.onerror = (ev: any) => {
        recogRef.current = null;
        setListening(false);
        if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
          toast.error("Mic permission blocked — browser settings se allow karo");
        } else if (ev?.error === "no-speech") {
          toast("Kuch suna nahi — mic pe tap karke dobara bolo");
        } else if (ev?.error !== "aborted") {
          toast.error("Voice input me dikkat aayi — type kar lena");
        }
      };
      rec.onend = () => {
        // transcript input me hi rehta hai — user edit karke send karta hai
        recogRef.current = null;
        setListening(false);
      };
      recogRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      recogRef.current = null;
      setListening(false);
      toast.error("Voice input start nahi ho paya");
    }
  };

  // Overlay close/mode switch pe live recognition band karo
  useEffect(() => () => { try { recogRef.current?.abort?.(); } catch {} }, []);

  const context = useMemo(() => buildContext(mode), [mode]);
  const memory = useMemo(() => loadMemory(), []);

  // NOTE: viewport-fit=cover is now set GLOBALLY in the root layout — no
  // runtime meta mutation here anymore. Mutating the viewport meta after
  // load caused an iOS layout-viewport shift that made taps land a few
  // inches below the finger (the reported hit-target offset bug).

  // ===== When mode changes, load that mode's last session =====
  useEffect(() => {
    const loaded = loadSessions(mode);
    setSessions(loaded);
    if (loaded.length > 0 && loaded[0].messages.length > 0) {
      setMessages(loaded[0].messages);
      setCurrentSessionId(loaded[0].id);
    } else {
      setMessages([makeWelcome(mode)]);
      setCurrentSessionId(null);
    }
  }, [mode]);

  // ===== Persist messages to current session + update memory =====
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updatedSessions = [...sessions];
    let sessionIdx = updatedSessions.findIndex((s) => s.id === currentSessionId);
    if (sessionIdx === -1) {
      const newSession: ChatSession = {
        id: sid(),
        title: messages.length > 1 ? (messages.find((m) => m.role === "user")?.content.slice(0, 40) || "New Chat") + "..." : "New Chat",
        messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedSessions.unshift(newSession);
      setCurrentSessionId(newSession.id);
    } else {
      updatedSessions[sessionIdx] = {
        ...updatedSessions[sessionIdx],
        messages,
        title: (messages.find((m) => m.role === "user")?.content.slice(0, 40) || updatedSessions[sessionIdx].title) + "...",
        updatedAt: new Date().toISOString(),
      };
    }
    setSessions(updatedSessions);
    saveSessions(mode, updatedSessions);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    if (listening) stopListening(); // mic on tha aur user ne chip/Enter/Send dabaya
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // ===== Update memory: track topics, sessions, count =====
    try {
      const mem = loadMemory();
      const topic = text.trim().toLowerCase();
      const topics = mem.commonTopics || [];
      if (!topics.includes(topic) && topic.length > 3) {
        topics.unshift(topic);
        mem.commonTopics = topics.slice(0, 10);
      }
      mem.lastInteraction = topic;
      mem.lastMode = mode;
      mem.userName = useSettings.getState().userName || mem.userName;

      // Track this as a past session (if it's the first message in this session)
      const isFirstInSession = messages.length <= 1;
      if (isFirstInSession) {
        mem.totalConversations = (mem.totalConversations || 0) + 1;
        // Extract a short topic keyword from the question
        const topicKeyword = extractTopic(text.trim());
        mem.pastSessions = mem.pastSessions || [];
        mem.pastSessions.unshift({
          timestamp: new Date().toISOString(),
          firstQuestion: text.trim().slice(0, 100),
          topic: topicKeyword,
          mode,
        });
        mem.pastSessions = mem.pastSessions.slice(0, 20); // keep last 20 sessions
      }
      saveMemory(mem);
    } catch {}

    try {
      // Auth token — the endpoint rejects anonymous calls (quota-abuse guard)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode,
          message: text.trim(),
          context,
          memory: loadMemory(),
          historicalData: buildHistoricalData(),
          // Keep last 10 messages for strong conversation memory
          history: messages.slice(-10).map((m) => ({ role: m.role, content: stripActionBlocks(m.content) })),
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        if (res.status === 429 && j) {
          // Claude-style: friendly in-chat notice + input locked till reset.
          const info = { limit: j.limit || 30, resetLabel: j.resetLabel || "4:00 AM", resetAt: j.resetAt || "" };
          setLimitHit(info);
          setQuota((q) => (q ? { ...q, remaining: 0 } : q));
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: "assistant",
              content: `⏳ Daily AI limit reached (${info.limit} messages/day). It resets at ${info.resetLabel} IST — till then the app and your data keep working normally.\n\n🎁 Tip: Invite a friend (Profile → Invite & Earn) and get +5 extra AI messages per day, permanently.`,
              timestamp: new Date().toISOString(),
            },
          ]);
          toast.info(`AI limit reached — resets at ${info.resetLabel} IST`);
          return;
        }
        throw new Error(j?.error || `HTTP ${res.status}`);
      }

      // ===== Live SSE stream — reply text appears as it is generated =====
      const replyId = uid();
      let received = false;
      let appliedActionRef = false;

      const appendBubble = (firstPiece: string) =>
        setMessages((prev) => [
          ...prev,
          { id: replyId, role: "assistant", content: firstPiece, timestamp: new Date().toISOString() },
        ]);

      const applyDelta = (piece: string) =>
        setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: m.content + piece } : m)));

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamError: string | null = null;

      outer: while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const evt = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 2);
          if (!evt.startsWith("data:")) continue;
          let ev: any;
          try { ev = JSON.parse(evt.slice(5).trim()); } catch { continue; }
          if (ev.type === "start" && ev.quota) {
            // Live quota counter (SSE start event) — display only.
            // quota.premium → admin-granted premium: no daily limit.
            setQuota({
              remaining: ev.quota.remaining ?? 0,
              limit: ev.quota.limit ?? 0,
              resetLabel: ev.quota.resetLabel || "4:00 AM",
              premium: !!ev.quota.premium,
            });
          } else if (ev.type === "delta") {
            if (!received) { received = true; setStreaming(true); appendBubble(ev.text); }
            else applyDelta(ev.text);
          } else if (ev.type === "action") {
            // Structured data action from the AI — apply to local stores now.
            // (dedupe guard: the done-event may carry the same action)
            appliedActionRef = true;
            try {
              const what = applyAIAction(ev.action);
              if (what) { console.log("[AIChat] AI action applied:", ev.action?.type, "→", what); toast.success("✓ " + what); }
            } catch (e: any) {
              console.error("[AIChat] AI action failed:", e?.message);
              toast.error("AI action failed: " + (e?.message || "unknown"));
            }
          } else if (ev.type === "done") {
            // Fallback: action embedded in the done event (e.g. non-SSE provider path)
            if (ev.action && !appliedActionRef) {
              appliedActionRef = true;
              try {
                const what = applyAIAction(ev.action);
                if (what) { console.log("[AIChat] AI action (done-event) applied:", ev.action?.type); toast.success("✓ " + what); }
              } catch { /* already logged upstream if action event failed */ }
            }
            break outer;
          } else if (ev.type === "error") {
            streamError = ev.error;
            break outer;
          }
        }
      }

      if (streamError || !received) throw new Error(streamError || "Empty response");
    } catch (e: any) {
      toast.error("AI unavailable: " + e.message);
      setMessages((prev) => {
        // If partial streamed text exists, keep it (it is real content) and
        // only append a fallback when nothing arrived.
        return [
          ...prev,
          { id: uid(), role: "assistant", content: "Sorry, I couldn't connect. Please try again.", timestamp: new Date().toISOString() },
        ];
      });
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const newChat = () => {
    setMessages([makeWelcome(mode)]);
    setCurrentSessionId(null);
    setShowHistory(false);
    // Note: limitHit intentionally reset nahi hota — limit din bhar ka
    // state hai, chat window ka nahi. Agar 4 AM nikal gaya hai to active
    // check khud false ho jayega (niche derived hai).
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setShowHistory(false);
  };

  const deleteSession = (sessionId: string) => {
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    saveSessions(mode, updated);
    if (currentSessionId === sessionId) {
      if (updated.length > 0) {
        setMessages(updated[0].messages);
        setCurrentSessionId(updated[0].id);
      } else {
        newChat();
      }
    }
  };

  // 4 AM nikal chuka hai? to limit effectively over — server naya din
  // count karega (re-render par re-derive hota hai).
  const limitActive = !!limitHit && (!limitHit.resetAt || Date.now() < new Date(limitHit.resetAt).getTime());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      // dvh-h: 100dvh (100vh fallback) — Safari (non-PWA) bottom address bar
      // 100vh-anchored input row ko cover kar leta hai; dvh bar ke saath shrink
      // hota hai → text input hamesha visible/tappable. PWA me dvh===vh → no
      // visual change. (Same pattern as .sheet-bottom fix.)
      className="fixed top-0 left-0 right-0 dvh-h z-50 flex flex-col"
      style={{ backgroundColor: "#000000" }}
    >
      {/* ===== TOP: Back arrow + Title + Actions (full BLACK) ===== */}
      <div
        className="pb-3 px-4"
        style={{
          backgroundColor: "#000000",
          color: "#FFFFFF",
          paddingTop: "max(env(safe-area-inset-top, 0px), 12px)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 w-9 -ml-1 rounded-full hover:bg-white/10 flex items-center justify-center"
              aria-label="Back"
            >
              <ChevronLeft size={26} strokeWidth={2.2} />
            </button>
            <div>
              <p className="text-[20px] font-bold tracking-tight leading-tight">{MODE_TITLE[mode]}</p>
              <p className="text-[11px] opacity-60 mt-0.5">{getModeSubtitle(mode)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={newChat}
              className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center"
              aria-label="New chat"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center"
              aria-label="Chat history"
            >
              <HistoryIcon size={16} />
            </button>
          </div>
        </div>

        {/* Mode chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {MODE_LIST.map((m) => {
            const Icon = m.icon;
            const active = m.id === mode;
            return (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onModeChange(m.id)}
                className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  active
                    ? "bg-white text-black"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                <Icon size={12} strokeWidth={active ? 2.5 : 2} />
                {m.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ===== MIDDLE: Messages ===== */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar ios-scroll px-4 py-4 space-y-3"
        style={{ backgroundColor: "var(--background, #000000)" }}
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {loading && !streaming && <TypingIndicator />}

        {/* Reply options — fresh chat pe "Try asking", har AI reply ke
            baad "Ask next" chips + text input dono hamesha available */}
        {!loading && !limitActive && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
          <div className="pt-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">
              {messages.length === 1 ? "Try asking" : "Ask next"}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTIONS[mode].map((s, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-3 rounded-2xl bg-muted hover:bg-muted/70 text-[13px] font-medium flex items-center gap-2"
                >
                  <Sparkles size={14} className="text-muted-foreground shrink-0" />
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== BOTTOM: Input + Send ===== */}
      <div className="border-t border-border px-4 pt-3 pb-6 safe-bottom bg-background">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={listening ? "Sun raha hoon..." : limitActive ? `Resets at ${limitHit!.resetLabel} IST` : `Ask ${MODE_TITLE[mode]}...`}
            disabled={loading || limitActive}
            className="flex-1 h-12 px-4 rounded-2xl bg-muted text-[14px] outline-none placeholder:text-muted-foreground disabled:opacity-50"
            maxLength={2000}
          />
          {speechSupported && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={startListening}
              disabled={loading || limitActive}
              aria-label={listening ? "Stop voice input" : "Voice input"}
              className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-30 transition-colors ${
                listening ? "bg-red-500 text-white animate-pulse" : "bg-muted text-foreground"
              }`}
            >
              <Mic size={18} />
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading || limitActive}
            className="h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center disabled:opacity-30"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </motion.button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          {limitActive
            ? `AI limit reached — resets at ${limitHit!.resetLabel} IST`
            : quota?.premium
              ? "AI uses your real data · Premium ∞ — no daily limit"
              : quota
                ? `AI uses your real data · ${quota.remaining}/${quota.limit} left today · resets ${quota.resetLabel}`
                : "AI uses your real data"}
        </p>
        {limitActive && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { onClose(); setScreen("invite"); }}
            className="mt-2 mx-auto flex items-center gap-1.5 h-9 px-4 rounded-full bg-foreground text-background text-[12px] font-bold"
          >
            <Gift size={13} />
            Invite friends · +5 msgs/day each
          </motion.button>
        )}
      </div>

      {/* ===== History Sheet ===== */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 dvh-h z-50 bg-background flex flex-col"
          >
            <div className="pt-12 pb-3 px-4 safe-top border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[20px] font-bold tracking-tight">Chat History</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{MODE_TITLE[mode]} · {sessions.length} session{sessions.length !== 1 ? "s" : ""}</p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
                  aria-label="Close history"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar ios-scroll px-4 py-4 space-y-2">
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <HistoryIcon size={32} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-[14px] font-semibold">No history yet</p>
                  <p className="text-[12px] text-muted-foreground mt-1">Your past chats will appear here.</p>
                </div>
              ) : (
                sessions.map((s) => (
                  <motion.div
                    key={s.id}
                    layout
                    whileTap={{ scale: 0.98 }}
                    onClick={() => loadSession(s)}
                    className="bg-muted rounded-2xl p-3 cursor-pointer relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(s.updatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                          {" · "}
                          {s.messages.filter((m) => m.role === "user").length} messages
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        className="h-7 w-7 rounded-full hover:bg-foreground/10 flex items-center justify-center opacity-0 group-hover:opacity-100"
                        aria-label="Delete session"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ===== Message Bubble with Markdown rendering (bold + bullets) =====
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  // Simple markdown: **bold** → <strong>, • bullets stay as-is, newlines preserved
  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      // Render **bold** in each line
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      });
      return (
        <span key={i} className="block">
          {rendered.length > 0 ? rendered : "\u00A0"}
        </span>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-muted" : "bg-foreground text-background"}`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isUser ? "bg-foreground text-background rounded-tr-md" : "bg-muted rounded-tl-md"}`}>
        <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
          {renderContent(stripActionBlocks(message.content))}
        </div>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-foreground text-background">
        <Bot size={14} />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Extract a short topic keyword from user's question =====
function extractTopic(question: string): string {
  const lower = question.toLowerCase();
  // Common financial keywords
  const keywords = [
    "spend", "spent", "expense", "budget", "save", "saving",
    "owe", "owed", "borrow", "lent", "debt",
    "income", "salary", "earn",
    "habit", "streak",
    "study", "exam", "assignment", "subject", "attendance", "syllabus",
    "task", "meeting", "project", "deadline", "bill",
    "trip", "travel", "destination", "currency",
    "history", "past", "last month", "last week", "before",
    "who", "what", "when", "how", "why", "which",
    "plan", "suggest", "recommend", "tip", "advice",
  ];
  for (const kw of keywords) {
    if (lower.includes(kw)) return kw;
  }
  // Fallback: first 3 words
  return lower.split(" ").slice(0, 3).join(" ");
}

function getModeSubtitle(mode: Mode): string {
  switch (mode) {
    case "personal": return "Finance & Life Assistant";
    case "student": return "Study Planner";
    case "office": return "Work & Productivity";
    case "trip": return "Travel Companion";
  }
}

function getWelcomeMessage(mode: Mode): string {
  switch (mode) {
    case "personal": return "Hi! Main aapka personal finance AI hoon. Expenses, budget, savings — apne real data pe kuch bhi puchho. Kya jaanna hai?";
    case "student": return "Hey! Main aapka Student AI hoon. Study plans, exams, assignments — sab saath me manage karte hain. Kya chahiye?";
    case "office": return "Hello! Main aapka Office AI hoon. Tasks, deadlines, meetings — prioritize karke bata deta hoon. Kaise help karun?";
    case "trip": return "Namaste! Main aapka Trip AI hoon. Trip budget, daily limit, savings — sab track karte hain. Kahan jaana hai?";
  }
}

// ===== Build context from user's REAL data (compact for speed) =====
function buildContext(mode: Mode): any {
  if (typeof window === "undefined") return {};
  try {
    const appData = useAppData.getState();
    const settings = useSettings.getState();

    switch (mode) {
      case "personal": {
        const todaySpending = selectTodaySpending(appData);
        const monthSpending = selectMonthSpending(appData);
        const monthIncome = selectMonthIncome(appData);
        const lentOut = selectTotalLentOut(appData);
        const borrowed = selectTotalBorrowed(appData);
        const monthlyBudget = parseInt(localStorage.getItem("trackly-monthly-budget") || "30000", 10);
        // IST dates — UTC "today" calls 12:00–5:30 AM IST expenses yesterday
        const today = istDate();
        const ym = istMonth();
        const categoryTotals: Record<string, number> = {};
        appData.expenses.filter((e) => e.date.startsWith(ym)).forEach((e) => {
          categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });
        const todayExpenses = appData.expenses.filter((e) => e.date === today).map((e) => ({ title: e.title, merchant: e.merchant, amount: e.amount, category: e.category, method: e.method, time: e.time, notes: e.notes }));
        const recentExpenses = appData.expenses.slice(0, 15).map((e) => ({ title: e.title, amount: e.amount, category: e.category, date: e.date, method: e.method }));
        return {
          user: settings.userName || "User",
          todaySpending, monthSpending, monthIncome, monthlyBudget,
          budgetRemaining: Math.max(0, monthlyBudget - monthSpending),
          budgetUsedPct: monthlyBudget > 0 ? Math.round((monthSpending / monthlyBudget) * 100) : 0,
          lentOut, borrowed, expenseCount: appData.expenses.length,
          todayExpenses, recentExpenses,
          topCategories: Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, a]) => ({ category: c, amount: a })),
          borrowLendDueSoon: appData.borrowLend.filter((b) => b.dueDate && (b.amount - b.paid) > 0).slice(0, 5).map((b) => ({ person: b.person, type: b.type, remaining: b.amount - b.paid, dueDate: b.dueDate })),
          habitsCompletedToday: appData.habits.filter((h) => h.done >= h.goal).length,
          totalHabits: appData.habits.length,
          habitStreaks: appData.habits.slice(0, 5).map((h) => ({ name: h.name, streak: h.streak, done: h.done, goal: h.goal })),
          // Aaj ke tasks (routine periods + calendar) — "aaj kya task hai" type Qs
          todayTasks: [
            ...loadRoutines().flatMap((r) => r.tasks.map((t) => ({ title: t.label, period: r.period, done: t.done }))),
            ...appData.calendarEvents.filter((c) => c.date === today).map((c) => ({ title: c.title, period: "calendar", type: c.type })),
          ].slice(0, 15),
          // Recent notes — "maine kya note likha tha" type Qs
          recentNotes: appData.notes.slice(0, 3).map((n) => ({ title: n.title, preview: String(n.preview || "").slice(0, 60) })),
          // Full habit list — routine-related Qs (skin/gym)
          habitsList: appData.habits.slice(0, 12).map((h) => ({ name: h.name, goal: h.goal, unit: h.unit, done: h.done })),
        };
      }
      case "student": {
        const student = useStudentData.getState();
        const today = istDate();
        return {
          user: settings.userName || "Student",
          subjects: student.subjects.map((s) => ({ name: s.name, attendancePct: s.attendanceTotal > 0 ? Math.round((s.attendanceAttended / s.attendanceTotal) * 100) : 0, syllabusPct: s.totalChapters > 0 ? Math.round((s.completedChapters / s.totalChapters) * 100) : 0, completedChapters: s.completedChapters, totalChapters: s.totalChapters })),
          pendingAssignments: student.assignments.filter((a) => a.status !== "completed" && a.status !== "submitted").sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 10).map((a) => ({ title: a.title, subject: a.subject, dueDate: a.dueDate, status: a.status })),
          upcomingExams: student.exams.filter((e) => new Date(e.date).getTime() >= Date.now()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5).map((e) => ({ subject: e.subject, date: e.date, time: e.time, venue: e.venue, topics: e.topics, prepared: e.prepared })),
          todayStudyGoals: student.studyGoals.filter((g) => g.date === today),
          overallSyllabusPct: student.subjects.length > 0 ? Math.round(student.subjects.reduce((acc, s) => acc + (s.totalChapters > 0 ? s.completedChapters / s.totalChapters : 0), 0) / student.subjects.length * 100) : 0,
        };
      }
      case "office": {
        const office = useOfficeData.getState();
        const today = istDate();
        return {
          user: settings.userName || "Professional",
          todayTasks: office.tasks.filter((t) => t.status !== "done").slice(0, 10).map((t) => ({ title: t.title, project: t.project, priority: t.priority, deadline: t.deadline, status: t.status })),
          completedTasks: office.tasks.filter((t) => t.status === "done").length,
          todayMeetings: office.meetings.filter((m) => m.date === today).map((m) => ({ title: m.title, time: m.time, attendees: m.attendees })),
          upcomingMeetings: office.meetings.filter((m) => new Date(m.date).getTime() >= Date.now()).slice(0, 5).map((m) => ({ title: m.title, date: m.date, time: m.time })),
          pendingBills: office.bills.filter((b) => !b.paid).map((b) => ({ name: b.name, amount: b.amount, dueDate: b.dueDate, category: b.category })),
          salaryEntries: office.salary.slice(0, 5).map((s) => ({ month: s.month, amount: s.amount })),
          totalSalaryThisYear: office.salary.reduce((acc, s) => acc + (s.amount || 0), 0),
          savingsGoals: office.savingsGoals.slice(0, 5).map((g) => ({ title: g.title, target: g.target, current: g.saved, deadline: g.deadline })),
          pomodoroCount: office.pomodoros.length,
        };
      }
      case "trip": {
        const todaySpending = selectTodaySpending(appData);
        const totalTripSpending = appData.expenses.reduce((acc, e) => acc + e.amount, 0);
        const tripExpenses = appData.expenses.slice(0, 20).map((e) => ({ title: e.title, merchant: e.merchant, amount: e.amount, category: e.category, method: e.method, date: e.date, time: e.time }));
        const tripCategoryTotals: Record<string, number> = {};
        appData.expenses.forEach((e) => { tripCategoryTotals[e.category] = (tripCategoryTotals[e.category] || 0) + e.amount; });
        return {
          user: settings.userName || "Traveler",
          tripMode: settings.tripMode, destination: settings.tripDestination, country: settings.tripCountry,
          tripStartedAt: settings.tripStartedAt,
          tripDurationDays: settings.tripStartedAt ? Math.max(1, Math.ceil((Date.now() - new Date(settings.tripStartedAt).getTime()) / 86400000)) : 1,
          currency: settings.currency.code, currencySymbol: settings.currency.symbol, preTripCurrency: settings.preTripCurrency?.code || null,
          todaySpending, totalTripSpending, expenseCount: appData.expenses.length,
          avgDaily: settings.tripStartedAt ? Math.round(totalTripSpending / Math.max(1, Math.ceil((Date.now() - new Date(settings.tripStartedAt).getTime()) / 86400000))) : 0,
          tripExpenses, categoryBreakdown: Object.entries(tripCategoryTotals).sort((a, b) => b[1] - a[1]).map(([c, a]) => ({ category: c, amount: a })),
        };
      }
      default: return {};
    }
  } catch (e) {
    console.error("[AIChat] Failed to build context:", e);
    return {};
  }
}
