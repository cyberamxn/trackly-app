"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ArrowDownLeft, ArrowUpRight, ShoppingBag, HandCoins, PiggyBank,
  StickyNote, CheckCircle2, Bell, Flame, Mic, Sparkles, Check, Loader2,
  ChevronDown, ChevronUp, ChevronRight,
} from "lucide-react";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData, type QuickAddType } from "@/lib/trackly/appData";
import { CategoryIcon } from "./CategoryIcon";
import { expenseCategories, paymentMethods, formatINR } from "@/lib/trackly/data";
import { istDate, istTime } from "@/lib/trackly/ist";
import { loadRoutines, saveRoutines } from "@/lib/trackly/routine";
import { toast } from "sonner";

const types: { id: QuickAddType; label: string; icon: typeof ShoppingBag }[] = [
  { id: "expense", label: "Expense", icon: ArrowDownLeft },
  { id: "income", label: "Income", icon: ArrowUpRight },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "borrowed", label: "Borrowed", icon: HandCoins },
  { id: "lent", label: "Lent", icon: PiggyBank },
  { id: "note", label: "Note", icon: StickyNote },
  { id: "task", label: "Task", icon: CheckCircle2 },
  { id: "reminder", label: "Reminder", icon: Bell },
  { id: "habit", label: "Habit", icon: Flame },
];

type Step = "input" | "saving" | "success";

interface Parsed {
  amount?: number;
  category?: string;
  merchant?: string;
  method?: string;
  date?: string;
}

// Smart category detection — supports English + Hindi/Hinglish keywords.
// Order matters: more specific categories (grocery) checked before general (food).
const CATEGORY_KEYWORDS: { keys: string[]; cat: string }[] = [
  // Fuel
  { keys: ["petrol", "fuel", "diesel", "gas", "shell", "bp", "hindustan", "indian oil", "filling"], cat: "fuel" },
  // Grocery — sabji, vegetables, daily essentials
  { keys: [
    "aloo", "aalu", "potato", "piyaz", "pyaz", "onion", "bindi", "bhindi", "okra",
    "tamatar", "tomato", "sabji", "sabzi", "vegetable", "veggie", "achar", "achari",
    "pickle", "atta", "flour", "chawal", "rice", "dal", "lentil", "masala", "spice",
    "namak", "salt", "cheeni", "sugar", "doodh", "milk", "paneer", "dahi", "curd",
    "yogurt", "bread", "pav", "biscuit", "tea", "chai", "patti", "grocery", "kirana",
    "store", "market", "vegetable market",
  ], cat: "grocery" },
  // Food — restaurant, snacks, fast food
  { keys: [
    "coffee", "starbucks", "tea", "breakfast", "lunch", "dinner", "food",
    "restaurant", "zomato", "swiggy", "momo", "momos", "pizza", "burger",
    "ice cream", "icecream", "kulfi", "chicken", "biryani", "pulao", "thali",
    "chapati", "roti", "paratha", "samosa", "kachori", "jalebi", "halwa",
    "chaat", "pani puri", "gol gappe", "dosa", "idli", "vada", "uttapam",
    "noodles", "pasta", "maggi", "sandwich", "roll", "wrap", "shawarma",
    "kebab", "tikka", "curry", "sweets", "mithai", "laddu", "barfi",
  ], cat: "food" },
  // Travel
  { keys: ["uber", "ola", "cab", "metro", "train", "flight", "ticket", "bus", "rickshaw", "auto"], cat: "travel" },
  // Entertainment
  { keys: ["movie", "netflix", "spotify", "game", "prime", "hotstar", "disney", "theater", "cinema", "concert"], cat: "entertainment" },
  // Healthcare
  { keys: ["gym", "doctor", "medicine", "pharmacy", "hospital", "clinic", "medical", "health"], cat: "healthcare" },
  // Education
  { keys: ["book", "course", "udemy", "coursera", "tuition", "fee", "exam", "study"], cat: "education" },
  // Rent
  { keys: ["rent", "lease", "tenant"], cat: "rent" },
  // Bills
  { keys: ["bill", "electric", "water", "internet", "airtel", "jio", "wifi", "broadband", "recharge"], cat: "bills" },
  // EMI
  { keys: ["emi", "loan", "installment"], cat: "emi" },
  // Shopping
  { keys: ["shopping", "amazon", "flipkart", "mall", "clothes", "shoes", "shirt", "jeans"], cat: "shopping" },
];

function detectCategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const c of CATEGORY_KEYWORDS) {
    if (c.keys.some((k) => lower.includes(k))) {
      return c.cat;
    }
  }
  return undefined;
}

export function QuickAdd() {
  const { quickAddOpen, closeQuickAdd } = useTracklyStore();
  const appData = useAppData();

  const [step, setStep] = useState<Step>("input");
  const [raw, setRaw] = useState("");
  const [activeType, setActiveType] = useState<QuickAddType>("expense");
  const [parsed, setParsed] = useState<Parsed>({});
  const [selectedMethod, setSelectedMethod] = useState<string>("Card");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);

  // Re-parse the raw input + apply current selectedMethod + selectedCategory
  const parse = useCallback((input: string): Parsed => {
    const amountMatch = input.match(/(\d[\d,]*)/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, "")) : undefined;
    const merchant = input.replace(amountMatch?.[0] ?? "", "").trim() || undefined;
    const detectedCat = detectCategory(input);
    return {
      amount,
      merchant,
      category: detectedCat,
      method: selectedMethod,
    };
  }, [selectedMethod]);

  // ===== Voice input helpers (Web Speech API) =====
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (typeof window !== "undefined" && (window as any).SpeechRecognition) ||
      (typeof window !== "undefined" && (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      toast.error("Voice input not supported on this browser");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Listening… speak now");
    };

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const cleaned = transcript
        .replace(/\bRupees\b/gi, "")
        .replace(/\brupaye\b/gi, "")
        .replace(/\b₹\b/g, "")
        .trim();
      setRaw(cleaned);
      if (cleaned.trim()) {
        const p = parse(cleaned);
        setParsed(p);
        setSelectedCategory(p.category ?? undefined);
      } else {
        setParsed({});
        setSelectedCategory(undefined);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast.error("Microphone permission denied");
      } else if (event.error === "no-speech") {
        toast.error("No speech detected");
      } else {
        toast.error("Voice input failed: " + event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      setIsListening(false);
      toast.error("Could not start voice input");
    }
  }, [parse]);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Reset state when modal closes
  useEffect(() => {
    if (!quickAddOpen) {
      const t = setTimeout(() => {
        setRaw("");
        setStep("input");
        setParsed({});
        setActiveType("expense");
        setSelectedMethod("Card");
        setSelectedCategory(undefined);
        stopListening();
      }, 250);
      return () => clearTimeout(t);
    }
  }, [quickAddOpen, stopListening]);

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      stopListening();
    };
  }, [stopListening]);

  const handleInput = (v: string) => {
    setRaw(v);
    if (v.trim()) {
      const p = parse(v);
      setParsed(p);
      // Auto-update selectedCategory when a new category is detected (only if user hasn't manually overridden)
      setSelectedCategory((prev) => p.category ?? prev);
    } else {
      setParsed({});
      setSelectedCategory(undefined);
    }
  };

  // When user manually selects a payment method, update parsed.method too
  const handleMethodChange = (m: string) => {
    setSelectedMethod(m);
    setParsed((prev) => ({ ...prev, method: m }));
  };

  // When user manually selects a category, override the detected one
  const handleCategoryChange = (c: string) => {
    setSelectedCategory(c);
    setParsed((prev) => ({ ...prev, category: c }));
    setCategoryDropdownOpen(false);
  };

  // ===== Voice input (Web Speech API) =====
  // Build the payload and dispatch to the store
  const persistToStore = (): { label: string; amount?: number } => {
    const now = new Date();
    // Record in Indian time (IST) — UTC dates/times are 5:30 off for IST users
    const today = istDate(now);
    const time = istTime(now);
    const merchant = parsed.merchant || raw.trim();
    const amount = parsed.amount ?? 0;
    const finalCategory = selectedCategory ?? parsed.category ?? "others";

    switch (activeType) {
      case "expense":
        appData.addExpense({
          title: merchant,
          merchant: merchant,
          amount,
          category: finalCategory,
          method: selectedMethod,
          date: today,
          time,
          notes: "",
          tags: [],
        });
        return { label: "expense", amount };
      case "income":
        appData.addIncome({
          source: merchant,
          amount,
          date: today,
          method: selectedMethod,
        });
        return { label: "income", amount };
      case "shopping":
        appData.addShopping({
          name: merchant,
          store: "Quick Add",
          price: amount,
          status: "pending",
        });
        return { label: "shopping item", amount };
      case "borrowed":
      case "lent": {
        const lower = raw.toLowerCase();
        const personMatch = raw.match(/(?:from|to)\s+([A-Za-z\s]+)/i);
        const person = personMatch ? personMatch[1].trim() : "Unknown";
        appData.addBorrowLend({
          person,
          type: activeType === "lent" ? "lent" : "borrowed",
          amount,
          paid: 0,
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        });
        return { label: `${activeType} entry`, amount };
      }
      case "note":
        appData.addNote({
          title: merchant.slice(0, 40),
          preview: raw.trim(),
        });
        return { label: "note" };
      case "task": {
        // A dated task ("gym tomorrow", "submit report Friday", "15 oct ko...")
        // goes to the CALENDAR (cloud-synced, shows on its date) — same as the
        // AI's add_task. Only undated tasks land in today's routine.
        const when = parseWhenText(raw, now);
        if (when) {
          appData.addCalendarEvent({
            title: when.title,
            date: when.date,
            type: "task",
          });
          return { label: "task" };
        }
        // Undated task → today's Routine ("Today's Tasks" on Dashboard).
        // Pick the period from the current IST hour so it lands in the right slot.
        const hour = parseInt(istTime(now).split(":")[0], 10);
        const period = hour >= 5 && hour < 12 ? "Morning" : hour >= 12 && hour < 17 ? "Afternoon" : hour >= 17 && hour < 21 ? "Evening" : "Night";
        const routines = loadRoutines();
        const target = routines.find((r) => r.period === period) ?? routines[0];
        const taskId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        if (target) {
          target.tasks = [...target.tasks, { id: taskId, label: raw.trim(), done: false }];
          saveRoutines(routines);
          // Notify open screens (Dashboard / Routine) that tasks changed
          window.dispatchEvent(new CustomEvent("trackly-routines-changed"));
        }
        return { label: "task" };
      }
      case "reminder":
        appData.addCalendarEvent({
          title: raw.trim(),
          date: today,
          type: "reminder",
        });
        return { label: "reminder" };
      case "habit":
        appData.addHabit({
          name: merchant,
          icon: "flame",
          goal: 1,
          unit: "time",
        });
        return { label: "habit" };
      default:
        return { label: "entry" };
    }
  };

  const handleConfirm = () => {
    if (!raw.trim()) return;
    stopListening();
    setStep("saving");

    setTimeout(() => {
      try {
        const result = persistToStore();
        setStep("success");
        toast.success(
          result.amount
            ? `Added ${formatINR(result.amount)} to ${result.label}`
            : `Added ${result.label}`
        );
        successTimeoutRef.current = setTimeout(() => {
          closeQuickAdd();
        }, 900);
      } catch (err) {
        console.error("Quick Add save failed:", err);
        toast.error("Could not save. Please try again.");
        setStep("input");
      }
    }, 450);
  };

  return (
    <AnimatePresence>
      {quickAddOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === "input" ? closeQuickAdd : undefined}
            className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute bottom-0 left-0 right-0 z-50 rounded-t-[32px] bg-background pb-8"
          >
            {/* Grabber */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-5 pt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[20px] font-bold">Quick Add</h2>
                <button
                  onClick={closeQuickAdd}
                  disabled={step !== "input"}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center disabled:opacity-50"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Type selector */}
              <div className={`flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-3 ${step !== "input" ? "pointer-events-none opacity-50" : ""}`}>
                {types.map((t) => {
                  const Icon = t.icon;
                  const active = activeType === t.id;
                  return (
                    <motion.button
                      key={t.id}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setActiveType(t.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border text-[13px] font-medium ${
                        active ? "bg-foreground text-background border-foreground" : "border-border"
                      }`}
                    >
                      <Icon size={14} />
                      {t.label}
                    </motion.button>
                  );
                })}
              </div>

              {step === "input" ? (
                <>
                  {/* Smart input with voice button (NO camera) */}
                  <div className="relative mt-2" data-tour="quick-add-input">
                    <input
                      autoFocus
                      value={raw}
                      onChange={(e) => handleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && raw.trim()) handleConfirm();
                      }}
                      placeholder={placeholderFor(activeType)}
                      className="w-full bg-muted rounded-2xl px-4 py-4 pr-14 text-[17px] font-medium outline-none placeholder:text-muted-foreground"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={toggleVoice}
                        className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                          isListening
                            ? "bg-red-500 text-white animate-pulse"
                            : "bg-background text-foreground"
                        }`}
                        aria-label="Voice input"
                      >
                        <Mic size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Voice listening indicator */}
                  {isListening && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-center justify-center gap-2 text-[13px] text-muted-foreground"
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      Listening… speak your expense
                    </motion.div>
                  )}

                  {/* Live detection preview */}
                  <AnimatePresence>
                    {parsed.amount && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 bg-muted rounded-2xl p-4"
                      >
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-3">
                          <Sparkles size={13} />
                          Detected
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <DetectedField label="Amount" value={formatINR(parsed.amount)} highlight />
                          {/* Category — tap to open inline dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                              className="w-full text-left active:opacity-70 transition-opacity"
                            >
                              <DetectedField
                                label="Category · tap to change"
                                value={selectedCategory ? cap(selectedCategory) : (parsed.category ? cap(parsed.category) : "Others")}
                                icon={selectedCategory ?? parsed.category}
                              />
                            </button>
                            {categoryDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-full left-0 right-0 mt-1 z-20 bg-background border border-border rounded-2xl shadow-float max-h-[180px] overflow-y-auto no-scrollbar ios-scroll"
                              >
                                {expenseCategories.map((c) => {
                                  const isActive = (selectedCategory ?? parsed.category ?? "others") === c.id;
                                  return (
                                    <button
                                      key={c.id}
                                      onClick={() => handleCategoryChange(c.id)}
                                      className={`w-full px-3 py-2 flex items-center gap-2 text-[13px] font-medium transition-colors ${
                                        isActive ? "bg-foreground text-background" : "hover:bg-muted"
                                      }`}
                                    >
                                      <CategoryIcon name={c.icon} size={13} />
                                      {c.label}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </div>
                          <DetectedField label="Merchant" value={parsed.merchant ?? "—"} />
                          <DetectedField label="Payment" value={selectedMethod} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-[12px] text-muted-foreground">
                          <span>
                            Today, {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Payment method chips — clickable, updates detected field */}
                  {activeType === "expense" && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {paymentMethods.slice(0, 3).map((m) => (
                        <button
                          key={m}
                          onClick={() => handleMethodChange(m)}
                          className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${
                            selectedMethod === m
                              ? "bg-foreground text-background border-foreground"
                              : "border-border"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleConfirm}
                    disabled={!raw.trim()}
                    className="w-full h-[52px] mt-4 rounded-2xl bg-foreground text-background font-semibold text-[16px] disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Save
                  </motion.button>
                  <p className="text-center text-[12px] text-muted-foreground mt-2">
                    Takes less than 3 seconds · Tip: &ldquo;Coffee 280&rdquo; or &ldquo;Aloo 50&rdquo;
                  </p>
                </>
              ) : step === "saving" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <Loader2 size={40} className="animate-spin text-foreground" />
                  <p className="text-[16px] font-semibold mt-4">Saving…</p>
                  <p className="text-[13px] text-muted-foreground mt-1">Adding to your {activeType}</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 14 }}
                    className="h-20 w-20 rounded-full bg-foreground flex items-center justify-center"
                  >
                    <Check size={36} className="text-background" strokeWidth={3} />
                  </motion.div>
                  <p className="text-[18px] font-semibold mt-4">Saved</p>
                  <p className="text-[14px] text-muted-foreground mt-1">
                    {parsed.amount
                      ? `${formatINR(parsed.amount)} added to your ${activeType}`
                      : `Added to your ${activeType}`}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function placeholderFor(t: QuickAddType): string {
  const map: Record<QuickAddType, string> = {
    expense: "e.g. Petrol 1200 or Aloo 50",
    income: "e.g. Salary 85000",
    shopping: "e.g. AirPods 24900",
    borrowed: "e.g. 2500 from Priya",
    lent: "e.g. 5000 to Rahul",
    note: "Type your note…",
    task: "e.g. Submit report tomorrow",
    reminder: "e.g. Pay credit card bill",
    habit: "e.g. Drink 8 glasses water",
  };
  return map[t];
}

function DetectedField({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div
        className={`flex items-center gap-1.5 mt-0.5 ${
          highlight ? "text-[18px] font-bold" : "text-[14px] font-medium"
        }`}
      >
        {icon && (
          <div className="h-5 w-5 rounded bg-background flex items-center justify-center">
            <CategoryIcon name={icon} size={11} />
          </div>
        )}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================
// parseWhenText — natural-language DATE detection for tasks.
// Returns { date: "YYYY-MM-DD", title } when the text names a
// FUTURE day (tomorrow/kal, parso, Friday, 15 oct, "in 3 days"),
// or null for undated/today tasks (those stay in today's routine).
// Dates are IST — same anchor the AI route uses.
// ============================================================
const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, ravivar: 0, sombar: 1, monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2, mangalvar: 2, wednesday: 3, wed: 3,
  budhvar: 3, thursday: 4, thu: 4, thurs: 4, guruvar: 4,
  friday: 5, fri: 5, shukravar: 5, saturday: 6, sat: 6, shanivar: 6,
};
const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 8, october: 8, nov: 9, november: 9,
  dec: 10, december: 10,
};

function parseWhenText(text: string, now: Date): { date: string; title: string } | null {
  const lower = text.toLowerCase();
  const todayIST = istDate(now);
  const plusDays = (n: number) => istDate(new Date(now.getTime() + n * 86400000));

  let date: string | null = null;
  let cleaned = lower;

  // tomorrow / kal / parso / day-after
  if (/\b(tomorrow|kal)\b/.test(cleaned)) {
    date = plusDays(1);
    cleaned = cleaned.replace(/\b(tomorrow|kal)\b/g, " ");
  } else if (/\b(parso|day after tomorrow)\b/.test(cleaned)) {
    date = plusDays(2);
    cleaned = cleaned.replace(/\b(parso|day after tomorrow)\b/g, " ");
  } else if (/\bin (\d{1,2}) days?\b/.test(cleaned)) {
    const n = parseInt(cleaned.match(/\bin (\d{1,2}) days?\b/)![1], 10);
    date = plusDays(n);
    cleaned = cleaned.replace(/\bin \d{1,2} days?\b/g, " ");
  } else {
    // Weekday ("friday ko") — next occurrence (today → next week)
    const wd = Object.keys(WEEKDAYS).find((k) => new RegExp(`\\b${k}\\b`).test(cleaned));
    if (wd) {
      const target = WEEKDAYS[wd];
      const cur = new Date(now.getTime() + 5.5 * 3600000).getUTCDay(); // IST weekday
      let diff = (target - cur + 7) % 7;
      if (diff === 0) diff = 7; // "friday" on a friday = next friday
      date = plusDays(diff);
      cleaned = cleaned.replace(new RegExp(`\\b${wd}\\b`, "g"), " ");
    } else {
      // "15 oct" / "oct 15" / "15th" / "on 15"
      const dm = cleaned.match(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/);
      const md = cleaned.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*(\d{1,2})\b/);
      const nth = cleaned.match(/\b(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\b(?!\s*(?:am|pm|:|\d))/);
      if (dm) {
        const day = parseInt(dm[1], 10);
        const month = MONTHS[dm[2]];
        date = nextCalendarDate(now, day, month, todayIST);
        cleaned = cleaned.replace(dm[0], " ");
      } else if (md) {
        const day = parseInt(md[2], 10);
        const month = MONTHS[md[1]];
        date = nextCalendarDate(now, day, month, todayIST);
        cleaned = cleaned.replace(md[0], " ");
      } else if (nth) {
        const day = parseInt(nth[1], 10);
        if (day >= 1 && day <= 31) {
          const curMonth = parseInt(todayIST.slice(5, 7), 10) - 1;
          date = nextCalendarDate(now, day, curMonth, todayIST);
          cleaned = cleaned.replace(nth[0], " ");
        }
      }
    }
  }

  if (!date) return null; // undated / "aaj" / "today" → routine

  // Rebuild the title from the ORIGINAL casing minus the date words: walk the
  // original tokens and keep those still present (in order) in the cleaned
  // lowercase copy — date words were already stripped from it above.
  const keep = cleaned.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let ki = 0;
  for (const w of text.split(/\s+/)) {
    if (ki < keep.length && w.toLowerCase() === keep[ki]) {
      out.push(w);
      ki++;
    }
  }
  const title = out.join(" ").replace(/\s+/g, " ").trim();

  return { date, title: title || text.trim() };
}

/** Nearest future date with the given day/month (rolls to next year if past). */
function nextCalendarDate(now: Date, day: number, month: number, todayIST: string): string {
  const year = parseInt(todayIST.slice(0, 4), 10);
  const thisYear = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (thisYear >= todayIST) return thisYear;
  return `${year + 1}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
