"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useTracklyStore, useHydrateStore } from "@/lib/trackly/store";
import { useAppData } from "@/lib/trackly/appData";
import { useSettings } from "@/lib/trackly/settings";
import { useSync } from "@/lib/trackly/sync";
import { Onboarding } from "./screens/Onboarding";
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
import { MedicineReminder } from "./screens/MedicineReminder";
import { HelpSupport } from "./screens/HelpSupport";
import { PrivacyPolicy } from "./screens/PrivacyPolicy";
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
import { AIChat } from "./AIChat";
import { OfficeDashboard } from "./screens/office/OfficeDashboard";
import { WorkTasks } from "./screens/office/WorkTasks";
import { OfficeAttendance } from "./screens/office/OfficeAttendance";
import { SalaryFinance } from "./screens/office/SalaryFinance";
import { OfficeCalendar } from "./screens/office/OfficeCalendar";
import { Productivity } from "./screens/office/Productivity";
import { OfficeAnalytics } from "./screens/office/OfficeAnalytics";
import { TabBar } from "./TabBar";
import { QuickAddFab } from "./QuickAddFab";
import { QuickAdd } from "./QuickAdd";

import {
  DEMO_CONFIG, DEMO_NOTIFICATIONS, DEMO_CONTENT, DEMO_CATEGORIES,
  DEMO_REFERRAL_LINK, DEMO_PLANS, DEMO_COUPONS, DEMO_FEATURE_FLAGS,
  DEMO_SETTINGS,
} from "@/lib/demo/mockData";
import {
  todayExpenses, weekExpenses, incomes as sampleIncomes,
  shoppingItems as sampleShopping, borrowLendItems as sampleBorrowLend,
  habits as sampleHabits, notes as sampleNotes, calendarEvents as sampleCalendar,
} from "@/lib/trackly/data";

export function DemoAppShell() {
  useHydrateStore();

  const setDemoData = useSync((s) => s.setDemoData);
  const demoMode = useSync((s) => s.demoMode);
  useEffect(() => {
    if (demoMode) return;
    setDemoData({
      config: DEMO_CONFIG,
      notifications: DEMO_NOTIFICATIONS,
      content: DEMO_CONTENT,
      categories: DEMO_CATEGORIES,
      referralLink: DEMO_REFERRAL_LINK,
      plans: DEMO_PLANS,
      coupons: DEMO_COUPONS,
      featureFlags: DEMO_FEATURE_FLAGS,
      settings: DEMO_SETTINGS,
    });
    // Load SAMPLE data into appData so demo looks like a real working app
    const today = new Date().toISOString().slice(0, 10);
    useAppData.setState({
      expenses: [...todayExpenses.map(e => ({ ...e, date: today })), ...weekExpenses],
      incomes: sampleIncomes,
      shopping: sampleShopping,
      borrowLend: sampleBorrowLend,
      habits: sampleHabits,
      notes: sampleNotes,
      calendarEvents: sampleCalendar,
    });
    // Set demo user profile
    useSettings.setState({
      userName: "Aman",
      userEmail: "demo@trackly.app",
      userAvatar: "A",
      studentMode: false,
      officeMode: false,
      tripMode: "none",
    });
    // Set demo budget
    if (typeof window !== "undefined") {
      localStorage.setItem("trackly-demo-monthly-budget", "30000");
    }
  }, [demoMode, setDemoData]);

  // Cleanup: when DemoAppShell unmounts, clear sample data so it doesn't leak into main app
  useEffect(() => {
    return () => {
      useAppData.setState({
        expenses: [],
        incomes: [],
        shopping: [],
        borrowLend: [],
        habits: [],
        notes: [],
        calendarEvents: [],
      });
    };
  }, []);

  const { screen, normalViewOverride, aiChatMode, closeAIChat, setAIChatMode } = useTracklyStore();
  const studentMode = useSettings((s) => s.studentMode);
  const studentPaused = useSettings((s) => s.studentPaused);
  const officeMode = useSettings((s) => s.officeMode);
  const officePaused = useSettings((s) => s.officePaused);
  const returnToMode = useAppData((s) => s.returnToMode);
  const prevOverrideRef = useRef(false);

  useEffect(() => {
    if (prevOverrideRef.current && !normalViewOverride) {
      returnToMode();
    }
    prevOverrideRef.current = normalViewOverride;
  }, [normalViewOverride, returnToMode]);

  const showStudentDashboard = studentMode && !studentPaused;
  const showOfficeDashboard = officeMode && !officePaused;

  // Onboarding handled by page.tsx — DemoAppShell always shows app content

  const hideTabBar = screen === "search" || screen === "notifications" || screen === "help" || screen === "privacy" || (screen.startsWith("office-") && screen !== "office-dashboard");
  const hideFab = screen === "search" || screen === "notifications" || screen === "settings" || screen === "help" || screen === "privacy" || (screen.startsWith("office-") && screen !== "office-dashboard");

  return (
    <>



      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {renderDemoScreen(screen, showStudentDashboard, showOfficeDashboard, normalViewOverride)}
        </motion.div>
      </AnimatePresence>

      {!hideTabBar && <TabBar />}
      {!hideFab && <QuickAddFab />}
      <QuickAdd />

      {/* ===== AI Chat overlay — real AI for signed-in users demoing the
          app; anonymous demo visitors get an honest "Not authenticated"
          notice on send (offline student assistant button unauth pe
          canned screen pe hi fallback karta hai). ===== */}
      {aiChatMode && (
        <AIChat mode={aiChatMode} onClose={closeAIChat} onModeChange={setAIChatMode} />
      )}

    </>
  );
}

function renderDemoScreen(screen: string, studentMode: boolean, officeMode: boolean, normalViewOverride: boolean) {
  if (studentMode && !normalViewOverride && screen === "dashboard") return <StudentDashboard />;
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
    case "medicine": return <MedicineReminder />;
    case "help": return <HelpSupport />;
    case "privacy": return <PrivacyPolicy />;
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
    case "office-dashboard": return <OfficeDashboard />;
    case "office-tasks": return <WorkTasks />;
    case "office-attendance": return <OfficeAttendance />;
    case "office-salary": return <SalaryFinance />;
    case "office-calendar": return <OfficeCalendar />;
    case "office-productivity": return <Productivity />;
    case "office-analytics": return <OfficeAnalytics />;
    default: return studentMode ? <StudentDashboard /> : officeMode ? <OfficeDashboard /> : <Dashboard />;
  }
}
