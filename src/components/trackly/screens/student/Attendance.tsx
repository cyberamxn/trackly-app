"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, AlertTriangle, AlertCircle, TrendingUp, BookOpen,
} from "lucide-react";
import { useTracklyStore } from "@/lib/trackly/store";
import { useStudentData } from "@/lib/trackly/studentData";
import {
  ScreenHeader, ScreenWrapper, Card, EmptyState, RingProgress, ProgressBar,
} from "../../ui";

const REQUIRED_PCT = 75;

function computeNeeds(attended: number, total: number) {
  if (total === 0) return { needToAttend: 0, canSkip: 0 };
  const pct = (attended / total) * 100;
  if (pct >= REQUIRED_PCT) {
    const canSkip = Math.floor((4 * attended) / 3 - total);
    return { needToAttend: 0, canSkip: Math.max(0, canSkip) };
  }
  const needToAttend = Math.ceil(3 * total - 4 * attended);
  return { needToAttend: Math.max(1, needToAttend), canSkip: 0 };
}

function statusFor(pct: number): { label: string; tone: "good" | "low" | "critical"; icon: typeof CheckCircle2 } {
  if (pct >= 80) return { label: "Good", tone: "good", icon: CheckCircle2 };
  if (pct >= REQUIRED_PCT) return { label: "Okay", tone: "good", icon: CheckCircle2 };
  if (pct >= 60) return { label: "Low", tone: "low", icon: AlertTriangle };
  return { label: "Critical", tone: "critical", icon: AlertCircle };
}

export function Attendance() {
  const { setScreen } = useTracklyStore();
  const student = useStudentData();

  const totalAttended = student.subjects.reduce((s, sub) => s + sub.attendanceAttended, 0);
  const totalClasses = student.subjects.reduce((s, sub) => s + sub.attendanceTotal, 0);
  const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  const overall = computeNeeds(totalAttended, totalClasses);

  const subjectsWithStatus = useMemo(
    () => student.subjects.map((sub) => {
      const pct = sub.attendanceTotal > 0 ? Math.round((sub.attendanceAttended / sub.attendanceTotal) * 100) : 0;
      const status = statusFor(pct);
      const needs = computeNeeds(sub.attendanceAttended, sub.attendanceTotal);
      return { ...sub, pct, status, needs };
    }),
    [student.subjects]
  );

  const criticalCount = subjectsWithStatus.filter((s) => s.status.tone === "critical").length;
  const lowCount = subjectsWithStatus.filter((s) => s.status.tone === "low").length;

  return (
    <ScreenWrapper>
      <ScreenHeader
        title="Attendance"
        subtitle="Maintain 75% to stay eligible"
        onBack={() => setScreen("student-dashboard")}
      />

      {/* Overall ring */}
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="bg-foreground text-background">
            <div className="flex items-center gap-5">
              <RingProgress value={overallPct} size={108} stroke={8}>
                <div className="text-center">
                  <div className="text-[28px] font-bold leading-none">{overallPct}%</div>
                  <div className="text-[9px] opacity-70 mt-1 uppercase tracking-wider">Overall</div>
                </div>
              </RingProgress>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">This Semester</p>
                <p className="text-[20px] font-bold mt-0.5">{totalAttended}/{totalClasses} classes</p>
                <div className="h-px bg-background/20 my-3" />
                {overallPct >= REQUIRED_PCT ? (
                  <p className="text-[13px] opacity-90 leading-relaxed">
                    You can skip <span className="font-bold">{overall.canSkip}</span> more class{overall.canSkip !== 1 ? "es" : ""} and stay above 75%.
                  </p>
                ) : (
                  <p className="text-[13px] opacity-90 leading-relaxed">
                    Attend <span className="font-bold">{overall.needToAttend}</span> more class{overall.needToAttend !== 1 ? "es" : ""} to reach 75%.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Quick stats */}
      <div className="px-5 mt-3 grid grid-cols-3 gap-2.5">
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Required</p>
          <p className="text-[20px] font-bold mt-1 text-display">{REQUIRED_PCT}%</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Critical</p>
          <p className="text-[20px] font-bold mt-1 text-display">{criticalCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Low</p>
          <p className="text-[20px] font-bold mt-1 text-display">{lowCount}</p>
        </Card>
      </div>

      {/* Per-subject */}
      <div className="px-5 mt-5 pb-32">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[18px] font-bold tracking-tight">By Subject</h2>
          <button
            onClick={() => setScreen("student-study")}
            className="text-[13px] text-muted-foreground font-medium"
          >
            Manage
          </button>
        </div>

        {student.subjects.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BookOpen size={20} className="text-muted-foreground" />}
              title="No subjects"
              description="Add subjects in the Study Planner to track attendance."
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {subjectsWithStatus.map((s) => {
              const StatusIcon = s.status.icon;
              const deficit = REQUIRED_PCT - s.pct;
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <RingProgress value={s.pct} size={56} stroke={5}>
                          <div className="text-center">
                            <div className="text-[13px] font-bold leading-none">{s.pct}%</div>
                          </div>
                        </RingProgress>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold truncate">{s.name}</p>
                        <p className="text-[12px] text-muted-foreground tabular-nums">
                          {s.attendanceAttended}/{s.attendanceTotal} classes
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <StatusIcon
                            size={12}
                            className={
                              s.status.tone === "critical" ? "text-foreground" :
                              s.status.tone === "low" ? "text-foreground" :
                              "text-muted-foreground"
                            }
                          />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {s.status.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {s.pct >= REQUIRED_PCT ? (
                          <>
                            <p className="text-[11px] text-muted-foreground">Can skip</p>
                            <p className="text-[18px] font-bold tabular-nums text-display">{s.needs.canSkip}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-[11px] text-muted-foreground">Attend</p>
                            <p className="text-[18px] font-bold tabular-nums text-display">{s.needs.needToAttend}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {s.status.tone !== "good" && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[11px] text-muted-foreground font-medium">
                            {deficit > 0 ? `${deficit}% below required` : "Above required"}
                          </p>
                          <p className="text-[11px] font-semibold tabular-nums">Target {REQUIRED_PCT}%</p>
                        </div>
                        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-muted-foreground/40"
                            style={{ width: `${REQUIRED_PCT}%` }}
                          />
                          <ProgressBar value={s.pct} className="h-2 relative" />
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly report placeholder */}
      <div className="px-5 mt-6 pb-32">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[18px] font-bold tracking-tight">Weekly Report</h2>
          <TrendingUp size={16} className="text-muted-foreground" />
        </div>
        <Card className="border-dashed">
          <div className="flex flex-col items-center text-center py-3">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-2">
              <TrendingUp size={20} className="text-muted-foreground" />
            </div>
            <p className="text-[14px] font-semibold">Detailed analytics coming soon</p>
            <p className="text-[12px] text-muted-foreground mt-0.5 max-w-xs">
              Weekly attendance trends, comparison with peers, and smart alerts will appear here.
            </p>
          </div>
        </Card>
      </div>
    </ScreenWrapper>
  );
}
