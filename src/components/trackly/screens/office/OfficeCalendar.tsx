"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon, Clock, MapPin, Users, PartyPopper, Plane,
  Plus, Trash2, X, Check,
} from "lucide-react";
import { ScreenHeader, Card, EmptyState, SegmentedControl } from "../../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { useOfficeData } from "@/lib/trackly/officeData";
import { toast } from "sonner";

export function OfficeCalendar() {
  const { setScreen } = useTracklyStore();
  const office = useOfficeData();
  const [filter, setFilter] = useState<"all" | "meeting" | "event" | "holiday">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addType, setAddType] = useState<"meeting" | "event" | "holiday" | "leave">("meeting");
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
  const [addTime, setAddTime] = useState("10:00");
  const [addDuration, setAddDuration] = useState("30");
  const [addLocation, setAddLocation] = useState("");
  const [addAttendees, setAddAttendees] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const filtered = filter === "all" ? office.meetings : office.meetings.filter((m) => m.type === filter);
  const todayItems = filtered.filter((m) => m.date === today);
  const upcomingItems = filtered.filter((m) => m.date > today).sort((a, b) => a.date.localeCompare(b.date));
  const pastItems = filtered.filter((m) => m.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const handleAdd = () => {
    if (!addTitle.trim()) { toast.error("Title is required"); return; }
    office.addMeeting({
      title: addTitle.trim(),
      type: addType,
      date: addDate,
      time: addType === "holiday" ? "" : addTime,
      duration: addType === "holiday" ? 0 : parseInt(addDuration) || 30,
      location: addLocation.trim(),
      attendees: addAttendees.split(",").map((a) => a.trim()).filter(Boolean),
    });
    toast.success("Event added");
    setAddTitle(""); setAddLocation(""); setAddAttendees(""); setShowAdd(false);
  };

  const renderMeeting = (m: typeof office.meetings[0]) => {
    const isToday = m.date === today;
    const isPast = m.date < today;
    const typeIcon = m.type === "holiday" ? <Plane size={14} /> : m.type === "event" ? <PartyPopper size={14} /> : <CalendarIcon size={14} />;
    const typeLabel = m.type === "holiday" ? "Holiday" : m.type === "event" ? "Event" : m.type === "leave" ? "Leave" : "Meeting";
    return (
      <motion.div key={m.id} layout whileTap={{ scale: 0.99 }}>
        <Card className={isPast ? "opacity-60" : ""}>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">{typeIcon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-semibold truncate">{m.title}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium uppercase tracking-wider shrink-0">{typeLabel}</span>
              </div>
              {m.time && <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1"><Clock size={11} /> {m.time} · {m.duration}min</p>}
              {m.location && <p className="text-[12px] text-muted-foreground flex items-center gap-1"><MapPin size={11} /> {m.location}</p>}
              {m.attendees.length > 0 && <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><Users size={11} /> {m.attendees.join(", ")}</p>}
              <p className={`text-[11px] mt-1 font-medium ${isToday ? "text-foreground" : "text-muted-foreground"}`}>{isToday ? "Today" : new Date(m.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
            </div>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => { office.deleteMeeting(m.id); toast.success("Deleted"); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0"><Trash2 size={13} /></motion.button>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader title="Calendar" subtitle="Meetings, events & holidays" onBack={() => setScreen("office-dashboard")}
        right={<motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(true)} className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"><Plus size={18} strokeWidth={2.5} /></motion.button>}
      />
      <div className="px-5 mt-2">
        <SegmentedControl value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "meeting", label: "Meetings" }, { value: "event", label: "Events" }, { value: "holiday", label: "Holidays" }]} />
      </div>
      {todayItems.length > 0 && (<div className="px-5 mt-4"><h2 className="text-[16px] font-bold tracking-tight mb-2">Today</h2><div className="space-y-2">{todayItems.map(renderMeeting)}</div></div>)}
      {upcomingItems.length > 0 && (<div className="px-5 mt-4"><h2 className="text-[16px] font-bold tracking-tight mb-2">Upcoming</h2><div className="space-y-2">{upcomingItems.map(renderMeeting)}</div></div>)}
      {pastItems.length > 0 && (<div className="px-5 mt-4"><h2 className="text-[16px] font-bold tracking-tight mb-2">Past</h2><div className="space-y-2">{pastItems.slice(0, 5).map(renderMeeting)}</div></div>)}
      {filtered.length === 0 && (<div className="px-5 mt-8"><EmptyState icon={<CalendarIcon size={20} className="text-muted-foreground" />} title="No items" description="Nothing scheduled here." /></div>)}

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} className="fixed sheet-bottom left-0 right-0 z-50 rounded-t-[32px] bg-background sheet-safe-pb max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
              <div className="px-5 pt-2">
                <div className="flex items-center justify-between mb-4"><h2 className="text-[20px] font-bold">Add Event</h2><button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><X size={16} /></button></div>
                <div className="space-y-3">
                  <div><label className="text-[12px] text-muted-foreground font-medium">Title</label><input autoFocus value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="e.g. Team Meeting" className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground" /></div>
                  <div><label className="text-[12px] text-muted-foreground font-medium">Type</label><div className="flex flex-wrap gap-2 mt-1">{(["meeting", "event", "holiday", "leave"] as const).map((t) => (<button key={t} onClick={() => setAddType(t)} className={`px-3 py-1.5 rounded-full border text-[12px] font-medium capitalize ${addType === t ? "bg-foreground text-background border-foreground" : "border-border"}`}>{t}</button>))}</div></div>
                  <div><label className="text-[12px] text-muted-foreground font-medium">Date</label><input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none" /></div>
                  {addType !== "holiday" && (<><div className="grid grid-cols-2 gap-3"><div><label className="text-[12px] text-muted-foreground font-medium">Time</label><input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none" /></div><div><label className="text-[12px] text-muted-foreground font-medium">Duration (min)</label><input type="text" inputMode="numeric" value={addDuration} onChange={(e) => setAddDuration(e.target.value.replace(/[^\d]/g, ""))} className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none" /></div></div><div><label className="text-[12px] text-muted-foreground font-medium">Location</label><input value={addLocation} onChange={(e) => setAddLocation(e.target.value)} placeholder="e.g. Conf Room A" className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground" /></div><div><label className="text-[12px] text-muted-foreground font-medium">Attendees (comma separated)</label><input value={addAttendees} onChange={(e) => setAddAttendees(e.target.value)} placeholder="e.g. Rahul, Priya, Team" className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground" /></div></>)}
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd} className="w-full h-[52px] mt-2 rounded-2xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2"><Check size={18} /> Add Event</motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
