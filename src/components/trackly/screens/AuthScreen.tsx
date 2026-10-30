"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2, ChevronRight, ChevronLeft, KeyRound, HelpCircle, Check, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth";
import { toast } from "sonner";

type Mode = "login" | "signup" | "forgot-password" | "forgot-email";
type OAuthStatus = "checking" | "ok" | "broken" | "unknown";

export function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithUsername, resetPassword, resendSignupEmail, signInWithGoogle, checkUsernameAvailable } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== Google OAuth self-diagnosis =====
  // Supabase allow-list me ye preview URL nahi hai to Google sign-in purani
  // site pe redirect hota hai. App khud detect karke sahi rasta dikhata hai.
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>("unknown");
  const [legalDoc, setLegalDoc] = useState<{ type: "PRIVACY" | "TERMS"; title: string; body: string } | null>(null);
  const [legalLoading, setLegalLoading] = useState(false);

  // Open the live legal document (admin-controlled via /api/public/sync) —
  // users can read Terms & Privacy BEFORE signing up (DPDP notice at collection)
  const openLegal = async (type: "PRIVACY" | "TERMS") => {
    setLegalLoading(true);
    try {
      const res = await fetch("/api/public/sync");
      const data = await res.json();
      const doc = (data?.content?.[type] ?? [])[0];
      if (doc?.body) {
        setLegalDoc({
          type,
          title: doc.title || (type === "PRIVACY" ? "Privacy Policy" : "Terms of Service"),
          body: doc.body,
        });
      } else {
        toast.error("Could not load the document — try again in a moment.");
      }
    } catch {
      toast.error("Could not load the document");
    } finally {
      setLegalLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    setOauthStatus("checking");
    fetch(`/api/auth/oauth-status?origin=${encodeURIComponent(window.location.origin)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setOauthStatus(d.ok === true ? "ok" : d.ok === false ? "broken" : "unknown");
      })
      .catch(() => !cancelled && setOauthStatus("unknown"));
    return () => { cancelled = true; };
  }, []);

  // ===== Debounced username availability check =====
  useEffect(() => {
    if (mode !== "signup" || !username.trim()) {
      setUsernameStatus("idle");
      return;
    }
    const clean = username.trim().toLowerCase();
    if (clean.length < 4) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    usernameCheckRef.current = setTimeout(async () => {
      const result = await checkUsernameAvailable(clean);
      setUsernameStatus(result.available ? "available" : "taken");
    }, 500);
    return () => {
      if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    };
  }, [username, mode, checkUsernameAvailable]);

  const handleSubmit = async () => {
    // ===== LOGIN: accept username OR email =====
    if (mode === "login") {
      if (!emailOrUsername.trim()) {
        toast.error("Username or email is required");
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      setLoading(true);
      try {
        const input = emailOrUsername.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
        const result = isEmail
          ? await signInWithEmail(input, password)
          : await signInWithUsername(input, password);

        if (result.error) {
          const msg = result.error.toLowerCase();
          if (msg.includes("invalid login credentials")) {
            toast.error("Wrong username/email or password. Try again.");
          } else if (msg.includes("not found")) {
            toast.error("Username not found. Check spelling or sign up.");
          } else if (msg.includes("rate limit") || msg.includes("too many")) {
            toast.error("Too many attempts. Please wait a minute.");
          } else {
            toast.error(result.error);
          }
        } else {
          toast.success("Welcome back!");
        }
      } catch {
        toast.error("Network error. Check your connection.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // ===== SIGNUP =====
    if (mode === "signup") {
      if (!name.trim() || name.trim().length < 4) {
        toast.error("Name must be at least 4 characters");
        return;
      }
      if (!username.trim() || username.trim().length < 4) {
        toast.error("Username must be at least 4 characters (a-z, 0-9, _)");
        return;
      }
      if (usernameStatus === "taken") {
        toast.error("Username already taken. Try another.");
        return;
      }
      if (!email.trim()) {
        toast.error("Email is required");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error("Please enter a valid email address");
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      setLoading(true);
      try {
        const result = await signUpWithEmail(email.trim(), password, name.trim(), username.trim());
        if (result.error) {
          const msg = result.error.toLowerCase();
          if (msg.includes("user already registered") || msg.includes("already been registered")) {
            toast.error("This email is already registered. Try logging in.");
          } else if (msg.includes("username") && msg.includes("taken")) {
            toast.error("Username already taken. Try another.");
          } else {
            toast.error(result.error);
          }
        } else {
          toast.success("Account created! Welcome to Trackly.");
        }
      } catch {
        toast.error("Network error. Check your connection.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // ===== FORGOT PASSWORD / EMAIL =====
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Forgot password flow
    if (mode === "forgot-password") {
      setLoading(true);
      try {
        const { error } = await resetPassword(email.trim());
        if (error) {
          if (error.toLowerCase().includes("user not found") || error.toLowerCase().includes("no user")) {
            toast.error("No account found with this email. Sign up first!");
          } else {
            toast.error(error);
          }
        } else {
          toast.success("Password reset link sent! Check your email.", { duration: 6000 });
          setMode("login");
        }
      } catch {
        toast.error("Network error. Try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Forgot email / resend confirmation flow
    if (mode === "forgot-email") {
      setLoading(true);
      try {
        const { error } = await resendSignupEmail(email.trim());
        if (error) {
          if (error.toLowerCase().includes("user not found") || error.toLowerCase().includes("no user")) {
            toast.error("No account found with this email.");
          } else if (error.toLowerCase().includes("already confirmed") || error.toLowerCase().includes("confirmed")) {
            toast.success("Your email is already confirmed! You can login now.");
            setMode("login");
          } else {
            toast.error(error);
          }
        } else {
          toast.success("Confirmation email sent! Check your inbox.", { duration: 6000 });
          setMode("login");
        }
      } catch {
        toast.error("Network error. Try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Forgot email / resend confirmation flow
    setLoading(true);
    try {
      const { error } = await resendSignupEmail(email.trim());
      if (error) {
        if (error.toLowerCase().includes("user not found") || error.toLowerCase().includes("no user")) {
          toast.error("No account found with this email.");
        } else if (error.toLowerCase().includes("already confirmed") || error.toLowerCase().includes("confirmed")) {
          toast.success("Your email is already confirmed! You can login now.");
          setMode("login");
        } else {
          toast.error(error);
        }
      } else {
        toast.success("Confirmation email sent! Check your inbox.", { duration: 6000 });
        setMode("login");
      }
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const isForgotMode = mode === "forgot-password" || mode === "forgot-email";

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto no-scrollbar">
      <div className="min-h-full bg-background flex flex-col items-center justify-center px-6 safe-pt">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/trackly-logo-192.png"
          alt="Trackly logo"
          width={80}
          height={80}
          className="h-20 w-20 rounded-3xl object-cover mx-auto shadow-md"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <h1 className="text-[28px] font-bold tracking-tight">Trackly</h1>
        <p className="text-[14px] text-muted-foreground mt-1">Premium Daily Life Tracker</p>
      </motion.div>

      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm"
      >
        <AnimatePresence mode="wait">
          {/* ===== LOGIN / SIGNUP MODE ===== */}
          {!isForgotMode && (
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 rounded-2xl bg-muted mb-5">
                <button
                  onClick={() => setMode("login")}
                  className={`flex-1 h-11 rounded-xl text-[14px] font-semibold transition-colors ${
                    mode === "login" ? "bg-foreground text-background" : "text-foreground"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setMode("signup")}
                  className={`flex-1 h-11 rounded-xl text-[14px] font-semibold transition-colors ${
                    mode === "signup" ? "bg-foreground text-background" : "text-foreground"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Name field (signup only) */}
              <AnimatePresence mode="wait">
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-3"
                  >
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full name (min 4 characters)"
                        className="w-full h-14 pl-11 pr-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    {mode === "signup" && name.length > 0 && name.length < 4 && (
                      <p className="text-[11px] text-red-500 mt-1 ml-1">Name must be at least 4 characters</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ===== Username field (signup only) with live availability check ===== */}
              <AnimatePresence mode="wait">
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-3"
                  >
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder="Username (min 4, a-z, 0-9, _)"
                        className="w-full h-14 pl-11 pr-10 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground"
                        maxLength={20}
                      />
                      {/* Status indicator */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {usernameStatus === "checking" && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                        {usernameStatus === "available" && <Check size={16} className="text-green-500" />}
                        {usernameStatus === "taken" && <span className="text-red-500 text-[14px]">✕</span>}
                      </div>
                    </div>
                    {usernameStatus === "available" && (
                      <p className="text-[11px] text-green-500 mt-1 ml-1">✓ Username available!</p>
                    )}
                    {usernameStatus === "taken" && (
                      <p className="text-[11px] text-red-500 mt-1 ml-1">✕ Username already taken. Try another.</p>
                    )}
                    {username.length > 0 && username.length < 4 && usernameStatus === "idle" && (
                      <p className="text-[11px] text-muted-foreground mt-1 ml-1">Minimum 4 characters</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email (signup) OR Username/Email (login) */}
              <div className="relative mb-3">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={mode === "login" ? "text" : "email"}
                  value={mode === "login" ? emailOrUsername : email}
                  onChange={(e) => mode === "login" ? setEmailOrUsername(e.target.value) : setEmail(e.target.value)}
                  placeholder={mode === "login" ? "Username or email" : "Email address"}
                  className="w-full h-14 pl-11 pr-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground"
                />
              </div>

              {/* Password */}
              <div className="relative mb-3">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) handleSubmit();
                  }}
                  placeholder="Password (min 6 characters)"
                  className="w-full h-14 pl-11 pr-12 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && password.length < 6 && (
                <p className="text-[11px] text-red-500 mb-3 ml-1">Password must be at least 6 characters</p>
              )}

              {/* Forgot options — only on login mode */}
              {mode === "login" && (
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => { setMode("forgot-password"); setEmail(""); }}
                    className="text-[13px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <KeyRound size={11} />
                    Forgot password?
                  </button>
                  <button
                    onClick={() => { setMode("forgot-email"); setEmail(""); }}
                    className="text-[13px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <HelpCircle size={11} />
                    Didn't get email?
                  </button>
                </div>
              )}

              {/* Submit button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={loading || (mode === "signup" && (name.trim().length < 4 || username.trim().length < 4 || usernameStatus === "taken" || usernameStatus === "checking")) || (mode === "login" && !emailOrUsername.trim()) || password.length < 6}
                className="w-full h-14 rounded-xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Login" : "Create Account"}
                    <ChevronRight size={18} />
                  </>
                )}
              </motion.button>

              {/* ===== OR divider ===== */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[12px] text-muted-foreground font-medium">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* ===== Google Sign-In ===== */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={async () => {
                  setLoading(true);
                  const { error } = await signInWithGoogle();
                  if (error) {
                    toast.error(error);
                    setLoading(false);
                  }
                  // On success, Supabase redirects — no need to handle here
                }}
                disabled={loading}
                className="w-full h-14 rounded-xl border border-border bg-background text-foreground font-semibold text-[15px] flex items-center justify-center gap-3 disabled:opacity-40 hover:bg-muted/50 transition-colors"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <GoogleIcon />
                    {mode === "login" ? "Continue with Google" : "Sign up with Google"}
                  </>
                )}
              </motion.button>

              {/* ===== OAuth self-diagnosis card ===== */}
              {oauthStatus === "broken" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
                >
                  <div className="flex items-start gap-2">
                    <ShieldAlert size={15} className="text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-[12px] leading-[1.5] text-foreground/90">
                      <span className="font-semibold text-amber-500">Google sign-in is misconfigured for this preview URL.</span>{" "}
                      After Google it may land you on an old page. Please sign in with your email or username below instead.
                    </div>
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}

          {/* ===== FORGOT PASSWORD MODE ===== */}
          {mode === "forgot-password" && (
            <motion.div
              key="forgot-password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Back button */}
              <button
                onClick={() => setMode("login")}
                className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ChevronLeft size={14} />
                Back to login
              </button>

              <div className="h-14 w-14 rounded-2xl bg-foreground text-background flex items-center justify-center mb-4">
                <KeyRound size={24} />
              </div>
              <h2 className="text-[22px] font-bold tracking-tight">Forgot Password?</h2>
              <p className="text-[13px] text-muted-foreground mt-1 mb-5">
                Enter your email and we'll send you a reset link.
              </p>

              <div className="relative mb-4">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) handleSubmit();
                  }}
                  placeholder="Your registered email"
                  className="w-full h-14 pl-11 pr-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={loading || !email.trim()}
                className="w-full h-14 rounded-xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>
                    <Mail size={16} />
                    Send Reset Link
                  </>
                )}
              </motion.button>

              <p className="text-[12px] text-muted-foreground text-center mt-4">
                Check your email (including spam folder) for the reset link.
              </p>
            </motion.div>
          )}

          {/* ===== FORGOT EMAIL / RESEND CONFIRMATION ===== */}
          {mode === "forgot-email" && (
            <motion.div
              key="forgot-email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Back button */}
              <button
                onClick={() => setMode("login")}
                className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ChevronLeft size={14} />
                Back to login
              </button>

              <div className="h-14 w-14 rounded-2xl bg-foreground text-background flex items-center justify-center mb-4">
                <HelpCircle size={24} />
              </div>
              <h2 className="text-[22px] font-bold tracking-tight">Didn't get confirmation?</h2>
              <p className="text-[13px] text-muted-foreground mt-1 mb-5">
                Enter your email and we'll resend the signup confirmation link.
              </p>

              <div className="relative mb-4">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) handleSubmit();
                  }}
                  placeholder="Your registered email"
                  className="w-full h-14 pl-11 pr-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={loading || !email.trim()}
                className="w-full h-14 rounded-xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>
                    <Check size={16} />
                    Resend Confirmation
                  </>
                )}
              </motion.button>

              <p className="text-[12px] text-muted-foreground text-center mt-4">
                If your email is already confirmed, we'll let you know you can login.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer */}
      {!isForgotMode && (
        <p className="text-[12px] text-muted-foreground mt-8 text-center max-w-xs">
          By continuing, you agree to Trackly's{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground font-medium"
            onClick={() => openLegal("TERMS")}
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground font-medium"
            onClick={() => openLegal("PRIVACY")}
          >
            Privacy Policy
          </button>
          .
        </p>
      )}

      {/* Legal document viewer — notice at collection (DPDP Act 2023) */}
      {legalDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setLegalDoc(null)}>
          <div
            className="bg-background w-full sm:max-w-md max-h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
              <p className="text-[15px] font-semibold truncate">{legalDoc.title}</p>
              <button type="button" onClick={() => setLegalDoc(null)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">
              {legalDoc.body}
            </div>
          </div>
        </div>
      )}
      {legalLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <Loader2 size={22} className="animate-spin text-white" />
        </div>
      )}
      </div>
    </div>
  );
}

// ===== Google Icon (official SVG) =====
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
