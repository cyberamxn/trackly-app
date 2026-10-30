"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTracklyStore } from "@/lib/trackly/store";
import { Check, ScanFace, Cloud, Bell, Zap } from "lucide-react";

const slides = [
  {
    title: "Track everything.",
    subtitle: "One app for your money, habits, notes & life.",
    illustration: "logo",
  },
  {
    title: "Quick Add in 3 seconds.",
    subtitle: "Type “Petrol 1200” — Trackly detects the amount, category & date.",
    illustration: "quickadd",
  },
  {
    title: "Private by design.",
    subtitle: "Face ID lock, on-device storage, optional iCloud sync.",
    illustration: "privacy",
  },
  {
    title: "Built for iOS & Android.",
    subtitle: "Widgets, Siri, Action button, Live Activities & more.",
    illustration: "ios",
  },
];

export function Onboarding({ onDone }: { onDone?: () => void }) {
  const { completeOnboarding } = useTracklyStore();
  const [idx, setIdx] = useState(0);
  const last = idx === slides.length - 1;

  const handleComplete = () => {
    completeOnboarding();
    if (onDone) onDone();
  };

  const next = () => (last ? handleComplete() : setIdx((i) => i + 1));
  const skip = () => handleComplete();

  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      <div className="flex justify-end px-6 pt-2">
        <button onClick={skip} className="text-[15px] text-muted-foreground font-medium">
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center"
          >
            <Illustration kind={slides[idx].illustration} />
            <h1 className="text-[32px] font-bold tracking-tight leading-tight mt-10 max-w-xs">
              {slides[idx].title}
            </h1>
            <p className="text-[16px] text-muted-foreground mt-3 max-w-xs leading-relaxed">
              {slides[idx].subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-12">
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-7 bg-foreground" : "w-1.5 bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={next}
          className="w-full h-[54px] rounded-2xl bg-foreground text-background font-semibold text-[16px]"
        >
          {last ? "Get Started" : "Continue"}
        </motion.button>
        {!last && (
          <button onClick={skip} className="w-full text-center text-[15px] text-muted-foreground mt-3">
            Skip onboarding
          </button>
        )}
      </div>
    </div>
  );
}

function Illustration({ kind }: { kind: string }) {
  if (kind === "logo") {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative"
      >
        <div className="w-32 h-32 rounded-[28px] bg-foreground flex items-center justify-center shadow-float">
          <div className="w-16 h-16 rounded-full border-[5px] border-background flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-background" />
          </div>
        </div>
        {/* Floating mini cards */}
        <FloatingCard className="absolute -top-2 -right-8" delay={0.3}>
          <Zap size={12} />
        </FloatingCard>
        <FloatingCard className="absolute -bottom-3 -left-6" delay={0.5}>
          <Check size={12} />
        </FloatingCard>
      </motion.div>
    );
  }
  if (kind === "quickadd") {
    return (
      <div className="w-full max-w-[280px]">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Quick Add</div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            className="overflow-hidden whitespace-nowrap text-[18px] font-semibold"
          >
            Petrol 1200
          </motion.div>
          <div className="h-px bg-border my-3" />
          <div className="space-y-2">
            <PillRow label="Amount" value="₹1,200" />
            <PillRow label="Category" value="Fuel" />
            <PillRow label="Date" value="Today, 6:20 PM" />
            <PillRow label="Payment" value="Card (suggested)" />
          </div>
        </div>
      </div>
    );
  }
  if (kind === "privacy") {
    return (
      <div className="flex flex-col items-center gap-4">
        <motion.div
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="w-28 h-28 rounded-full bg-foreground flex items-center justify-center"
        >
          <ScanFace size={48} className="text-background" strokeWidth={1.5} />
        </motion.div>
        <div className="flex gap-3">
          <FloatingCard><Cloud size={14} /></FloatingCard>
          <FloatingCard delay={0.2}><Bell size={14} /></FloatingCard>
        </div>
      </div>
    );
  }
  // ios
  return (
    <div className="grid grid-cols-2 gap-3 w-[260px]">
      <WidgetPreview title="Spending" value="₹2,935" />
      <WidgetPreview title="Budget Left" value="₹5,500" />
      <WidgetPreview title="Habits" value="5/7" />
      <WidgetPreview title="Quick Add" value="+" big />
    </div>
  );
}

function FloatingCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 18 }}
      className={`bg-foreground text-background rounded-xl px-2 py-1.5 shadow-float ${className}`}
    >
      {children}
    </motion.div>
  );
}

function PillRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium bg-muted px-2 py-0.5 rounded-md">{value}</span>
    </div>
  );
}

function WidgetPreview({ title, value, big }: { title: string; value: string; big?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 aspect-square flex flex-col justify-between">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</span>
      <span className={`font-bold ${big ? "text-[28px]" : "text-[20px]"} leading-none`}>{value}</span>
    </div>
  );
}
