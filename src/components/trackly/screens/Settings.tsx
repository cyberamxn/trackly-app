"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight, Moon, Sun, ScanFace, Cloud, Bell, CreditCard, Vibrate,
  Globe, Shield, Download, HelpCircle, LogOut, Zap, LayoutGrid, Mic, Sparkles,
  Plane, MapPin, Wallet, Search, Check, AlertCircle, Trash2, GraduationCap, ExternalLink, Share2, Copy, Users, AtSign, Pill, Briefcase, RefreshCw, Brain, Archive, Gift,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../ThemeProvider";
import { Card, ScreenHeader, ListRow, Toggle, SheetModal } from "../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData } from "@/lib/trackly/appData";
import { useStudentData } from "@/lib/trackly/studentData";
import { useSync } from "@/lib/trackly/sync";
import { useTrashStore } from "@/lib/trackly/trash";
import {
  useSettings,
  CURRENCIES,
  COUNTRIES,
  LANGUAGES,
  getCountryByCode,
  getCurrencyByCode,
  type TripMode,
  type TripHistoryEntry,
  type StudentHistoryEntry,
} from "@/lib/trackly/settings";

export function Settings() {
  const { theme, toggle } = useTheme();
  const { resetOnboarding, setScreen, setNormalViewOverride, openAIChat } = useTracklyStore();
  const settings = useSettings();
  const appData = useAppData();
  const studentData = useStudentData();
  const referralLink = useSync((s) => s.referralLink);
  const instagramHandle = useSync((s) => s.config.social_instagram ?? "trackly.in");
  const appVersion = useSync((s) => s.config.app_version ?? "2.4.1");
  const whatsNew = useSync((s) => s.config.whats_new);
  // Live deleted-items count for the Delete folder row
  const trashCount = useTrashStore((s) => s.items.length);

  // Modals
  const [showCurrency, setShowCurrency] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showTripMode, setShowTripMode] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showAppIcon, setShowAppIcon] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showEndTripConfirm, setShowEndTripConfirm] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [showTripHistory, setShowTripHistory] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripHistoryEntry | null>(null);
  const [showEndStudentConfirm, setShowEndStudentConfirm] = useState(false);
  const [showStudentHistory, setShowStudentHistory] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentHistoryEntry | null>(null);
  const [showResumeStudent, setShowResumeStudent] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [editName, setEditName] = useState(settings.userName);
  const [editEmail, setEditEmail] = useState(settings.userEmail);
  const [editAvatar, setEditAvatar] = useState(settings.userAvatar);
  const [editPhone, setEditPhone] = useState(settings.userPhone);
  const [editBio, setEditBio] = useState(settings.userBio);
  const [editBirthday, setEditBirthday] = useState(settings.userBirthday);
  const [editCountry, setEditCountry] = useState(settings.userCountry);

  const languageName = LANGUAGES.find((l) => l.code === settings.language)?.name ?? "English";
  const tripModeLabel =
    settings.tripMode === "national" ? "National Trip" :
    settings.tripMode === "international" ? "International Trip" :
    "Off";

  const tripCountry = settings.tripCountry ? getCountryByCode(settings.tripCountry) : null;
  const tripDuration = settings.tripStartedAt
    ? Math.ceil((Date.now() - new Date(settings.tripStartedAt).getTime()) / 86400000)
    : 0;

  // ===== Trip handlers =====
  const handleSelectTripMode = (mode: TripMode) => {
    setShowTripMode(false);
    if (mode === "none") {
      // End trip
      setShowEndTripConfirm(true);
      return;
    }
    if (mode === "international") {
      setShowCountryPicker(true);
      return;
    }
    // National — ask for city
    const city = prompt("Enter destination city:");
    if (city) {
      settings.startTrip("national", city);
      appData.startTrip();
      toast.success(`🧳 National trip to ${city} started. Counting reset to zero.`);
    }
  };

  const handleSelectCountry = (countryCode: string) => {
    const country = getCountryByCode(countryCode);
    if (!country) return;
    const currency = getCurrencyByCode(country.currencyCode);
    settings.startTrip("international", country.name, countryCode);
    appData.startTrip();
    setShowCountryPicker(false);
    setCountrySearch("");
    toast.success(
      `🌍 International trip to ${country.name} started. Currency set to ${currency.code} (${currency.symbol}). Counting reset to zero.`
    );
  };

  const handleEndTrip = () => {
    // Save trip data to history before restoring
    const tripExpenses = appData.expenses;
    const tripIncomes = appData.incomes;
    const tripShopping = appData.shopping;
    const tripBorrowLend = appData.borrowLend;

    const totalSpent = tripExpenses.reduce((s, e) => s + e.amount, 0);
    const totalIncome = tripIncomes.reduce((s, i) => s + i.amount, 0);
    const durationDays = settings.tripStartedAt
      ? Math.max(1, Math.ceil((Date.now() - new Date(settings.tripStartedAt).getTime()) / 86400000))
      : 1;

    const country = settings.tripCountry ? getCountryByCode(settings.tripCountry) : null;

    // Save to history
    settings.saveTripToHistory({
      mode: settings.tripMode,
      destination: settings.tripDestination,
      countryCode: settings.tripCountry,
      flag: country?.flag ?? (settings.tripMode === "national" ? "🧳" : "🌍"),
      startedAt: settings.tripStartedAt ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationDays,
      currencyCode: settings.currency.code,
      currencySymbol: settings.currency.symbol,
      totalSpent,
      totalIncome,
      expenseCount: tripExpenses.length,
      incomeCount: tripIncomes.length,
      shoppingCount: tripShopping.length,
      borrowLendCount: tripBorrowLend.length,
      expenses: tripExpenses,
      incomes: tripIncomes,
      shopping: tripShopping,
      borrowLend: tripBorrowLend,
    });

    // Restore pre-trip data
    const hadTripSnapshot = !!useAppData.getState().tripSnapshot;
    settings.endTrip();
    appData.endTrip();
    if (!hadTripSnapshot) {
      // Snapshot was in-memory only and was lost (reload/crash while the
      // trip was active). The autoSave guard kept the cloud intact — pull
      // the personal data back from there instead of staying empty.
      (async () => {
        try {
          const { supabase } = await import("@/lib/supabase/client");
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { loadUserDataFromSupabase } = await import("@/lib/supabase/dataSync");
            await loadUserDataFromSupabase(user.id);
          }
        } catch { /* offline — data re-syncs on next app open */ }
      })();
    }
    setShowEndTripConfirm(false);
    toast.success("✅ Trip ended & saved to history. All your previous data has been restored.");
  };

  // ===== Student Mode handlers =====
  const handleStartStudentMode = () => {
    settings.startStudentMode();
    appData.startStudentMode();
    setScreen("student-dashboard");
    toast.success("🎓 Student Mode enabled. Counting reset to zero. Dashboard updated.");
  };

  const handleResumeStudentMode = () => {
    // Resume old session — restore student data from modeBackup
    settings.resumeStudentMode();
    appData.returnToMode();
    setShowResumeStudent(false);
    setScreen("student-dashboard");
    toast.success("🎓 Resumed student session.");
  };

  const handleStartNewStudentSession = () => {
    // If paused, return to mode first to get student data from modeBackup
    if (settings.studentPaused) {
      appData.returnToMode();
    }

    // Read the old student data (now in appData after returnToMode)
    const studentExpenses = useAppData.getState().expenses;
    const studentIncomes = useAppData.getState().incomes;
    const studentShopping = useAppData.getState().shopping;
    const studentBorrowLend = useAppData.getState().borrowLend;

    const totalSpent = studentExpenses.reduce((s, e) => s + e.amount, 0);
    const totalIncome = studentIncomes.reduce((s, i) => s + i.amount, 0);
    const durationDays = settings.studentStartedAt
      ? Math.max(1, Math.ceil((Date.now() - new Date(settings.studentStartedAt).getTime()) / 86400000))
      : 1;

    // Save old session to history
    settings.saveStudentToHistory({
      startedAt: settings.studentStartedAt ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationDays,
      totalSpent,
      totalIncome,
      expenseCount: studentExpenses.length,
      incomeCount: studentIncomes.length,
      shoppingCount: studentShopping.length,
      borrowLendCount: studentBorrowLend.length,
      expenses: studentExpenses,
      incomes: studentIncomes,
      shopping: studentShopping,
      borrowLend: studentBorrowLend,
    });

    // Start fresh: reset ALL data to zero — expenses, student data, everything
    settings.startNewStudentSession();
    appData.resetStudentData();
    studentData.resetAllStudentData();
    setShowResumeStudent(false);
    setScreen("student-dashboard");
    toast.success("🎓 Old session saved to history. New student session started with fresh counting.");
  };

  const handleEndStudentMode = () => {
    // If paused, return to mode first to get student data
    if (settings.studentPaused) {
      appData.returnToMode();
    }

    // Save student data to history before restoring
    const studentExpenses = useAppData.getState().expenses;
    const studentIncomes = useAppData.getState().incomes;
    const studentShopping = useAppData.getState().shopping;
    const studentBorrowLend = useAppData.getState().borrowLend;

    const totalSpent = studentExpenses.reduce((s, e) => s + e.amount, 0);
    const totalIncome = studentIncomes.reduce((s, i) => s + i.amount, 0);
    const durationDays = settings.studentStartedAt
      ? Math.max(1, Math.ceil((Date.now() - new Date(settings.studentStartedAt).getTime()) / 86400000))
      : 1;

    settings.saveStudentToHistory({
      startedAt: settings.studentStartedAt ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationDays,
      totalSpent,
      totalIncome,
      expenseCount: studentExpenses.length,
      incomeCount: studentIncomes.length,
      shoppingCount: studentShopping.length,
      borrowLendCount: studentBorrowLend.length,
      expenses: studentExpenses,
      incomes: studentIncomes,
      shopping: studentShopping,
      borrowLend: studentBorrowLend,
    });

    const hadStudentSnapshot = !!useAppData.getState().studentSnapshot;
    settings.endStudentMode();
    appData.endStudentMode();
    if (!hadStudentSnapshot) {
      // Snapshot was in-memory only and was lost (reload/crash while student
      // mode was active). The autoSave guard kept the cloud intact — pull
      // the personal data back from there instead of staying empty.
      (async () => {
        try {
          const { supabase } = await import("@/lib/supabase/client");
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { loadUserDataFromSupabase } = await import("@/lib/supabase/dataSync");
            await loadUserDataFromSupabase(user.id);
          }
        } catch { /* offline — data re-syncs on next app open */ }
      })();
    }
    setScreen("dashboard");
    setShowEndStudentConfirm(false);
    toast.success("✅ Student Mode ended & saved to history. All your previous data has been restored.");
  };

  const handleExport = (format: "csv" | "json") => {
    const data = {
      exportedAt: new Date().toISOString(),
      currency: settings.currency.code,
      tripMode: settings.tripMode,
      tripDestination: settings.tripDestination,
      language: settings.language,
      settings: {
        biometricLock: settings.biometricLock,
        cloudSync: settings.cloudSync,
        hapticFeedback: settings.hapticFeedback,
        ocr: settings.ocr,
      },
    };
    const content = format === "json"
      ? JSON.stringify(data, null, 2)
      : "key,value\n" + Object.entries(data).map(([k, v]) => `${k},${JSON.stringify(v)}`).join("\n");
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trackly-export-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Data exported as ${format.toUpperCase()}`);
    setShowExport(false);
  };

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader title="Profile" subtitle="Settings & preferences" />

      {/* Profile */}
      <div className="px-5 mt-1">
        <Card>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditName(settings.userName);
              setEditEmail(settings.userEmail);
              setEditAvatar(settings.userAvatar);
              setEditPhone(settings.userPhone);
              setEditBio(settings.userBio);
              setEditBirthday(settings.userBirthday);
              setEditCountry(settings.userCountry);
              setShowProfileEdit(true);
            }}
            className="w-full flex items-center gap-3"
          >
            <div className="h-14 w-14 rounded-full bg-foreground text-background flex items-center justify-center text-[20px] font-bold overflow-hidden shrink-0">
              {settings.userAvatarUrl ? (
                // Google/Gmail profile photo (auto-set on Google sign-in)
                <img
                  src={settings.userAvatarUrl}
                  alt={settings.userName || "Profile"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                settings.userAvatar
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[17px] font-bold">{settings.userName}</p>
              <p className="text-[13px] text-muted-foreground">{settings.userEmail}</p>
              {settings.userBio && <p className="text-[12px] text-muted-foreground mt-0.5">{settings.userBio}</p>}
              <p className="text-[11px] text-muted-foreground mt-0.5">Member since {settings.userMemberSince}</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </motion.button>
        </Card>
      </div>

      {/* ===== AI ASSISTANT ===== */}
      <SectionTitle>AI Assistant</SectionTitle>
      <div className="px-5" data-tour="ai-assistant">
        <Card className="p-0 overflow-hidden">
          <ListRow
            icon={<Icon><Brain size={16} /></Icon>}
            label="Trackly AI"
            value="Chat with AI"
            onClick={() => {
              const lastMode = typeof window !== "undefined"
                ? (localStorage.getItem("trackly-ai-last-mode") as "personal" | "student" | "office" | "trip") || "personal"
                : "personal";
              openAIChat(lastMode);
            }}
            showChevron
            last
          />
        </Card>
      </div>

      {/* ===== INVITE & EARN ===== */}
      <SectionTitle>Invite & Earn</SectionTitle>
      <div className="px-5">
        <Card className="p-0 overflow-hidden">
          <ListRow
            icon={<Icon><Gift size={16} /></Icon>}
            label="Invite Friends"
            value="+5 AI msgs/day per friend"
            onClick={() => setScreen("invite")}
            showChevron
            last
          />
        </Card>
      </div>

      {/* ===== TRIP MODE ===== */}
      <SectionTitle>Trip Mode</SectionTitle>
      <div className="px-5" data-tour="trip-mode">
        {settings.tripMode !== "none" ? (
          /* Active trip card */
          <Card className="bg-foreground text-background">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-2xl bg-background/20 flex items-center justify-center text-[24px]">
                {tripCountry?.flag ?? (settings.tripMode === "national" ? "🧳" : "🌍")}
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">
                  {settings.tripMode === "international" ? "International Trip" : "National Trip"} · Active
                </p>
                <p className="text-[18px] font-bold mt-0.5">{settings.tripDestination}</p>
                <p className="text-[12px] opacity-70 mt-0.5">
                  Day {tripDuration} · Currency: {settings.currency.symbol} {settings.currency.code}
                </p>
              </div>
            </div>
            {settings.tripMode === "international" && (
              <div className="text-[12px] opacity-80 mb-3 leading-relaxed">
                🌍 Auto currency conversion active · Roaming alerts enabled · Fresh expense tracking for this trip
              </div>
            )}
            {settings.tripMode === "national" && (
              <div className="text-[12px] opacity-80 mb-3 leading-relaxed">
                🧳 Local budget tracking · Fresh expense tracking for this trip
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowEndTripConfirm(true)}
              className="w-full h-10 rounded-xl bg-background text-foreground font-semibold text-[14px] flex items-center justify-center gap-2"
            >
              <Plane size={16} className="rotate-45" />
              End Trip & Save to History
            </motion.button>
          </Card>
        ) : (
          /* No trip — show option to start */
          <Card className="p-0 overflow-hidden">
            <ListRow
              icon={<Icon><Plane size={16} /></Icon>}
              label="Trip Mode"
              value={tripModeLabel}
              onClick={() => setShowTripMode(true)}
              showChevron
              last
            />
          </Card>
        )}
      </div>

      {/* ===== TRIP HISTORY ===== */}
      {settings.tripHistory.length > 0 && (
        <>
          <SectionTitle>Trip History ({settings.tripHistory.length})</SectionTitle>
          <div className="px-5">
            <Card className="p-0 overflow-hidden">
              {settings.tripHistory.slice(0, 5).map((trip, i, arr) => (
                <motion.button
                  key={trip.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => { setSelectedTrip(trip); setShowTripHistory(true); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-[18px]">
                    {trip.flag}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[14px] font-medium truncate">{trip.destination}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {trip.durationDays}d · {trip.expenseCount} expenses · {trip.currencySymbol}{trip.totalSpent.toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </motion.button>
              ))}
            </Card>
          </div>
        </>
      )}

      {/* ===== STUDENT MODE ===== */}
      <SectionTitle>Student Mode</SectionTitle>
      <div className="px-5" data-tour="student-mode">
        {settings.studentMode && !settings.studentPaused ? (
          /* Active student mode card */
          <Card className="bg-foreground text-background">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-2xl bg-background/20 flex items-center justify-center">
                <GraduationCap size={22} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">
                  Student Mode · Active
                </p>
                <p className="text-[18px] font-bold mt-0.5">Student Life Tracking</p>
                <p className="text-[12px] opacity-70 mt-0.5">
                  Day {settings.studentStartedAt ? Math.max(1, Math.ceil((Date.now() - new Date(settings.studentStartedAt).getTime()) / 86400000)) : 1} · Fresh counting active
                </p>
              </div>
            </div>
            <div className="text-[12px] opacity-80 mb-3 leading-relaxed">
              🎓 Classes, assignments, exams, attendance, mess, hostel & budget — all tracked separately. Your previous data is saved and will be restored when you exit.
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowEndStudentConfirm(true)}
              className="w-full h-10 rounded-xl bg-background text-foreground font-semibold text-[14px] flex items-center justify-center gap-2"
            >
              <GraduationCap size={16} />
              End Student Mode & Save
            </motion.button>
          </Card>
        ) : settings.studentMode && settings.studentPaused ? (
          /* Paused — show resume/new choice */
          <Card className="bg-foreground text-background">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-2xl bg-background/20 flex items-center justify-center">
                <GraduationCap size={22} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">
                  Student Mode · Paused
                </p>
                <p className="text-[16px] font-bold mt-0.5">Return to Student Mode?</p>
                <p className="text-[12px] opacity-70 mt-0.5">
                  You were in Student Mode. Continue old session or start fresh.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleResumeStudentMode}
                className="w-full h-11 rounded-xl bg-background text-foreground font-semibold text-[14px] flex items-center justify-center gap-2"
              >
                <GraduationCap size={16} />
                Continue Old Session
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleStartNewStudentSession}
                className="w-full h-11 rounded-xl border border-background/30 text-background font-semibold text-[14px] flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Start New Session
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowEndStudentConfirm(true)}
                className="w-full h-10 text-[13px] font-medium opacity-70"
              >
                Or End & Save to History
              </motion.button>
            </div>
          </Card>
        ) : (
          /* Inactive — show enable card */
          <Card className={settings.studentMode ? "bg-foreground text-background" : ""}>
            <div className="flex items-start gap-3">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${settings.studentMode ? "bg-background/15" : "bg-muted"}`}>
                <GraduationCap size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold tracking-tight">Student Mode</p>
                <p className="text-[13px] mt-0.5 leading-snug text-muted-foreground">
                  Transform Trackly into a complete student life management system — classes, assignments, exams, attendance, mess, hostel & more.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <Toggle
                checked={false}
                onChange={(v) => {
                  if (v) {
                    handleStartStudentMode();
                  }
                }}
              />
            </div>
          </Card>
        )}
      </div>

      {/* ===== STUDENT HISTORY ===== */}
      {settings.studentHistory.length > 0 && (
        <>
          <SectionTitle>Student History ({settings.studentHistory.length})</SectionTitle>
          <div className="px-5">
            <Card className="p-0 overflow-hidden">
              {settings.studentHistory.slice(0, 5).map((entry, i, arr) => (
                <motion.button
                  key={entry.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => { setSelectedStudent(entry); setShowStudentHistory(true); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <GraduationCap size={18} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[14px] font-medium truncate">Student Period</p>
                    <p className="text-[12px] text-muted-foreground">
                      {entry.durationDays}d · {entry.expenseCount} expenses · ₹{entry.totalSpent.toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </motion.button>
              ))}
            </Card>
          </div>
        </>
      )}

      {/* ===== OFFICE MODE ===== */}
      <SectionTitle>Office Mode</SectionTitle>
      <div className="px-5" data-tour="office-mode">
        <Card className={settings.officeMode ? "bg-foreground text-background" : ""}>
          <div className="flex items-start gap-3 p-4">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${settings.officeMode ? "bg-background/15" : "bg-muted"}`}>
              <Briefcase size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-bold">Office Mode</p>
                {settings.officeMode && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="text-[10px] uppercase tracking-wider bg-background/15 px-2 py-0.5 rounded-full font-semibold"
                  >
                    Active
                  </motion.span>
                )}
              </div>
              <p className={`text-[13px] mt-0.5 ${settings.officeMode ? "opacity-80" : "text-muted-foreground"}`}>
                Work tasks, meetings, attendance, salary & productivity tracker
              </p>
            </div>
          </div>
          <div className="px-4 pb-4">
            <Toggle
              checked={settings.officeMode}
              onChange={(v) => {
                if (v) {
                  // Disable student mode if on
                  if (settings.studentMode) {
                    settings.setStudentMode(false);
                  }
                  settings.setOfficeMode(true);
                  toast.success("💼 Office Mode enabled — dashboard updated");
                  setScreen("office-dashboard");
                } else {
                  settings.setOfficeMode(false);
                  toast.success("Office Mode disabled");
                  setScreen("dashboard");
                }
              }}
              label={settings.officeMode ? "Enabled" : "Enable Office Mode"}
            />
          </div>
        </Card>
      </div>

      {/* ===== CURRENCY ===== */}
      <SectionTitle>Currency</SectionTitle>
      <div className="px-5">
        <Card className="p-0 overflow-hidden">
          <ListRow
            icon={<Icon><Wallet size={16} /></Icon>}
            label="Currency"
            value={`${settings.currency.symbol} ${settings.currency.code}`}
            onClick={() => setShowCurrency(true)}
            showChevron
          />
          <ListRow
            icon={<Icon><Globe size={16} /></Icon>}
            label="Language"
            value={languageName}
            onClick={() => setShowLanguage(true)}
            showChevron
            last
          />
        </Card>
      </div>

      {/* Appearance */}
      <SectionTitle>Appearance</SectionTitle>
      <div className="px-5">
        <Card className="p-0 overflow-hidden">
          <ListRow
            icon={<ThemeIcon theme={theme} />}
            label="Theme"
            value={theme === "dark" ? "Dark" : "Light"}
            onClick={toggle}
            showChevron
          />
          <ListRow
            icon={<Icon><Sparkles size={16} /></Icon>}
            label="App Icon"
            value={settings.appIcon}
            onClick={() => setShowAppIcon(true)}
            showChevron
            last
          />
        </Card>
      </div>

      {/* Quick Add */}
      <SectionTitle>Quick Add</SectionTitle>
      <div className="px-5">
        <Card className="p-0 overflow-hidden">
          <ListRow
            icon={<Icon><Zap size={16} /></Icon>}
            label="Back Tap Action"
            right={<Toggle checked={settings.backTapAction} onChange={() => { settings.toggle("backTapAction"); toast.success(`Back tap ${!settings.backTapAction ? "enabled" : "disabled"}`); }} />}
          />
          <ListRow
            icon={<Icon><LayoutGrid size={16} /></Icon>}
            label="Home Screen Widget"
            right={<Toggle checked={settings.homeWidget} onChange={() => { settings.toggle("homeWidget"); toast.success(`Widget ${!settings.homeWidget ? "enabled" : "disabled"}`); }} />}
          />
          <ListRow
            icon={<Icon><Mic size={16} /></Icon>}
            label="Voice Input"
            right={<Toggle checked={settings.voiceInput} onChange={() => { settings.toggle("voiceInput"); toast.success(`Voice input ${!settings.voiceInput ? "enabled" : "disabled"}`); }} />}
            last
          />
        </Card>
      </div>

      {/* Device Integration */}
      <SectionTitle>Device Integration</SectionTitle>
      <div className="px-5">
        <Card className="p-0 overflow-hidden">
          <ListRow
            icon={<Icon><ScanFace size={16} /></Icon>}
            label="Biometric Lock"
            description="Face ID / Fingerprint"
            right={<Toggle checked={settings.biometricLock} onChange={() => { settings.toggle("biometricLock"); toast.success(`Biometric lock ${!settings.biometricLock ? "enabled" : "disabled"}`); }} />}
          />
          <ListRow
            icon={<Icon><Cloud size={16} /></Icon>}
            label="Cloud Sync"
            description="iCloud / Google Drive"
            right={<Toggle checked={settings.cloudSync} onChange={() => { settings.toggle("cloudSync"); toast.success(`Cloud sync ${!settings.cloudSync ? "enabled" : "disabled"}`); }} />}
          />
          <ListRow
            icon={<Icon><Bell size={16} /></Icon>}
            label="Voice Assistant"
            description="Siri / Google Assistant"
            right={<Toggle checked={settings.voiceAssistant} onChange={() => { settings.toggle("voiceAssistant"); toast.success(`Voice assistant ${!settings.voiceAssistant ? "enabled" : "disabled"}`); }} />}
          />
          <ListRow
            icon={<Icon><Vibrate size={16} /></Icon>}
            label="Haptic Feedback"
            right={<Toggle checked={settings.hapticFeedback} onChange={() => { settings.toggle("hapticFeedback"); toast.success(`Haptics ${!settings.hapticFeedback ? "enabled" : "disabled"}`); }} />}
          />
          <ListRow
            icon={<Icon><Shield size={16} /></Icon>}
            label="OCR Scanning"
            description="Vision / ML Kit"
            right={<Toggle checked={settings.ocr} onChange={() => { settings.toggle("ocr"); toast.success(`OCR ${!settings.ocr ? "enabled" : "disabled"}`); }} />}
            last
          />
        </Card>
      </div>

      {/* Data */}
      <SectionTitle>Data & Privacy</SectionTitle>
      <div className="px-5">
        <Card className="p-0 overflow-hidden">
          <ListRow
            icon={<Icon><Cloud size={16} /></Icon>}
            label="Auto Backup"
            right={<Toggle checked={settings.autoBackup} onChange={() => { settings.toggle("autoBackup"); toast.success(`Auto backup ${!settings.autoBackup ? "enabled" : "disabled"}`); }} />}
          />
          <ListRow
            icon={<Icon><Archive size={16} /></Icon>}
            label="Archive"
            value="Restore or delete"
            onClick={() => setScreen("archive")}
            showChevron
          />
          <ListRow
            icon={<Icon><Trash2 size={16} /></Icon>}
            label="Deleted Items"
            value={trashCount > 0 ? `${trashCount} ${trashCount === 1 ? "item" : "items"} · counted` : "Empty"}
            description="Delete folder — everything you delete lands here"
            onClick={() => setScreen("trash")}
            showChevron
          />
          <ListRow
            icon={<Icon><Download size={16} /></Icon>}
            label="Export Data"
            value="CSV / JSON"
            onClick={() => setShowExport(true)}
            showChevron
          />
          <ListRow
            icon={<Icon><Shield size={16} /></Icon>}
            label="Privacy Policy"
            onClick={() => setScreen("privacy")}
            showChevron
            last
          />
        </Card>
      </div>

      {/* About */}
      <SectionTitle>About</SectionTitle>
      <div className="px-5">
        <Card className="p-0 overflow-hidden">
          <ListRow
            icon={<Icon><HelpCircle size={16} /></Icon>}
            label="Help & Support"
            onClick={() => setScreen("help")}
            showChevron
          />
          <ListRow
            icon={<Icon><Sparkles size={16} /></Icon>}
            label="What's New"
            value={whatsNew?.version ? `${whatsNew.version}` : `v${appVersion}`}
            onClick={() => setShowWhatsNew(true)}
            showChevron
          />
          <ListRow
            icon={<Icon><AtSign size={16} /></Icon>}
            label="Instagram"
            value={`@${instagramHandle.replace(/^@/, "")}`}
            onClick={() => {
              const handle = instagramHandle.replace(/^@/, "");
              const url = /^https?:\/\//i.test(instagramHandle) ? instagramHandle : `https://instagram.com/${handle}`;
              window.open(url, "_blank");
              toast.success("Opening Instagram...");
            }}
            showChevron
          />
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowInvite(true)}
            className={`w-full flex items-center gap-3 py-3 px-4 active:bg-muted/50 text-left`}
          >
            <Icon><Users size={16} /></Icon>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium text-foreground">Invite Friends</div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground rotate-180" />
          </motion.button>
        </Card>
      </div>

      {/* Health */}
      <SectionTitle>Health</SectionTitle>
      <div className="px-5">
        <Card className="p-0 overflow-hidden">
          <ListRow
            icon={<Icon><Pill size={16} /></Icon>}
            label="Medicine Reminder"
            onClick={() => setScreen("medicine")}
            showChevron
            last
          />
        </Card>
      </div>

      {/* Tour */}
      <SectionTitle>Tour</SectionTitle>
      <div className="px-5">
        <Card className="p-0 overflow-hidden">
          <ListRow
            icon={<Icon><Sparkles size={16} /></Icon>}
            label="Replay Onboarding"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("trackly-force-onboarding", "1");
                window.location.reload();
              }
            }}
            showChevron
          />
          <ListRow
            icon={<Icon><RefreshCw size={16} /></Icon>}
            label="Re-sync from Cloud"
            onClick={async () => {
              toast.loading("Re-syncing from cloud...");
              const { supabase } = await import("@/lib/supabase/client");
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                toast.dismiss();
                toast.error("Not logged in");
                return;
              }
              const { loadUserDataFromSupabase } = await import("@/lib/supabase/dataSync");
              const success = await loadUserDataFromSupabase(user.id);
              toast.dismiss();
              if (success) {
                toast.success("Data re-synced from cloud");
                setTimeout(() => window.location.reload(), 800);
              } else {
                toast.error("Failed to re-sync — no cloud data found");
              }
            }}
            showChevron
            last
          />
        </Card>
      </div>

      <div className="px-5 mt-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={async () => {
            const { supabase } = await import("@/lib/supabase/client");
            await supabase.auth.signOut();
            toast.success("Signed out successfully");
            const { clearAllLocalData } = await import("@/lib/supabase/dataSync");
            clearAllLocalData();
            setTimeout(() => window.location.reload(), 500);
          }}
          className="w-full h-[52px] rounded-2xl border border-border text-[15px] font-semibold text-foreground flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Sign out
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setDeletePassword("");
            setDeleteConfirmText("");
            setShowDeleteAccount(true);
          }}
          className="w-full h-[52px] rounded-2xl border border-red-500/30 bg-red-500/5 text-[15px] font-semibold text-red-500 flex items-center justify-center gap-2 mt-3"
        >
          <Trash2 size={16} />
          Delete Account
        </motion.button>
      </div>

      <p className="text-center text-[12px] text-muted-foreground mt-6">
        Trackly v2.4.1 · Made with care · iOS & Android
      </p>

      {/* ===== Delete Account (Danger Zone) ===== */}
      <SheetModal
        open={showDeleteAccount}
        onClose={() => !deletingAccount && setShowDeleteAccount(false)}
        title="Delete Account"
      >
        <div className="flex items-start gap-3 mb-4 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-medium text-red-500">This is permanent and cannot be undone.</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Your account, expenses, habits, notes, transactions, modes data and groups membership will be <span className="font-semibold text-foreground">permanently deleted</span> from our servers.
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Groups where you are the only member get deleted. Shared groups stay for others — you are marked as removed and their balances remain correct.
            </p>
            <p className="text-[12px] text-muted-foreground mt-2 pt-2 border-t border-red-500/10">
              💡 Want a copy first? Use <span className="font-semibold text-foreground">Settings → Export Data</span> before deleting.
            </p>
          </div>
        </div>

        <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Your password</label>
        <input
          type="password"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          placeholder="Enter account password"
          autoComplete="current-password"
          className="w-full h-11 rounded-xl bg-muted border border-border px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-red-500/30 mb-3"
        />
        <p className="text-[11px] text-muted-foreground -mt-2 mb-3">
          Signed up with Google? Leave the password blank.
        </p>

        <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">
          Type <span className="font-semibold text-red-500">DELETE</span> to confirm
        </label>
        <input
          type="text"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder="DELETE"
          className="w-full h-11 rounded-xl bg-muted border border-border px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-red-500/30 mb-4"
        />

        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowDeleteAccount(false)}
            disabled={deletingAccount}
            className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold"
          >
            Cancel
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={async () => {
              const { supabase } = await import("@/lib/supabase/client");
              const { data } = await supabase.auth.getSession();
              const token = data.session?.access_token;
              if (!token) {
                toast.error("Not logged in");
                return;
              }
              setDeletingAccount(true);
              toast.loading("Deleting your account...");
              try {
                const res = await fetch("/api/auth/delete-account", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ confirm: "DELETE", password: deletePassword || undefined }),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok || !json.deleted) {
                  toast.dismiss();
                  toast.error(json.error || "Failed to delete account");
                  setDeletingAccount(false);
                  return;
                }
                toast.dismiss();
                toast.success("Account deleted. Sorry to see you go!");
                await supabase.auth.signOut();
                const { clearAllLocalData } = await import("@/lib/supabase/dataSync");
                clearAllLocalData();
                setTimeout(() => window.location.reload(), 800);
              } catch {
                toast.dismiss();
                toast.error("Network error — account not deleted");
                setDeletingAccount(false);
              }
            }}
            disabled={deleteConfirmText !== "DELETE" || deletingAccount}
            className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[14px] font-semibold disabled:opacity-40"
          >
            {deletingAccount ? "Deleting..." : "Delete Forever"}
          </motion.button>
        </div>
      </SheetModal>

      {/* ===== Trip Mode Modal ===== */}
      <SheetModal open={showTripMode} onClose={() => setShowTripMode(false)} title="Start Trip Mode">
        <p className="text-[13px] text-muted-foreground mb-4">
          Trackly adapts to your travel. Expenses reset to zero for fresh trip tracking. Currency auto-converts for international trips. Your existing data is saved and restored when you end the trip.
        </p>
        <div className="space-y-2">
          <TripOption
            icon={<MapPin size={18} />}
            label="National Trip"
            description="Domestic travel — local budget, no currency conversion"
            onClick={() => handleSelectTripMode("national")}
          />
          <TripOption
            icon={<Plane size={18} />}
            label="International Trip"
            description="Overseas — auto currency conversion, roaming alerts"
            onClick={() => handleSelectTripMode("international")}
          />
        </div>
      </SheetModal>

      {/* ===== Country Picker Modal ===== */}
      <SheetModal open={showCountryPicker} onClose={() => setShowCountryPicker(false)} title="Select Destination Country">
        <p className="text-[13px] text-muted-foreground mb-3">
          Choose your destination. Trackly will automatically switch to that country's currency.
        </p>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            placeholder="Search countries..."
            className="w-full bg-muted rounded-xl pl-9 pr-3 py-2.5 text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="space-y-1 max-h-[350px] overflow-y-auto no-scrollbar">
          {filteredCountries.map((c) => {
            const currency = getCurrencyByCode(c.currencyCode);
            return (
              <motion.button
                key={c.code}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectCountry(c.code)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted"
              >
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-[20px]">
                  {c.flag}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">{c.name}</p>
                  <p className="text-[12px] text-muted-foreground">
                    Currency: {currency.symbol} {currency.code} · {currency.name}
                  </p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </motion.button>
            );
          })}
          {filteredCountries.length === 0 && (
            <p className="text-[14px] text-muted-foreground text-center py-8">No countries found</p>
          )}
        </div>
      </SheetModal>

      {/* ===== End Trip Confirmation ===== */}
      <SheetModal open={showEndTripConfirm} onClose={() => setShowEndTripConfirm(false)} title="End Trip?">
        <div className="flex items-start gap-3 mb-4 p-4 bg-muted rounded-2xl">
          <AlertCircle size={20} className="text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-medium">End your trip to {settings.tripDestination}?</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              ✅ Your trip data will be <span className="font-semibold text-foreground">saved to Trip History</span> — you can view it anytime later.
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">
              ✅ All your previous data (expenses, income, shopping, borrow/lend) will be restored to how it was before the trip.
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">
              ✅ Currency will switch back to {settings.preTripCurrency?.symbol} {settings.preTripCurrency?.code}.
            </p>
            <p className="text-[12px] text-muted-foreground mt-2 pt-2 border-t border-border">
              ⚠️ If you just want to view normal mode without ending the trip, use <span className="font-semibold">Exit Without Saving</span> — your trip stays active and data is not lost.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setShowEndTripConfirm(false);
              appData.viewNormalMode();
              setScreen("dashboard");
              setNormalViewOverride(true);
              toast.info("Exited to normal mode. Trip still active — data not saved yet. Tap Home to return to trip.");
            }}
            className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold"
          >
            Exit Without Saving
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleEndTrip}
            className="flex-1 h-11 rounded-xl bg-foreground text-background text-[14px] font-semibold"
          >
            End & Save
          </motion.button>
        </div>
      </SheetModal>

      {/* ===== End Student Mode Confirmation ===== */}
      <SheetModal open={showEndStudentConfirm} onClose={() => setShowEndStudentConfirm(false)} title="End Student Mode?">
        <div className="flex items-start gap-3 mb-4 p-4 bg-muted rounded-2xl">
          <AlertCircle size={20} className="text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-medium">End Student Mode?</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              ✅ Your student data will be <span className="font-semibold text-foreground">saved to Student History</span> — you can view it anytime later.
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">
              ✅ All your previous data (expenses, income, shopping, borrow/lend) will be restored to how it was before Student Mode.
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">
              ✅ Dashboard will switch back to normal mode.
            </p>
            <p className="text-[12px] text-muted-foreground mt-2 pt-2 border-t border-border">
              ⚠️ If you just want to view normal mode without ending Student Mode, use <span className="font-semibold">Exit Without Saving</span> — your student mode stays active and data is not lost.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setShowEndStudentConfirm(false);
              appData.viewNormalMode();
              settings.pauseStudentMode();
              setScreen("dashboard");
              toast.info("Exited to normal mode. Student Mode paused — tap Home to resume or start new.");
            }}
            className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold"
          >
            Exit Without Saving
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleEndStudentMode}
            className="flex-1 h-11 rounded-xl bg-foreground text-background text-[14px] font-semibold"
          >
            End & Save
          </motion.button>
        </div>
      </SheetModal>

      {/* ===== Student History Detail Modal ===== */}
      <SheetModal
        open={showStudentHistory && !!selectedStudent}
        onClose={() => { setShowStudentHistory(false); setSelectedStudent(null); }}
        title="Student Period Details"
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-2xl">
              <div className="h-14 w-14 rounded-2xl bg-background flex items-center justify-center">
                <GraduationCap size={28} />
              </div>
              <div className="flex-1">
                <p className="text-[18px] font-bold">Student Period</p>
                <p className="text-[12px] text-muted-foreground">
                  {selectedStudent.durationDays} day{selectedStudent.durationDays !== 1 ? "s" : ""}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(selectedStudent.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} → {new Date(selectedStudent.endedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-xl">
                <p className="text-[11px] text-muted-foreground font-medium">TOTAL SPENT</p>
                <p className="text-[18px] font-bold mt-1">₹{selectedStudent.totalSpent.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{selectedStudent.expenseCount} expenses</p>
              </div>
              <div className="p-3 bg-muted rounded-xl">
                <p className="text-[11px] text-muted-foreground font-medium">TOTAL INCOME</p>
                <p className="text-[18px] font-bold mt-1">₹{selectedStudent.totalIncome.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{selectedStudent.incomeCount} sources</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-xl">
                <p className="text-[11px] text-muted-foreground font-medium">SHOPPING</p>
                <p className="text-[16px] font-bold mt-1">{selectedStudent.shoppingCount} items</p>
              </div>
              <div className="p-3 bg-muted rounded-xl">
                <p className="text-[11px] text-muted-foreground font-medium">BORROW/LEND</p>
                <p className="text-[16px] font-bold mt-1">{selectedStudent.borrowLendCount} entries</p>
              </div>
            </div>

            {selectedStudent.expenses.length > 0 && (
              <div>
                <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Expenses ({selectedStudent.expenses.length})</p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto no-scrollbar">
                  {selectedStudent.expenses.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                      <span className="text-[13px] flex-1 truncate">{e.title}</span>
                      <span className="text-[13px] font-semibold tabular-nums">−₹{e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                settings.deleteStudentHistory(selectedStudent.id);
                toast.success("Student period deleted from history");
                setShowStudentHistory(false);
                setSelectedStudent(null);
              }}
              className="w-full h-11 rounded-xl border border-border text-[14px] font-semibold flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Delete from history
            </motion.button>
          </div>
        )}
      </SheetModal>

      {/* ===== Currency Modal ===== */}
      <SheetModal open={showCurrency} onClose={() => setShowCurrency(false)} title="Select Currency">
        <div className="space-y-1 max-h-[400px] overflow-y-auto no-scrollbar">
          {CURRENCIES.map((c) => (
            <motion.button
              key={c.code}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                settings.setCurrency(c);
                toast.success(`Currency changed to ${c.name} (${c.symbol})`);
                setShowCurrency(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl ${settings.currency.code === c.code ? "bg-muted" : ""}`}
            >
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-[16px] font-bold">
                {c.symbol}
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-medium">{c.code} · {c.name}</p>
                <p className="text-[12px] text-muted-foreground">Locale: {c.locale}</p>
              </div>
              {settings.currency.code === c.code && <Check size={18} />}
            </motion.button>
          ))}
        </div>
      </SheetModal>

      {/* ===== Language Modal ===== */}
      <SheetModal open={showLanguage} onClose={() => setShowLanguage(false)} title="Select Language">
        <div className="space-y-1 max-h-[400px] overflow-y-auto no-scrollbar">
          {LANGUAGES.map((l) => (
            <motion.button
              key={l.code}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                settings.setLanguage(l.code);
                toast.success(`Language changed to ${l.name}`);
                setShowLanguage(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl ${settings.language === l.code ? "bg-muted" : ""}`}
            >
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-[14px] font-bold uppercase">
                {l.code.slice(0, 2)}
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-medium">{l.name}</p>
                <p className="text-[12px] text-muted-foreground">{l.native}</p>
              </div>
              {settings.language === l.code && <Check size={18} />}
            </motion.button>
          ))}
        </div>
      </SheetModal>

      {/* ===== App Icon Modal ===== */}
      <SheetModal open={showAppIcon} onClose={() => setShowAppIcon(false)} title="App Icon">
        <div className="grid grid-cols-3 gap-3">
          {["Default", "Dark", "Light", "Mono", "Circle", "Square"].map((icon) => (
            <motion.button
              key={icon}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                settings.setAppIcon(icon);
                toast.success(`App icon changed to ${icon}`);
                setShowAppIcon(false);
              }}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${settings.appIcon === icon ? "border-foreground bg-muted" : "border-border"}`}
            >
              <div className={`h-12 w-12 rounded-2xl ${icon === "Light" ? "bg-background border-2 border-border" : icon === "Circle" ? "bg-foreground rounded-full" : icon === "Square" ? "bg-foreground rounded-none" : "bg-foreground"} flex items-center justify-center`}>
                <div className={`h-6 w-6 rounded-full border-2 ${icon === "Light" ? "border-foreground" : "border-background"} flex items-center justify-center`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${icon === "Light" ? "bg-foreground" : "bg-background"}`} />
                </div>
              </div>
              <span className="text-[11px] font-medium">{icon}</span>
            </motion.button>
          ))}
        </div>
      </SheetModal>

      {/* ===== Export Modal ===== */}
      <SheetModal open={showExport} onClose={() => setShowExport(false)} title="Export Data">
        <p className="text-[13px] text-muted-foreground mb-4">
          Download your Trackly data. Includes settings, preferences, and trip configuration.
        </p>
        <div className="space-y-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => handleExport("csv")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted"
          >
            <Download size={18} />
            <div className="flex-1 text-left">
              <p className="text-[15px] font-medium">Export as CSV</p>
              <p className="text-[12px] text-muted-foreground">Comma-separated values</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => handleExport("json")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted"
          >
            <Download size={18} />
            <div className="flex-1 text-left">
              <p className="text-[15px] font-medium">Export as JSON</p>
              <p className="text-[12px] text-muted-foreground">Structured data format</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </motion.button>
        </div>
      </SheetModal>

      {/* ===== What's New Modal (admin-controlled via RemoteConfig key "whats_new") ===== */}
      <SheetModal open={showWhatsNew} onClose={() => setShowWhatsNew(false)} title={whatsNew?.title ?? "What's New"}>
        {whatsNew && whatsNew.active !== false ? (
          <div className="space-y-4">
            {/* Version hero */}
            <div className="rounded-2xl bg-foreground text-background p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-background/15 flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Latest update</p>
                <p className="text-[20px] font-bold tracking-tight">{whatsNew.version ?? `v${appVersion}`}</p>
                {whatsNew.updated_at && (
                  <p className="text-[11px] opacity-70 mt-0.5">
                    {new Date(whatsNew.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>

            {/* Changelog items */}
            {Array.isArray(whatsNew.items) && whatsNew.items.length > 0 ? (
              <div className="space-y-2">
                {whatsNew.items.map((item: string, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <div className="h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <p className="flex-1 text-[14px] leading-snug">{item}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground text-center py-6">No release notes available.</p>
            )}

            <p className="text-[11px] text-muted-foreground text-center pt-2">
              Trackly v{appVersion} · Managed by admin
            </p>
          </div>
        ) : (
          <div className="py-10 text-center">
            <Sparkles size={28} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-[15px] font-semibold">No updates to show</p>
            <p className="text-[13px] text-muted-foreground mt-1">Check back later for new features.</p>
          </div>
        )}
      </SheetModal>

      {/* ===== Invite Friends Modal ===== */}
      <SheetModal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Friends">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-foreground text-background flex items-center justify-center">
              <Users size={28} />
            </div>
            <p className="text-[16px] font-bold">Invite Friends to Trackly</p>
            <p className="text-[13px] text-muted-foreground text-center max-w-xs">
              Share Trackly with your friends and help them track their daily life better.
            </p>
          </div>

          {/* Link preview box */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
            <span className="text-[13px] flex-1 truncate text-muted-foreground">{referralLink}</span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(referralLink);
                  toast.success("Link copied to clipboard");
                }
              }}
              className="h-9 w-9 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0"
              aria-label="Copy link"
            >
              <Copy size={16} />
            </motion.button>
          </div>

          {/* Share button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.share) {
                navigator.share({
                  title: "Trackly — Premium Daily Life Tracker",
                  text: "Check out Trackly! Track your expenses, habits, notes & more in one beautiful app.",
                  url: referralLink,
                }).catch(() => {});
              } else {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(referralLink);
                  toast.success("Link copied — share it with your friends!");
                }
              }
            }}
            className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-[15px] flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            Share Link
          </motion.button>

          {/* Copy button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(referralLink);
                toast.success("Link copied to clipboard");
              }
            }}
            className="w-full h-12 rounded-xl border border-border text-[15px] font-semibold flex items-center justify-center gap-2"
          >
            <Copy size={18} />
            Copy Link
          </motion.button>
        </div>
      </SheetModal>

      {/* ===== Profile Edit Modal ===== */}
      <SheetModal
        open={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        title="Edit Profile"
      >
        <div className="space-y-4">
          {/* Avatar preview + picker */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-20 w-20 rounded-full bg-foreground text-background flex items-center justify-center text-[32px] font-bold">
              {editAvatar || editName[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {["A", "R", "S", "M", "K", "P", "J", "D"].map((letter) => (
                <button
                  key={letter}
                  onClick={() => setEditAvatar(letter)}
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-[14px] font-bold ${
                    editAvatar === letter ? "bg-foreground text-background" : "bg-muted"
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your name"
              className="w-full h-11 px-3 rounded-xl bg-muted text-[15px] outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Email</label>
            <input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="your@email.com"
              type="email"
              className="w-full h-11 px-3 rounded-xl bg-muted text-[15px] outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Phone</label>
            <input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full h-11 px-3 rounded-xl bg-muted text-[15px] outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Bio</label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={2}
              maxLength={80}
              className="w-full px-3 py-2.5 rounded-xl bg-muted text-[15px] outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{editBio.length}/80</p>
          </div>

          {/* Birthday */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Birthday</label>
            <input
              value={editBirthday}
              onChange={(e) => setEditBirthday(e.target.value)}
              type="date"
              className="w-full h-11 px-3 rounded-xl bg-muted text-[15px] outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-[13px] font-medium mb-1.5">Country</label>
            <input
              value={editCountry}
              onChange={(e) => setEditCountry(e.target.value)}
              placeholder="India"
              className="w-full h-11 px-3 rounded-xl bg-muted text-[15px] outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {/* Save button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              const name = editName.trim() || "User";
              const email = editEmail.trim() || "user@trackly.app";
              const avatar = editAvatar.trim() || name[0]?.toUpperCase() || "?";
              // Clear the Google photo ONLY if the avatar letter was actually
              // changed (a name-only edit keeps the Gmail profile picture).
              const avatarChanged = avatar !== settings.userAvatar;
              settings.setUserProfile(name, email, avatar, editPhone, editBio, editBirthday, editCountry, avatarChanged ? null : undefined);
              toast.success("Profile updated");
              setShowProfileEdit(false);
            }}
            className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-[15px] flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Save Changes
          </motion.button>
        </div>
      </SheetModal>

      {/* ===== Trip History Detail Modal ===== */}
      <SheetModal
        open={showTripHistory && !!selectedTrip}
        onClose={() => { setShowTripHistory(false); setSelectedTrip(null); }}
        title="Trip Details"
      >
        {selectedTrip && (
          <div className="space-y-4">
            {/* Trip header */}
            <div className="flex items-center gap-3 p-4 bg-muted rounded-2xl">
              <div className="h-14 w-14 rounded-2xl bg-background flex items-center justify-center text-[28px]">
                {selectedTrip.flag}
              </div>
              <div className="flex-1">
                <p className="text-[18px] font-bold">{selectedTrip.destination}</p>
                <p className="text-[12px] text-muted-foreground">
                  {selectedTrip.mode === "international" ? "🌍 International" : "🧳 National"} · {selectedTrip.durationDays} day{selectedTrip.durationDays !== 1 ? "s" : ""}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(selectedTrip.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} → {new Date(selectedTrip.endedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-xl">
                <p className="text-[11px] text-muted-foreground font-medium">TOTAL SPENT</p>
                <p className="text-[18px] font-bold mt-1">{selectedTrip.currencySymbol}{selectedTrip.totalSpent.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{selectedTrip.expenseCount} expenses</p>
              </div>
              <div className="p-3 bg-muted rounded-xl">
                <p className="text-[11px] text-muted-foreground font-medium">TOTAL INCOME</p>
                <p className="text-[18px] font-bold mt-1">{selectedTrip.currencySymbol}{selectedTrip.totalIncome.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{selectedTrip.incomeCount} sources</p>
              </div>
            </div>

            {/* More stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-xl">
                <p className="text-[11px] text-muted-foreground font-medium">SHOPPING</p>
                <p className="text-[16px] font-bold mt-1">{selectedTrip.shoppingCount} items</p>
              </div>
              <div className="p-3 bg-muted rounded-xl">
                <p className="text-[11px] text-muted-foreground font-medium">BORROW/LEND</p>
                <p className="text-[16px] font-bold mt-1">{selectedTrip.borrowLendCount} entries</p>
              </div>
            </div>

            {/* Expense list */}
            {selectedTrip.expenses.length > 0 && (
              <div>
                <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Expenses ({selectedTrip.expenses.length})</p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto no-scrollbar">
                  {selectedTrip.expenses.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                      <span className="text-[13px] flex-1 truncate">{e.title}</span>
                      <span className="text-[13px] font-semibold tabular-nums">−{selectedTrip.currencySymbol}{e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delete button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                settings.deleteTripHistory(selectedTrip.id);
                toast.success("Trip deleted from history");
                setShowTripHistory(false);
                setSelectedTrip(null);
              }}
              className="w-full h-11 rounded-xl border border-border text-[14px] font-semibold flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Delete from history
            </motion.button>
          </div>
        )}
      </SheetModal>
    </div>
  );
}

function TripOption({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-border hover:border-foreground/30 transition-colors"
    >
      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-[15px] font-semibold">{label}</p>
        <p className="text-[12px] text-muted-foreground">{description}</p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground" />
    </motion.button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold px-7 mt-6 mb-2">{children}</p>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">{children}</div>
  );
}

function ThemeIcon({ theme }: { theme: string }) {
  return (
    <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
      {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
    </div>
  );
}
