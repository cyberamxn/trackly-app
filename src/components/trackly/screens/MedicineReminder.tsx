"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill, Plus, Clock, X, Check, Trash2, Calendar,
} from "lucide-react";
import { ScreenHeader, Card, EmptyState } from "../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { toast } from "sonner";

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  time: string;
  days: string[];
  taken: boolean;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Local state (no store hook — kept simple for demo)
export function MedicineReminder() {
  const { setScreen } = useTracklyStore();
  const [medicines, setMedicines] = useState<Medicine[]>([
    { id: "m1", name: "Vitamin D", dosage: "1 tablet", time: "09:00", days: ["Mon", "Wed", "Fri"], taken: false },
    { id: "m2", name: "B-Complex", dosage: "1 tablet", time: "21:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], taken: false },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDosage, setEditDosage] = useState("");
  const [editTime, setEditTime] = useState("09:00");
  const [editDays, setEditDays] = useState<string[]>([]);

  const toggleDay = (day: string) => {
    setEditDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleSave = () => {
    if (!editName.trim()) {
      toast.error("Medicine name is required");
      return;
    }
    const newMed: Medicine = {
      id: `m${Date.now()}`,
      name: editName.trim(),
      dosage: editDosage.trim() || "1 tablet",
      time: editTime,
      days: editDays.length > 0 ? editDays : [...DAYS],
      taken: false,
    };
    setMedicines((prev) => [...prev, newMed]);
    toast.success(`${newMed.name} added`);
    setEditName("");
    setEditDosage("");
    setEditTime("09:00");
    setEditDays([]);
    setShowAdd(false);
  };

  const toggleTaken = (id: string) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m))
    );
  };

  const handleDelete = (id: string) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
    toast.success("Medicine removed");
  };

  const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const todayMeds = medicines.filter((m) => m.days.includes(today));
  const takenCount = todayMeds.filter((m) => m.taken).length;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-40">
      <ScreenHeader
        title="Medicine Reminder"
        subtitle={`${takenCount}/${todayMeds.length} taken today`}
        onBack={() => setScreen("settings")}
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAdd(true)}
            className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"
            aria-label="Add medicine"
          >
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>
        }
      />

      {/* Hero */}
      <div className="px-5 mt-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-foreground text-background p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-background/15 flex items-center justify-center shrink-0">
              <Pill size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Today</p>
              <h2 className="text-[24px] font-bold tracking-tight">
                {takenCount} / {todayMeds.length}
              </h2>
              <p className="text-[12px] opacity-80 mt-0.5">
                {takenCount === todayMeds.length && todayMeds.length > 0
                  ? "All medicines taken today!"
                  : `${todayMeds.length - takenCount} remaining`}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Today's medicines */}
      <div className="px-5 mt-6">
        <h2 className="text-[18px] font-bold tracking-tight mb-3">Today's Schedule</h2>
        {todayMeds.length === 0 ? (
          <EmptyState
            icon={<Pill size={20} className="text-muted-foreground" />}
            title="No medicines today"
            description="Add a medicine reminder to get started."
          />
        ) : (
          <div className="space-y-2">
            {todayMeds.map((m) => (
              <motion.div key={m.id} layout whileTap={{ scale: 0.99 }}>
                <Card className={m.taken ? "opacity-60" : ""}>
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => toggleTaken(m.id)}
                      className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        backgroundColor: m.taken ? "var(--foreground)" : "var(--muted)",
                        color: m.taken ? "var(--background)" : "var(--foreground)",
                      }}
                      aria-label="Toggle taken"
                    >
                      {m.taken ? <Check size={18} strokeWidth={3} /> : <Pill size={18} />}
                    </motion.button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-semibold ${m.taken ? "line-through" : ""}`}>{m.name}</p>
                      <p className="text-[12px] text-muted-foreground">{m.dosage}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-semibold tabular-nums flex items-center gap-1">
                        <Clock size={11} />
                        {m.time}
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleDelete(m.id)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* All medicines */}
      {medicines.length > 0 && (
        <div className="px-5 mt-6">
          <h2 className="text-[18px] font-bold tracking-tight mb-3">All Medicines</h2>
          <div className="space-y-2">
            {medicines.map((m) => (
              <Card key={m.id}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Pill size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate">{m.name}</p>
                    <p className="text-[12px] text-muted-foreground">{m.dosage} · {m.time}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
                    {m.days.map((d) => (
                      <span key={d} className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted">
                        {d.charAt(0)}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
              className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute bottom-0 left-0 right-0 z-50 rounded-t-[32px] bg-background pb-8 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-5 pt-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[20px] font-bold">Add Medicine</h2>
                  <button
                    onClick={() => setShowAdd(false)}
                    className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] text-muted-foreground font-medium">Medicine name</label>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Paracetamol"
                      className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] text-muted-foreground font-medium">Dosage</label>
                    <input
                      value={editDosage}
                      onChange={(e) => setEditDosage(e.target.value)}
                      placeholder="e.g. 1 tablet after food"
                      className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] text-muted-foreground font-medium">Time</label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] text-muted-foreground font-medium">Days</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {DAYS.map((d) => {
                        const active = editDays.includes(d);
                        return (
                          <button
                            key={d}
                            onClick={() => toggleDay(d)}
                            className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${
                              active
                                ? "bg-foreground text-background border-foreground"
                                : "border-border"
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {editDays.length === 0 ? "Defaults to every day" : `${editDays.length} day(s) selected`}
                    </p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    className="w-full h-[52px] mt-2 rounded-2xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Save Medicine
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
