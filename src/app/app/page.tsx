"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/trackly/AppShell";
import { AuthScreen } from "@/components/trackly/screens/AuthScreen";
import { Onboarding } from "@/components/trackly/screens/Onboarding";
import { useAuth } from "@/lib/supabase/auth";
import { loadUserDataFromSupabase, clearAllLocalData } from "@/lib/supabase/dataSync";
import { claimStoredReferral, activateReferral } from "@/lib/referrals/client";
import { seedStarterContent } from "@/lib/trackly/seed";
import { useSettings } from "@/lib/trackly/settings";
import { useAppData } from "@/lib/trackly/appData";
import { useOfficeData } from "@/lib/trackly/officeData";
import { useStudentData } from "@/lib/trackly/studentData";
import { TourOverlay as TutorialOverlay, shouldShowTour as shouldShowTutorial } from "@/components/trackly/TutorialOverlay";
import { Loader2 } from "lucide-react";

const ONBOARDING_SEEN_KEY = "trackly-onboarding-seen";

export default function Home() {
  const { user, loading } = useAuth();
  const dataLoadedRef = useRef(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Check for "replay onboarding" flag from Settings
  const forceOnboarding = (() => {
    if (!mounted) return false;
    const force = sessionStorage.getItem("trackly-force-onboarding");
    if (force === "1") {
      sessionStorage.removeItem("trackly-force-onboarding");
      return true;
    }
    return false;
  })();

  const handleOnboardingDone = () => {
    localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    window.location.reload();
  };

  // ===== ALL useEffect hooks MUST be before any return statements =====

  // Handle auth state changes.
  // NOTE: OAuth callback routing (recovery links, OAuth errors, tokens
  // landing on non-root pages) is handled globally by AuthProvider in
  // src/lib/supabase/auth.tsx — routeAuthCallback().
  useEffect(() => {
    if (!mounted) return;

    if (user && !dataLoadedRef.current) {
      dataLoadedRef.current = true;

      // Clear app data stores (NOT onboarding flags) to remove any stale data
      // from demo page or previous user session.
      // NOTE: archived* arrays are intentionally NOT cleared here — they are
      // device-local (persisted to localStorage) and must survive reloads.
      useAppData.setState({
        expenses: [], incomes: [], shopping: [], borrowLend: [],
        habits: [], notes: [], calendarEvents: [],
        tripSnapshot: null, studentSnapshot: null, modeBackup: null,
      });

      const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      const email = user.email || "";
      const firstLetter = fullName.charAt(0).toUpperCase();
      // Google sign-in → user ki asli Gmail profile picture as default DP.
      // (Letter avatar is the fallback when there is no photo.)
      const meta = (user.user_metadata || {}) as Record<string, string>;
      const googleAvatar = meta.avatar_url || meta.picture || null;

      useSettings.setState({
        userName: fullName,
        userEmail: email,
        userAvatar: firstLetter,
        userAvatarUrl: googleAvatar,
        studentMode: false,
        officeMode: false,
        studentPaused: false,
        officePaused: false,
        tripMode: "none",
        tripDestination: "",
        tripStartedAt: null,
        studentStartedAt: null,
        officeStartedAt: null,
      });

      useOfficeData.setState({
        tasks: [], meetings: [], attendance: [], salary: [],
        bills: [], savingsGoals: [], dailyGoals: [], pomodoros: [],
      });

      useStudentData.setState({
        classes: [], assignments: [], subjects: [], exams: [],
        books: [], messMeals: [], hostelBills: [], studyGoals: [], routine: [],
      });

      // Now load real user data from Supabase — once loaded, make sure the
      // app opens with starter habits & tasks (once per user, deduped)
      loadUserDataFromSupabase(user.id).then(() => {
        seedStarterContent(user.id);
        // Referral flow (referee side): claim any stored invite code, then
        // try completing it — real data may already exist (multi-device,
        // returning user). Both are no-ops without a stored code.
        claimStoredReferral().then(() => activateReferral(true));
      });

      // Mark onboarding as complete for logged-in users
      localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
      localStorage.setItem("trackly-onboarding-complete", "1");

      // Show tutorial for new users (only once)
      if (shouldShowTutorial()) {
        setShowTutorial(true);
      }
    } else if (!user && !loading) {
      dataLoadedRef.current = false;
      clearAllLocalData();
    }
  }, [user, loading, mounted]);

  // ===== ALL return statements AFTER all hooks =====

  // SSR: spinner
  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    );
  }

  // Force onboarding
  if (forceOnboarding && user) {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden">
        <div className="absolute left-0 right-0 bottom-0 bg-background app-safe-top">
          <Onboarding onDone={handleOnboardingDone} />
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    );
  }

  // Logged in user → app
  if (user) {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden">
        {/* Content starts below the iOS status-bar / notch area (black
            background shows through — matches the app theme). */}
        <div className="absolute left-0 right-0 bottom-0 bg-background app-safe-top">
          <AppShell />
          {showTutorial && (
            <TutorialOverlay onComplete={() => setShowTutorial(false)} />
          )}
        </div>
      </div>
    );
  }

  // Not logged in → check onboarding
  const showOnboarding = typeof window !== "undefined" && !localStorage.getItem(ONBOARDING_SEEN_KEY);

  if (showOnboarding) {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden">
        <div className="absolute left-0 right-0 bottom-0 bg-background app-safe-top">
          <Onboarding onDone={handleOnboardingDone} />
        </div>
      </div>
    );
  }

  // Login screen
  return <AuthScreen />;
}
