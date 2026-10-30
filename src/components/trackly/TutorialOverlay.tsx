"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronRight, ChevronLeft, Check, Sparkles,
} from "lucide-react";
import { useTracklyStore } from "@/lib/trackly/store";

type StepAction =
  | "open-quick-add"     // open the Quick Add sheet
  | "close-quick-add"    // close it
  | "go-profile"         // switch to profile tab
  | "go-home"            // back to home tab
  | null;

interface TourStep {
  target: string;        // CSS selector for the element to highlight
  title: string;
  description: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
  /** Optional side-effect to run when entering this step (e.g. open Quick Add, switch tab) */
  action?: StepAction;
  /** Extra delay (ms) before capturing the target rect — useful for sheet-open animations */
  captureDelay?: number;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "",
    title: "Welcome to Trackly!",
    description: "Let me show you around. This takes 30 seconds. Tap Next to start the tour or Skip to explore on your own.",
    placement: "center",
  },
  {
    target: "[data-tour='today-spending']",
    title: "Today's Spending",
    description: "This card shows how much you've spent today. Tap it to see a breakdown of all transactions.",
    placement: "bottom",
  },
  {
    target: "[data-tour='budget-remaining']",
    title: "Budget Tracker",
    description: "See your monthly budget and how much is left. Tap here to edit your budget amount.",
    placement: "bottom",
  },
  {
    target: "[data-tour='recent-transactions']",
    title: "Recent Transactions",
    description: "Your latest expenses and income show here. Long-press any transaction to archive or delete it.",
    placement: "top",
  },
  {
    target: "[data-tour='habit-progress']",
    title: "Habit Progress",
    description: "Track daily habits here. Tap a habit to mark progress and build streaks.",
    placement: "top",
  },
  {
    target: "[data-tour='tab-money']",
    title: "Money Tab",
    description: "Tap here to see all your expenses and income. Filter by category, search, and manage transactions.",
    placement: "top",
  },
  {
    target: "[data-tour='tab-habits']",
    title: "Habits Tab",
    description: "Build daily habits with streaks, goals, and progress tracking.",
    placement: "top",
  },
  {
    target: "[data-tour='tab-notes']",
    title: "Notes Tab",
    description: "Quick notes with tags, pinning, and search. Capture ideas fast.",
    placement: "top",
  },
  {
    target: "[data-tour='tab-profile']",
    title: "Profile Tab",
    description: "All settings live here — AI Assistant, Trip / Student / Office modes, currency, theme, archive, and more.",
    placement: "top",
  },
  // ===== Quick Add — open the sheet and explain how to use it =====
  {
    target: "[data-tour='quick-add']",
    title: "Quick Add Button",
    description: "The most important button! Tap + to add anything — expense, income, shopping, note, habit. The sheet slides up from here.",
    placement: "top",
    action: "open-quick-add",
    captureDelay: 400,
  },
  {
    target: "[data-tour='quick-add-input']",
    title: "Just Type — AI Auto-Fills",
    description: "Type something like 'Coffee 280' or 'Aloo 50' — Trackly auto-detects the amount, category, and merchant. Tap the mic to speak instead. Hit Save and you're done in 3 seconds.",
    placement: "top",
    action: null,
  },
  {
    target: "",
    title: "Quick Add Tips",
    description: "Works for everything: 'Salary 85000' (income), '2500 from Priya' (borrowed), 'Pay credit card bill' (reminder), 'Drink 8 glasses water' (habit). Try it after the tour!",
    placement: "center",
    action: "close-quick-add",
  },
  // ===== Profile tab — AI + modes =====
  {
    target: "[data-tour='tab-profile']",
    title: "Now Let's Open Profile",
    description: "Tap here to open the Profile tab — that's where the AI Assistant and all Life Modes live.",
    placement: "top",
    action: "go-profile",
    captureDelay: 600,
  },
  {
    target: "[data-tour='ai-assistant']",
    title: "Trackly AI",
    description: "Chat with an AI that knows YOUR data. 4 modes: Personal (everyday), Student, Office, Trip. Ask 'How much did I spend on food this week?' and it answers from your real transactions.",
    placement: "top",
  },
  {
    target: "[data-tour='trip-mode']",
    title: "Trip Mode",
    description: "Going on a trip? Start Trip Mode — Trackly saves your current data, resets the counters, and tracks this trip separately (with auto currency conversion for international trips). When you end the trip, everything is saved to history and your old data comes back.",
    placement: "top",
  },
  {
    target: "[data-tour='student-mode']",
    title: "Student Mode",
    description: "Transforms Trackly into a full student life manager — classes, assignments, exams, attendance, mess, hostel & budget. Same save/restore flow: your regular data is preserved, you can resume or end the session anytime.",
    placement: "top",
  },
  {
    target: "[data-tour='office-mode']",
    title: "Office Mode",
    description: "For working professionals — work tasks, meetings, attendance, salary, bills, savings goals, and pomodoro productivity tracking. Toggle it on and the dashboard switches to office-focused data.",
    placement: "top",
  },
  {
    target: "",
    title: "You're all set!",
    description: "That's Trackly! Start by tapping + to add your first expense. Try the AI Assistant from Profile, and start a Life Mode whenever you need it. Your data syncs automatically across all devices. Enjoy!",
    placement: "center",
    action: "go-home",
  },
];

const TOUR_KEY = "trackly-tour-seen";

export function TourOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  // Store actions for side-effects (open Quick Add, switch tabs, etc.)
  const { openQuickAdd, closeQuickAdd, setTab } = useTracklyStore();
  // Keep a ref to the latest step's target so scroll listeners can re-query
  const currentTargetRef = useRef<string>("");

  useEffect(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  // Find, scroll into view, and highlight the target element. Also runs the
  // optional `action` for the current step (open Quick Add, switch tab, …).
  useEffect(() => {
    if (!visible) return;
    const current = TOUR_STEPS[step];
    currentTargetRef.current = current.target;

    // Run the side-effect (open/close Quick Add, switch tab) BEFORE we try to
    // find the target — those actions need a moment to render.
    if (current.action === "open-quick-add") {
      openQuickAdd();
    } else if (current.action === "close-quick-add") {
      closeQuickAdd();
    } else if (current.action === "go-profile") {
      setTab("profile");
    } else if (current.action === "go-home") {
      setTab("home");
    }

    if (!current.target) {
      setTargetRect(null);
      return;
    }

    const captureRect = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    };

    const findElement = () => {
      const el = document.querySelector(current.target) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        captureRect(el);
        setTimeout(() => captureRect(el), 350);
        setTimeout(() => captureRect(el), 700);
      } else {
        setTargetRect(null);
      }
    };

    // Initial capture + a delayed retry so sheet-open / tab-switch animations
    // have time to settle before we measure the target's position.
    const initialDelay = current.captureDelay ?? 0;
    const initialTimer = setTimeout(findElement, initialDelay);
    const retryTimer = setTimeout(findElement, initialDelay + 500);

    // Keep spotlight in sync with scroll/resize while this step is active.
    const handleScroll = () => {
      if (currentTargetRef.current !== current.target) return;
      const el = document.querySelector(current.target) as HTMLElement | null;
      if (el) captureRect(el);
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(retryTimer);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, visible]);

  // If the tour is dismissed mid-way, make sure we close any open Quick Add
  // sheet and return to the home tab so the user isn't left in a weird state.
  const finish = () => {
    setVisible(false);
    closeQuickAdd();
    localStorage.setItem(TOUR_KEY, "1");
    setTimeout(() => onComplete(), 300);
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const skip = () => finish();

  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;
  const isCenter = current.placement === "center" || !targetRect;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (isCenter) {
      // Centered: position the box's top-left at viewport center, then use
      // framer-motion's x/y (set below on the motion.div) to translate -50%/-50%.
      // We can NOT use CSS `transform: translate(-50%, -50%)` here because
      // framer-motion's `y` animation prop would overwrite it.
      return {
        top: "50%",
        left: "50%",
        maxWidth: "340px",
      };
    }

    const padding = 12;
    const tooltipWidth = 300;
    let top = 0;
    let left = 0;

    if (current.placement === "bottom") {
      top = targetRect.bottom + padding;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    } else if (current.placement === "top") {
      top = targetRect.top - padding - 200; // approximate tooltip height
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    } else if (current.placement === "left") {
      top = targetRect.top + targetRect.height / 2 - 100;
      left = targetRect.left - tooltipWidth - padding;
    } else if (current.placement === "right") {
      top = targetRect.top + targetRect.height / 2 - 100;
      left = targetRect.right + padding;
    }

    // Keep tooltip within viewport
    left = Math.max(padding, Math.min(left, viewport.w - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, viewport.h - 220));

    return {
      top: `${top}px`,
      left: `${left}px`,
      maxWidth: `${tooltipWidth}px`,
    };
  };

  // Spotlight cutout dimensions
  const spotlightStyle = (): React.CSSProperties => {
    if (!targetRect || current.placement === "center") {
      return { display: "none" };
    }
    const expand = 8;
    return {
      position: "absolute",
      left: `${targetRect.left - expand}px`,
      top: `${targetRect.top - expand}px`,
      width: `${targetRect.width + expand * 2}px`,
      height: `${targetRect.height + expand * 2}px`,
      borderRadius: "16px",
      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75)",
      transition: "all 0.3s ease",
      zIndex: 100,
      pointerEvents: "none",
    };
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Dark overlay (full screen) OR spotlight cutout */}
          {current.placement === "center" || !targetRect ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
              onClick={(e) => {
                if (e.target === e.currentTarget) skip();
              }}
            />
          ) : (
            <div style={spotlightStyle()} />
          )}

          {/* Tooltip */}
          <motion.div
            key={step}
            initial={{
              opacity: 0,
              scale: 0.9,
              x: isCenter ? "-50%" : 0,
              y: isCenter ? "-50%" : 10,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: isCenter ? "-50%" : 0,
              y: isCenter ? "-50%" : 0,
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{
              position: "fixed",
              zIndex: 101,
              ...getTooltipStyle(),
            }}
            className="bg-background rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-foreground"
                animate={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Header row */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isFirst && <Sparkles size={16} className="text-foreground" />}
                  <h3 className="text-[16px] font-bold tracking-tight">{current.title}</h3>
                </div>
                <button
                  onClick={skip}
                  className="h-7 px-2.5 rounded-full bg-muted text-[11px] font-medium hover:bg-muted/70 shrink-0"
                >
                  Skip
                </button>
              </div>

              {/* Description */}
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {current.description}
              </p>

              {/* Step counter */}
              <div className="flex items-center gap-1 mt-3 mb-3">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i === step ? "w-5 bg-foreground" : i < step ? "w-1 bg-foreground/40" : "w-1 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={prev}
                    className="h-10 px-3 rounded-xl bg-muted text-[13px] font-medium flex items-center gap-1"
                  >
                    <ChevronLeft size={14} /> Back
                  </motion.button>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={next}
                  className="flex-1 h-10 rounded-xl bg-foreground text-background font-semibold text-[14px] flex items-center justify-center gap-1.5"
                >
                  {isLast ? (
                    <>
                      <Check size={16} /> Done
                    </>
                  ) : (
                    <>
                      {isFirst ? "Start Tour" : "Next"}
                      <ChevronRight size={16} />
                    </>
                  )}
                </motion.button>
              </div>

              <p className="text-[10px] text-muted-foreground text-center mt-2">
                {step + 1} of {TOUR_STEPS.length}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function shouldShowTour(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(TOUR_KEY);
}

export function resetTour() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOUR_KEY);
  }
}
