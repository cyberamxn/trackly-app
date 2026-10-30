"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Utensils, Plus, Sun, Coffee, Moon, Trash2, Pencil, Sunrise,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useStudentData, type MessMeal } from "@/lib/trackly/studentData";
import {
  ScreenHeader, ScreenWrapper, Card, SheetModal, EmptyState, Chip,
} from "../../ui";

const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

const MEAL_TYPES: MessMeal["meal"][] = ["breakfast", "lunch", "snacks", "dinner"];

const MEAL_META: Record<MessMeal["meal"], { icon: typeof Coffee; label: string }> = {
  breakfast: { icon: Sunrise, label: "Breakfast" },
  lunch: { icon: Sun, label: "Lunch" },
  snacks: { icon: Coffee, label: "Snacks" },
  dinner: { icon: Moon, label: "Dinner" },
};

export function MessPlanner() {
  const { setScreen } = useTracklyStore();
  const student = useStudentData();
  const todayDow = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState<number>(todayDow);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MessMeal | null>(null);

  const todayMeals = useMemo(
    () => student.messMeals.filter((m) => m.day === todayDow)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [student.messMeals, todayDow]
  );

  const selectedDayMeals = useMemo(
    () => student.messMeals.filter((m) => m.day === selectedDay)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [student.messMeals, selectedDay]
  );

  const isToday = selectedDay === todayDow;
  const selectedDayLabel = DAYS.find((d) => d.value === selectedDay)?.label ?? "Today";

  const handleSave = (data: Omit<MessMeal, "id">) => {
    if (editingMeal) {
      student.updateMessMeal(editingMeal.id, data);
      toast.success("Meal updated");
    } else {
      student.addMessMeal(data);
      toast.success("Meal added to schedule");
    }
    setShowAdd(false);
    setEditingMeal(null);
  };

  const handleDelete = (id: string) => {
    student.deleteMessMeal(id);
    toast.success("Meal removed");
    setShowAdd(false);
    setEditingMeal(null);
  };

  return (
    <ScreenWrapper>
      <ScreenHeader
        title="Mess Schedule"
        subtitle="Your weekly meal plan"
        onBack={() => setScreen("student-dashboard")}
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setEditingMeal(null); setShowAdd(true); }}
            className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"
            aria-label="Add meal"
          >
            <Plus size={18} />
          </motion.button>
        }
      />

      {/* Today's meals highlighted */}
      <div className="px-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Card className="bg-foreground text-background">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Utensils size={16} className="opacity-80" />
                <p className="text-[12px] uppercase tracking-wider opacity-70 font-semibold">Today</p>
              </div>
              <p className="text-[11px] opacity-70 font-medium">
                {new Date().toLocaleDateString("en-US", { weekday: "long" })}
              </p>
            </div>
            {todayMeals.length === 0 ? (
              <p className="text-[14px] opacity-70 py-2">No meals scheduled for today.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {todayMeals.map((m) => {
                  const Meta = MEAL_META[m.meal];
                  return (
                    <div key={m.id} className="bg-background/10 rounded-2xl p-3">
                      <div className="flex items-center justify-between">
                        <Meta.icon size={14} className="opacity-80" />
                        <span className="text-[10px] opacity-70 tabular-nums">{m.time}</span>
                      </div>
                      <p className="text-[13px] font-semibold mt-1.5 capitalize">{m.meal}</p>
                      <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{m.menu}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Day selector */}
      <div className="px-5 mt-5">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {DAYS.map((d) => {
            const active = d.value === selectedDay;
            const isTodayChip = d.value === todayDow;
            return (
              <motion.button
                key={d.value}
                whileTap={{ scale: 0.94 }}
                onClick={() => setSelectedDay(d.value)}
                className={`relative shrink-0 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                  active ? "bg-foreground text-background" : "bg-muted text-foreground"
                }`}
              >
                {d.label}
                {isTodayChip && (
                  <span className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${active ? "bg-background" : "bg-foreground"}`} />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Day schedule */}
      <div className="px-5 mt-4 pb-32">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[20px] font-bold tracking-tight">
            {isToday ? "Today's Menu" : `${selectedDayLabel}'s Menu`}
          </h2>
          <span className="text-[12px] text-muted-foreground tabular-nums">
            {selectedDayMeals.length}/4 meals
          </span>
        </div>

        {selectedDayMeals.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Utensils size={20} className="text-muted-foreground" />}
              title="No meals planned"
              description={`Add meals for ${selectedDayLabel} to keep track of your mess schedule.`}
              action={
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setEditingMeal(null); setShowAdd(true); }}
                  className="px-4 py-2 rounded-full bg-foreground text-background text-[13px] font-semibold flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add meal
                </motion.button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {MEAL_TYPES.map((mt) => {
              const meal = selectedDayMeals.find((m) => m.meal === mt);
              const Meta = MEAL_META[mt];
              if (!meal) {
                return (
                  <div
                    key={mt}
                    className="rounded-2xl border border-dashed border-border p-4 flex items-center gap-3 opacity-60"
                  >
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                      <Meta.icon size={18} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-medium">{Meta.label}</p>
                      <p className="text-[12px] text-muted-foreground">Not scheduled</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setEditingMeal(null);
                        setShowAdd(true);
                      }}
                      className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                      aria-label={`Add ${Meta.label}`}
                    >
                      <Plus size={14} />
                    </motion.button>
                  </div>
                );
              }
              return (
                <motion.div
                  key={meal.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => { setEditingMeal(meal); setShowAdd(true); }}
                  className="cursor-pointer"
                >
                  <Card>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-foreground text-background flex items-center justify-center">
                        <Meta.icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[16px] font-semibold capitalize">{meal.meal}</p>
                          <span className="text-[11px] text-muted-foreground tabular-nums">{meal.time}</span>
                        </div>
                        <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{meal.menu}</p>
                      </div>
                      <Pencil size={14} className="text-muted-foreground" />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit sheet */}
      <AnimatePresence>
        {showAdd && (
          <MealFormSheet
            meal={editingMeal}
            defaultDay={selectedDay}
            onClose={() => { setShowAdd(false); setEditingMeal(null); }}
            onSave={handleSave}
            onDelete={editingMeal ? () => handleDelete(editingMeal.id) : undefined}
          />
        )}
      </AnimatePresence>
    </ScreenWrapper>
  );
}

function MealFormSheet({
  meal,
  defaultDay,
  onClose,
  onSave,
  onDelete,
}: {
  meal: MessMeal | null;
  defaultDay: number;
  onClose: () => void;
  onSave: (data: Omit<MessMeal, "id">) => void;
  onDelete?: () => void;
}) {
  const [day, setDay] = useState<number>(meal?.day ?? defaultDay);
  const [mealType, setMealType] = useState<MessMeal["meal"]>(meal?.meal ?? "breakfast");
  const [menu, setMenu] = useState<string>(meal?.menu ?? "");
  const [time, setTime] = useState<string>(meal?.time ?? "08:00");

  const valid = menu.trim().length > 0 && time.trim().length > 0;

  const submit = () => {
    if (!valid) {
      toast.error("Please enter a menu and time");
      return;
    }
    onSave({ day, meal: mealType, menu: menu.trim(), time: time.trim() });
  };

  return (
    <SheetModal open onClose={onClose} title={meal ? "Edit Meal" : "Add Meal"}>
      <div className="space-y-4">
        <Field label="Day">
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                active={day === d.value}
                onClick={() => setDay(d.value)}
              />
            ))}
          </div>
        </Field>

        <Field label="Meal type">
          <div className="flex gap-1.5 flex-wrap">
            {MEAL_TYPES.map((mt) => (
              <Chip
                key={mt}
                label={MEAL_META[mt].label}
                active={mealType === mt}
                onClick={() => setMealType(mt)}
              />
            ))}
          </div>
        </Field>

        <Field label="Menu">
          <input
            value={menu}
            onChange={(e) => setMenu(e.target.value)}
            placeholder="e.g. Rice, Dal & Chicken Curry"
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
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
            {meal ? "Save changes" : "Add meal"}
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
