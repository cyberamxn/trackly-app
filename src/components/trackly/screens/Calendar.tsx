"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Receipt, Cake, Calendar as CalIcon, CheckCircle2, Bell } from "lucide-react";
import { Card, ScreenHeader } from "../ui";
import { useAppData } from "@/lib/trackly/appData";
import { useTracklyStore } from "@/lib/trackly/store";

const typeIcons: Record<string, typeof Receipt> = {
  task: CheckCircle2,
  bill: Receipt,
  event: CalIcon,
  birthday: Cake,
  reminder: Bell,
};

export function CalendarScreen() {
  const { openQuickAdd, setScreen } = useTracklyStore();
  // Real events (synced per-user) — no demo data
  const calendarEvents = useAppData((s) => s.calendarEvents);
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today.getDate());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const monthEvents = calendarEvents.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`));
  const eventDates = new Set(monthEvents.map((e) => new Date(e.date).getDate()));
  const selectedEvents = calendarEvents.filter((e) => e.date === iso(year, month, selected));

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Calendar"
        subtitle="Tasks, bills & events"
        onBack={() => setScreen("dashboard")}
        right={
          <motion.button whileTap={{ scale: 0.9 }} onClick={openQuickAdd} className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center">
            <Plus size={18} />
          </motion.button>
        }
      />

      <div className="px-5 mt-1">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-bold tracking-tight">
              {cursor.toLocaleDateString("en-US", { month: "long" })} {year}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = day === selected;
              const hasEvent = eventDates.has(day);
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setSelected(day)}
                  className="aspect-square flex flex-col items-center justify-center"
                >
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-[14px] font-medium transition-colors ${
                      isSelected
                        ? "bg-foreground text-background"
                        : isToday
                        ? "bg-muted text-foreground font-bold"
                        : "text-foreground"
                    }`}
                  >
                    {day}
                  </div>
                  {hasEvent && (
                    <div className={`h-1 w-1 rounded-full mt-0.5 ${isSelected ? "bg-background" : "bg-foreground"}`} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Selected day events */}
      <div className="px-5 mt-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          {cursor.toLocaleDateString("en-US", { month: "long" })} {selected}
        </p>
        {selectedEvents.length > 0 ? (
          <div className="space-y-2">
            {selectedEvents.map((e) => {
              const Icon = typeIcons[e.type];
              return (
                <motion.div key={e.id} whileTap={{ scale: 0.985 }}>
                  <Card>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold truncate">{e.title}</p>
                        <p className="text-[12px] text-muted-foreground capitalize">{e.type}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="py-6 text-center">
              <p className="text-[14px] font-medium">No events this day</p>
              <p className="text-[13px] text-muted-foreground mt-1">Tap + to add one</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
