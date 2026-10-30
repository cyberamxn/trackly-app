"use client";

import { motion } from "framer-motion";
import {
  LogIn, LogOut, Clock, Coffee, TrendingUp, Calendar as CalendarIcon,
} from "lucide-react";
import { ScreenHeader, Card, ProgressBar } from "../../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { useOfficeData } from "@/lib/trackly/officeData";
import { toast } from "sonner";

export function OfficeAttendance() {
  const { setScreen } = useTracklyStore();
  const office = useOfficeData();

  const todayAtt = office.todayAttendance();
  const isCheckedIn = !!todayAtt?.checkIn;
  const isCheckedOut = !!todayAtt?.checkOut;

  const handleCheckIn = () => {
    office.checkIn();
    toast.success(`Checked in at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`);
  };

  const handleCheckOut = () => {
    office.checkOut();
    toast.success(`Checked out at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`);
  };

  // Last 7 working days
  const recent = office.attendance.slice(0, 7);
  const totalHours = recent.reduce((s, a) => s + a.workHours, 0);
  const avgHours = recent.length > 0 ? totalHours / recent.length : 0;
  const totalOvertime = recent.reduce((s, a) => s + a.overtime, 0);
  const presentCount = recent.filter((a) => a.status === "present" || a.status === "late").length;
  const attendancePct = recent.length > 0 ? Math.round((presentCount / recent.length) * 100) : 0;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader title="Attendance" subtitle={`${attendancePct}% attendance this week`} onBack={() => setScreen("office-dashboard")} />

      {/* Check In / Out hero */}
      <div className="px-5 mt-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-foreground text-background p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Today</p>
              <p className="text-[20px] font-bold mt-0.5">
                {isCheckedIn ? `Started ${todayAtt?.checkIn}` : "Not checked in"}
              </p>
              {isCheckedOut && <p className="text-[13px] opacity-80 mt-0.5">Ended {todayAtt?.checkOut} · {todayAtt?.workHours.toFixed(1)}h</p>}
            </div>
            <div className="h-12 w-12 rounded-2xl bg-background/15 flex items-center justify-center">
              <Clock size={22} />
            </div>
          </div>
          <div className="flex gap-2">
            {!isCheckedOut ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                className="flex-1 h-12 rounded-xl bg-background text-foreground font-semibold text-[15px] flex items-center justify-center gap-2"
              >
                {isCheckedIn ? <><LogOut size={18} /> Check Out</> : <><LogIn size={18} /> Check In</>}
              </motion.button>
            ) : (
              <div className="flex-1 h-12 rounded-xl bg-background/15 flex items-center justify-center gap-2 text-[14px] font-semibold">
                <CalendarIcon size={16} /> Day completed
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="px-5 mt-3 grid grid-cols-3 gap-2">
        <Card className="text-center">
          <p className="text-[20px] font-bold text-display">{avgHours.toFixed(1)}h</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Avg / Day</p>
        </Card>
        <Card className="text-center">
          <p className="text-[20px] font-bold text-display">{totalOvertime.toFixed(1)}h</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Overtime</p>
        </Card>
        <Card className="text-center">
          <p className="text-[20px] font-bold text-display">{attendancePct}%</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Present</p>
        </Card>
      </div>

      {/* Recent records */}
      <div className="px-5 mt-5">
        <h2 className="text-[18px] font-bold tracking-tight mb-2">Recent Records</h2>
        <div className="space-y-2">
          {recent.map((a) => {
            const d = new Date(a.date);
            const isToday = a.date === new Date().toISOString().slice(0, 10);
            return (
              <Card key={a.id}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">{d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3)}</span>
                    <span className="text-[14px] font-bold leading-none">{d.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold">{a.checkIn || "--:--"} → {a.checkOut || "--:--"}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        a.status === "present" ? "bg-foreground text-background" :
                        a.status === "wfh" ? "bg-muted" :
                        a.status === "late" ? "border border-border" : "bg-muted/50"
                      }`}>
                        {a.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Clock size={10} /> {a.workHours.toFixed(1)}h</span>
                      {a.overtime > 0 && <span className="flex items-center gap-0.5"><TrendingUp size={10} /> +{a.overtime.toFixed(1)}h OT</span>}
                      <span className="flex items-center gap-0.5"><Coffee size={10} /> {a.breakTime}min break</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
