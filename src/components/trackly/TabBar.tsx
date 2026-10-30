"use client";

import { useState } from "react";
import { Home, Wallet, CheckCircle2, StickyNote, User, Plane, GraduationCap, Briefcase, Layers, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useTracklyStore, type TabId } from "@/lib/trackly/store";
import { useSettings } from "@/lib/trackly/settings";
import { activateQuickMode, type QuickMode } from "@/lib/trackly/quickModes";
import { SheetModal } from "./ui";

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "money", label: "Money", icon: Wallet },
  { id: "habits", label: "Habits", icon: CheckCircle2 },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "profile", label: "Profile", icon: User },
];

const quickModes: { id: QuickMode; label: string; desc: string; icon: typeof Home }[] = [
  { id: "normal", label: "Normal", desc: "Your everyday personal tracker", icon: Home },
  { id: "trip", label: "Trip", desc: "Travel budget — starts fresh counting", icon: Plane },
  { id: "student", label: "Student", desc: "Classes, mess, hostel & study tracker", icon: GraduationCap },
  { id: "office", label: "Office", desc: "Work tasks, meetings, salary & attendance", icon: Briefcase },
];

export function TabBar() {
  const { tab, setTab, setScreen } = useTracklyStore();
  const [showModes, setShowModes] = useState(false);
  const tripMode = useSettings((s) => s.tripMode);
  const studentMode = useSettings((s) => s.studentMode);
  const officeMode = useSettings((s) => s.officeMode);

  // Which mode is currently active — shown ONLY inside the modes sheet, never on the bar button
  const activeMode: QuickMode =
    tripMode !== "none" ? "trip" : studentMode ? "student" : officeMode ? "office" : "normal";

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
        {/* Tab bar — SOLID BLACK slab (user request: transparent → black).
            Works in BOTH themes: black bg + white icons (theme-independent),
            matching Trackly's pure black & white design language. Fixed pb-7
            (28px) bottom padding exactly like the early build — the padding
            zone is part of the black bar, so the area below the icons is
            black too. */}
        <div className="bg-black border-t border-white/10 pointer-events-auto pb-7 pt-2.5 px-1">
          <div className="flex items-center justify-around">
            {tabs.slice(0, 4).map((t) => (
              <TabButton key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
            ))}

          {/* ===== Quick Modes — instant access to Trip / Student / Office.
               Bar button stays NEUTRAL always; active mode is shown only inside the sheet. ===== */}
          <motion.button
            onClick={() => setShowModes(true)}
            whileTap={{ scale: 0.92 }}
            data-tour="tab-modes"
            aria-label="Quick modes"
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 flex-1 min-w-0 no-tap-highlight"
          >
            <Layers size={22} strokeWidth={1.8} className="text-white/45 transition-all" />
            <span className="text-[10px] font-medium tracking-tight transition-all max-w-full truncate text-white/45">
              Modes
            </span>
          </motion.button>

          <TabButton tab={tabs[4]} active={tab === tabs[4].id} onClick={() => setTab(tabs[4].id)} />
          </div>
        </div>
      </div>

      {/* ===== Quick Mode picker sheet (outside pointer-events-none container) ===== */}
      <SheetModal open={showModes} onClose={() => setShowModes(false)} title="Quick Mode">
        <p className="text-[13px] text-muted-foreground -mt-1 mb-3">
          Jump between modes instantly. Ending a mode saves its data to history first.
        </p>
        {quickModes.map((m) => {
          const Icon = m.icon;
          const isActive = activeMode === m.id;
          return (
            <motion.button
              key={m.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setShowModes(false);
                // Defer so the sheet closes before confirm dialogs / toasts appear
                setTimeout(() => activateQuickMode(m.id), 150);
              }}
              className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-2 border transition-colors ${
                isActive ? "border-foreground bg-muted" : "border-border bg-card"
              }`}
            >
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive ? "bg-foreground text-background" : "bg-muted"
                }`}
              >
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[15px] font-semibold flex items-center gap-2">
                  {m.label}
                  {isActive && (
                    <span className="text-[9px] uppercase tracking-wider bg-foreground text-background px-1.5 py-0.5 rounded-full font-bold">
                      Active
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-muted-foreground leading-snug">{m.desc}</p>
              </div>
            </motion.button>
          );
        })}

        {/* ===== Groups — shared expense splitter (persistent, not a mode) ===== */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          data-tour="open-groups"
          onClick={() => {
            setShowModes(false);
            setTimeout(() => setScreen("groups"), 120);
          }}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-2 border border-border bg-card"
        >
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-muted">
            <Users size={18} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[15px] font-semibold">Groups</p>
            <p className="text-[12px] text-muted-foreground leading-snug">
              Split shared expenses with roommates, friends & trips
            </p>
          </div>
        </motion.button>
      </SheetModal>
    </>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: { id: TabId; label: string; icon: typeof Home };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      data-tour={`tab-${tab.id}`}
      className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 flex-1 min-w-0 no-tap-highlight"
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 1.8}
        className={`transition-all ${active ? "text-white" : "text-white/45"}`}
      />
      <span
        className={`text-[10px] font-medium tracking-tight transition-all ${
          active ? "text-white" : "text-white/45"
        }`}
      >
        {tab.label}
      </span>
    </motion.button>
  );
}
