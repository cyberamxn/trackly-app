"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTracklyStore, useHydrateStore } from "@/lib/trackly/store";
import { useAppData } from "@/lib/trackly/appData";
import { useSettings } from "@/lib/trackly/settings";
import { useSync } from "@/lib/trackly/sync";
import { useAdminSync } from "@/lib/trackly/useAdminSync";
import { Dashboard } from "./screens/Dashboard";
import { Expenses } from "./screens/Expenses";
import { Habits } from "./screens/Habits";
import { Notes } from "./screens/Notes";
import { SearchScreen } from "./screens/Search";
import { Shopping } from "./screens/Shopping";
import { BorrowLend } from "./screens/BorrowLend";
import { Routine } from "./screens/Routine";
import { CalendarScreen } from "./screens/Calendar";
import { Reports } from "./screens/Reports";
import { Notifications } from "./screens/Notifications";
import { Settings } from "./screens/Settings";
import { Widgets } from "./screens/Widgets";
import { HelpSupport } from "./screens/HelpSupport";
import { PrivacyPolicy } from "./screens/PrivacyPolicy";
import { InviteScreen } from "./screens/Invite";
import { MedicineReminder } from "./screens/MedicineReminder";
import { ArchiveScreen } from "./screens/Archive";
import { TrashScreen } from "./screens/Trash";
import { StudentDashboard } from "./screens/student/StudentDashboard";
import { MessPlanner } from "./screens/student/MessPlanner";
import { HostelRent } from "./screens/student/HostelRent";
import { StudyPlanner } from "./screens/student/StudyPlanner";
import { Assignments } from "./screens/student/Assignments";
import { Attendance } from "./screens/student/Attendance";
import { Exams } from "./screens/student/Exams";
import { Books } from "./screens/student/Books";
import { Budget } from "./screens/student/Budget";
import { Routine as StudentRoutine } from "./screens/student/Routine";
import { AIAssistant } from "./screens/student/AIAssistant";
import { OfficeDashboard } from "./screens/office/OfficeDashboard";
import { WorkTasks } from "./screens/office/WorkTasks";
import { OfficeAttendance } from "./screens/office/OfficeAttendance";
import { SalaryFinance } from "./screens/office/SalaryFinance";
import { OfficeCalendar } from "./screens/office/OfficeCalendar";
import { Productivity } from "./screens/office/Productivity";
import { OfficeAnalytics } from "./screens/office/OfficeAnalytics";
import { GroupsHub } from "./screens/groups/GroupsHub";
import { GroupDashboard } from "./screens/groups/GroupDashboard";
import { TabBar } from "./TabBar";
import { QuickAddFab } from "./QuickAddFab";
import { QuickAdd } from "./QuickAdd";
import { NotificationBanner } from "./NotificationBanner";
import { GroupInviteWatcher } from "./GroupInviteWatcher";
import { AIChat } from "./AIChat";


export function AppShell() {
  useHydrateStore();
  useAdminSync(); // Auto-sync admin data every 30s
  const { screen, normalViewOverride, aiChatMode, closeAIChat, setAIChatMode } = useTracklyStore();
  const studentMode = useSettings((s) => s.studentMode);
  const studentPaused = useSettings((s) => s.studentPaused);
  const officeMode = useSettings((s) => s.officeMode);
  const officePaused = useSettings((s) => s.officePaused);
  const returnToMode = useAppData((s) => s.returnToMode);
  const prevOverrideRef = useRef(false);

  // Admin-controlled: maintenance mode, announcement banner
  const maintenanceMode = useSync((s) => Boolean(s.config.maintenance_mode));
  const announcementText = useSync((s) => s.config.announcement_banner?.text ?? "");
  const announcementActive = useSync((s) => s.config.announcement_banner?.active ?? false);
  // User-dismissed announcement — session bhar me band rahe
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const prevAnnouncementText = useRef<string>("");
  // Naya announcement text aaye to dismiss state reset ho jaye
  if (announcementText !== prevAnnouncementText.current) {
    prevAnnouncementText.current = announcementText;
    if (announcementDismissed) setAnnouncementDismissed(false);
  }

  // When normalViewOverride transitions from true → false, restore trip/student data
  useEffect(() => {
    if (prevOverrideRef.current && !normalViewOverride) {
      returnToMode();
    }
    prevOverrideRef.current = normalViewOverride;
  }, [normalViewOverride, returnToMode]);

  // Student mode is "active for rendering" only when enabled AND not paused
  const showStudentDashboard = studentMode && !studentPaused;
  // Office mode is "active for rendering" only when enabled AND not paused
  const showOfficeDashboard = officeMode && !officePaused;

  // Onboarding is handled in page.tsx — AppShell always shows app content

  // ===== Maintenance Mode (controlled from Admin Panel) =====
  if (maintenanceMode) {
    return (
      <>



        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background px-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-16 w-16 rounded-2xl overflow-hidden mb-6"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/trackly-logo-192.png" alt="Trackly logo" width={64} height={64} className="h-16 w-16 object-cover" />
          </motion.div>
          <h1 className="text-[24px] font-bold tracking-tight">Under Maintenance</h1>
          <p className="text-[14px] text-muted-foreground mt-2 max-w-xs">
            Trackly is temporarily unavailable. We'll be back soon!
          </p>
          <p className="text-[12px] text-muted-foreground mt-6">
            This message is controlled by the Admin Panel.
          </p>
        </div>
      </>
    );
  }

  // The TabBar is hidden on search/notifications (full-screen experiences),
  // but visible everywhere else including settings (Profile tab lives there).
  const hideTabBar = screen === "search" || screen === "notifications" || screen === "help" || screen === "privacy" || screen === "invite" || screen === "groups" || screen === "group" || (screen.startsWith("office-") && screen !== "office-dashboard");
  const hideFab = screen === "search" || screen === "notifications" || screen === "settings" || screen === "help" || screen === "privacy" || screen === "invite" || screen === "groups" || screen === "group" || (screen.startsWith("office-") && screen !== "office-dashboard");

  return (
    <>

      {/* ===== Admin Notification Popup (live from Supabase) ===== */}
      <NotificationBanner />

      {/* ===== Group Invitation Popup (live invite alerts) ===== */}
      <GroupInviteWatcher />

      {/* ===== Announcement Banner (controlled from Admin Panel) ===== */}
      {announcementActive && announcementText && !announcementDismissed && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-12 left-0 right-0 z-25 bg-foreground text-background px-4 py-2 flex items-center justify-center gap-2"
        >
          <p className="text-[12px] font-medium flex-1 text-center truncate">{announcementText}</p>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => setAnnouncementDismissed(true)}
            className="shrink-0 p-1 -mr-1 rounded-full hover:bg-background/15 active:bg-background/25 transition-colors"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {renderScreen(screen, showStudentDashboard, showOfficeDashboard, normalViewOverride)}
        </motion.div>
      </AnimatePresence>

      {!hideTabBar && <TabBar />}
      {!hideFab && <QuickAddFab />}
      <QuickAdd />

      {/* ===== AI Chat (mode-based, opened from Profile) ===== */}
      {/* No AnimatePresence — AIChat mounts/unmounts instantly to prevent
          ghost overlay intercepting touches during exit animation. */}
      {aiChatMode && (
        <AIChat mode={aiChatMode} onClose={closeAIChat} onModeChange={setAIChatMode} />
      )}

    </>
  );
}

function renderScreen(screen: string, studentMode: boolean, officeMode: boolean, normalViewOverride: boolean) {
  // When student mode is on AND no override, the home dashboard becomes the StudentDashboard.
  if (studentMode && !normalViewOverride && screen === "dashboard") return <StudentDashboard />;
  // When office mode is on AND no override, the home dashboard becomes the OfficeDashboard.
  if (officeMode && !normalViewOverride && screen === "dashboard") return <OfficeDashboard />;

  switch (screen) {
    case "dashboard": return <Dashboard />;
    case "expenses": return <Expenses />;
    case "habits": return <Habits />;
    case "notes": return <Notes />;
    case "search": return <SearchScreen />;
    case "shopping": return <Shopping />;
    case "borrow": return <BorrowLend />;
    case "routine": return <Routine />;
    case "calendar": return <CalendarScreen />;
    case "reports": return <Reports />;
    case "notifications": return <Notifications />;
    case "settings": return <Settings />;
    case "widgets": return <Widgets />;
    case "help": return <HelpSupport />;
    case "privacy": return <PrivacyPolicy />;
    case "invite": return <InviteScreen />;
    case "medicine": return <MedicineReminder />;
    case "archive": return <ArchiveScreen />;
    case "trash": return <TrashScreen />;
    // Student Mode screens
    case "student-dashboard": return <StudentDashboard />;
    case "student-mess": return <MessPlanner />;
    case "student-hostel": return <HostelRent />;
    case "student-study": return <StudyPlanner />;
    case "student-assignments": return <Assignments />;
    case "student-attendance": return <Attendance />;
    case "student-exams": return <Exams />;
    case "student-books": return <Books />;
    case "student-budget": return <Budget />;
    case "student-routine": return <StudentRoutine />;
    case "student-ai": return <AIAssistant />;
    // Office Mode screens
    case "office-dashboard": return <OfficeDashboard />;
    case "office-tasks": return <WorkTasks />;
    case "office-attendance": return <OfficeAttendance />;
    case "office-salary": return <SalaryFinance />;
    case "office-calendar": return <OfficeCalendar />;
    case "office-productivity": return <Productivity />;
    case "office-analytics": return <OfficeAnalytics />;
    // Group Expenses screens
    case "groups": return <GroupsHub />;
    case "group": return <GroupDashboard />;
    default: return studentMode ? <StudentDashboard /> : officeMode ? <OfficeDashboard /> : <Dashboard />;
  }
}
