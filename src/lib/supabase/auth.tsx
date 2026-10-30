"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "./client";
import { isStandalonePwa, googleSignInViaBrowser } from "./pwaAuth";

// ===== URL snapshot at import time =====
// supabase-js v2 clears window.location.hash right after processing an
// OAuth / recovery callback. To still detect "this page load was an auth
// callback" AFTER processing, the URL is captured here at module import —
// guaranteed to run before any auth processing starts.
const INITIAL_HASH =
  typeof window !== "undefined" ? window.location.hash : "";
const INITIAL_SEARCH =
  typeof window !== "undefined" ? window.location.search : "";
const INITIAL_PATHNAME =
  typeof window !== "undefined" ? window.location.pathname : "/";

// Parse the captured hash/search once.
const INITIAL_HASH_PARAMS = new URLSearchParams(
  INITIAL_HASH.length > 1 ? INITIAL_HASH.slice(1) : ""
);
const INITIAL_SEARCH_PARAMS = new URLSearchParams(INITIAL_SEARCH);

// ===== Global auth-callback router =====
// OAuth (Google) and password-recovery links can land on ANY page of the
// app. When the current origin is not in the Supabase dashboard allow-list,
// the callback falls back to the dashboard "Site URL" — which for this
// project lands on /demo (the marketing page), leaving the user stuck
// there even though the sign-in actually succeeded.
// This router detects auth tokens / errors in the landed URL and moves the
// user to the right page, no matter which page the callback landed on.
const routeAuthCallback = (session: Session | null): boolean => {
  if (typeof window === "undefined") return false;

  const isResetPage = INITIAL_PATHNAME === "/reset-password";
  // The app lives at /app now; "/" is the marketing/demo landing.
  const isAppRoot = INITIAL_PATHNAME === "/app" || INITIAL_PATHNAME === "/";
  const isManagedPage =
    INITIAL_PATHNAME === "/6207" || INITIAL_PATHNAME === "/install" ||
    INITIAL_PATHNAME.startsWith("/app/auth/bridge");

  // Never interfere with pages that have their own auth system.
  if (isManagedPage) return false;

  // 1) Recovery link (password reset email) → route to the reset page.
  //    The session is already saved by supabase; the reset page picks it up.
  if (INITIAL_HASH_PARAMS.get("type") === "recovery" && !isResetPage) {
    window.location.replace(`/reset-password${INITIAL_HASH}`);
    return true;
  }

  // 2) OAuth error (Supabase sends ?error=… or #error=…) → clean URL + toast.
  const err =
    INITIAL_SEARCH_PARAMS.get("error") || INITIAL_HASH_PARAMS.get("error");
  if (err) {
    const errCode =
      INITIAL_SEARCH_PARAMS.get("error_code") ||
      INITIAL_HASH_PARAMS.get("error_code") ||
      "";
    const errDesc =
      INITIAL_SEARCH_PARAMS.get("error_description") ||
      INITIAL_HASH_PARAMS.get("error_description") ||
      "";
    let msg = "Sign-in failed. Please try again.";
    if (err === "access_denied") {
      msg = "Google sign-in was cancelled.";
    } else if (
      errCode === "identity_already_exists" ||
      errDesc.toLowerCase().includes("already") ||
      err.toLowerCase().includes("already")
    ) {
      msg = "This email already has a password account. Sign in with your password instead.";
    } else if (err === "server_error" || err === "bad_oauth_callback") {
      msg = "Google sign-in failed on the server. Please try again in a moment.";
    }
    window.history.replaceState({}, "", window.location.pathname);
    toast.error(msg, { duration: 6000 });
    return true;
  }

  // 3) Successful OAuth callback (Google etc.) that landed on a page other
  //    than the app root (e.g. the landing page / Site-URL fallback). The
  //    session is already saved — move the user into the app so the
  //    sign-in completes.
  const tokensInUrl = Boolean(
    INITIAL_HASH_PARAMS.get("access_token") ||
      INITIAL_HASH_PARAMS.get("provider_token") ||
      INITIAL_SEARCH_PARAMS.get("code")
  );
  if (tokensInUrl && session && !isAppRoot && !isResetPage) {
    window.location.replace("/app");
    return true;
  }

  return false;
};

// ===== Auto profile creation ("Trackly account") =====
// Google OAuth / OTP / any sign-in se aaye naye users ke liye profiles row
// ensure karta hai. DB trigger dashboard me run nahi hua tha, isliye app-side
// idempotent ensure — profile missing ho to bana do (RLS: apna hi insert allowed).
const ensureProfile = async (user: User) => {
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) return;

    // Username base: user_metadata.username > full_name > email prefix
    const meta = (user.user_metadata || {}) as Record<string, string>;
    const rawBase =
      meta.username || meta.full_name || (user.email || "user").split("@")[0];
    let base = rawBase.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    if (base.length < 4) {
      base = (base + Math.random().toString(36).slice(2, 10)).slice(0, 20);
    }

    const fullName = meta.full_name || meta.name || (user.email || "").split("@")[0] || "User";

    // Username conflict → random suffix ke saath retry
    for (let attempt = 0; attempt < 3; attempt++) {
      const username =
        attempt === 0 ? base : `${base.slice(0, 16)}${Math.floor(1000 + Math.random() * 9000)}`;
      const { error } = await supabase.from("profiles").insert({
        user_id: user.id,
        username,
        email: user.email || "",
        full_name: fullName,
        avatar_url: meta.avatar_url || meta.picture || null,
      });
      if (!error) return;
      // duplicate_username / unique violation → retry; other errors → abort
      if (!error.message.toLowerCase().includes("duplicate")) return;
    }
  } catch (e) {
    // Profile ensure failure login ko block nahi karna chahiye
    console.log("[Auth] ensureProfile:", e);
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name: string, username: string) => Promise<{ error: string | null }>;
  signInWithUsername: (username: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  resendSignupEmail: (email: string) => Promise<{ error: string | null }>;
  checkUsernameAvailable: (username: string) => Promise<{ available: boolean; reason?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start with null/true — SSR safe, no localStorage access during render
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Client-only: read session from Supabase.
    // getSession also processes OAuth/recovery callbacks present in the
    // URL (detectSessionInUrl) — route them once processing is done.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      initializedRef.current = true;
      // Trackly account ensure (Google users ke liye profile missing ho sakta hai)
      if (session?.user) ensureProfile(session.user);
      // Catch callbacks that were processed during getSession or fired
      // before the listener below was attached.
      routeAuthCallback(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!initializedRef.current) return;

        // ===== PASSWORD RECOVERY FLOW =====
        // When user clicks the reset link in email, Supabase fires
        // PASSWORD_RECOVERY event with a valid session. Redirect to
        // /reset-password so the dedicated page can handle password update.
        // (Guard: never redirect when already on the reset page.)
        if (
          event === "PASSWORD_RECOVERY" &&
          session &&
          window.location.pathname !== "/reset-password"
        ) {
          window.location.href = `/reset-password${window.location.hash}`;
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Fresh sign-in (Google/OTP/password) → Trackly profile ensure
        if (session?.user) ensureProfile(session.user);

        // Fresh OAuth sign-in that landed on a non-root page (e.g. /demo).
        if (event === "SIGNED_IN" && session) {
          routeAuthCallback(session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithEmail = async (email: string, password: string, name: string, username: string) => {
    // First check username availability
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 4) {
      return { error: "Username must be at least 4 characters" };
    }

    // Check via API
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(cleanUsername)}`);
      const data = await res.json();
      if (!data.available) {
        return { error: data.reason || "Username already taken" };
      }
    } catch {
      // If check fails, proceed anyway — trigger will handle uniqueness
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, username: cleanUsername } },
    });
    if (error) return { error: error.message };
    if (data.user && !data.session) {
      return { error: "Check your email for confirmation link." };
    }

    // If we have a session (auto-confirm), insert profile
    if (data.session && data.user) {
      try {
        await supabase.from("profiles").insert({
          user_id: data.user!.id,
          username: cleanUsername,
          email: email,
          full_name: name,
        });
      } catch (e: any) {
        // Profile might already be created by trigger — that's OK
        console.log("[Auth] Profile insert:", e.message);
      }
    }

    return { error: null };
  };

  // ===== Login with username (lookup email, then login) =====
  const signInWithUsername = async (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase();

    // Look up email by username — SECURE PATH first (get_login_email RPC,
    // active once the profiles RLS lockdown SQL from the security report is
    // applied), then legacy direct-select fallback (works while profiles
    // is still world-readable). Same UX either way.
    let email: string | null = null;
    try {
      const { data: rpcEmail } = await supabase.rpc("get_login_email", { uname: cleanUsername });
      if (typeof rpcEmail === "string" && rpcEmail) email = rpcEmail;
    } catch {
      // RPC not deployed yet — fall through to legacy path
    }
    if (!email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", cleanUsername)
        .limit(1)
        .maybeSingle();
      email = profile?.email ?? null;
    }

    if (!email) {
      return { error: "Username not found. Check spelling or sign up." };
    }

    // Now login with email + password
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  };

  // ===== Check username availability =====
  const checkUsernameAvailable = async (username: string): Promise<{ available: boolean; reason?: string }> => {
    const clean = username.trim().toLowerCase();
    if (clean.length < 4) return { available: false, reason: "Minimum 4 characters" };
    if (clean.length > 20) return { available: false, reason: "Maximum 20 characters" };
    if (!/^[a-z0-9_]+$/.test(clean)) return { available: false, reason: "Only a-z, 0-9, _" };

    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(clean)}`);
      const data = await res.json();
      return { available: data.available, reason: data.reason };
    } catch {
      return { available: true }; // Allow on error
    }
  };

  const signInWithGoogle = async () => {
    // ===== Installed PWA (iPhone home-screen app) =====
    // The PWA has its own cookie jar — Google's account picker never shows
    // inside it (user is forced through the full email+password form).
    // Instead, open Google in the real browser and relay the session back.
    if (isStandalonePwa()) {
      return googleSignInViaBrowser({
        onStatus: (msg) => toast(msg, { duration: 8000 }),
      });
    }

    // ===== Normal browser flow =====
    // NOTE: trailing slash — wildcard allow-list entries (origin/**) match
    // "origin/" but not the bare origin. If this origin still isn't
    // allow-listed, Supabase falls back to the Site URL; the global
    // routeAuthCallback in this file then routes the user into the app.
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/app` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // ===== Forgot Password =====
  // Sends a password reset email with a link that redirects to /reset-password
  const resetPassword = async (email: string) => {
    const redirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      // Supabase project-wide hourly email cap (default ~2/hour) — throttle,
      // app bug nahi. User ko wait karne ko bolna hai ya limit badhani hai.
      if (msg.includes("email rate limit") || (msg.includes("rate limit") && msg.includes("email"))) {
        return { error: "Too many reset emails were sent recently. Please wait about 30–60 minutes, then try again." };
      }
      if (msg.includes("too many") || msg.includes("per minute") || msg.includes("seconds")) {
        return { error: "You're doing that too often. Please wait a minute and try again." };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  // ===== Resend Signup Confirmation Email =====
  // For users who signed up but didn't confirm their email
  const resendSignupEmail = async (email: string) => {
    const { data, error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithEmail, signUpWithEmail, signInWithUsername, signInWithGoogle, signOut, resetPassword, resendSignupEmail, checkUsernameAvailable }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
