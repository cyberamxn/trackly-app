"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Loader2, Check, AlertCircle, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null = checking, true = ready, false = no session
  const [ready, setReady] = useState<boolean | null>(null);

  // ===== Check for session from the reset link =====
  // Supabase sends the link as: /reset-password#access_token=xxx&type=recovery
  // The detectSessionInUrl:true in client.ts should auto-exchange this for a session.
  // But we need to wait for it to complete before showing the form.
  useEffect(() => {
    let mounted = true;
    let attempts = 0;

    const checkSession = async () => {
      attempts++;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (mounted) setReady(true);
        return;
      }
      // Session not ready yet — retry up to 10 times (1 second each)
      if (attempts < 10) {
        setTimeout(checkSession, 1000);
      } else {
        // Give up after 10 seconds — no session found
        if (mounted) setReady(false);
      }
    };

    // Also listen for auth state changes (in case getSession misses the initial event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        if (session && mounted) setReady(true);
      }
    });

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ===== Auto-redirect after no session =====
  useEffect(() => {
    if (ready === false) {
      const timer = setTimeout(() => router.replace("/app"), 3000);
      return () => clearTimeout(timer);
    }
  }, [ready, router]);

  const handleUpdatePassword = async () => {
    setError(null);
    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword.length > 72) {
      setError("Password must be at most 72 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);

      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace("/app");
      }, 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== Loading state =====
  if (ready === null) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6">
        <Loader2 size={32} className="animate-spin text-foreground mb-4" />
        <p className="text-[14px] text-muted-foreground">Verifying reset link…</p>
        <p className="text-[12px] text-muted-foreground/70 mt-1">Please wait a moment</p>
      </div>
    );
  }

  // ===== No session — show error =====
  if (ready === false) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertCircle size={32} className="text-muted-foreground" />
        </div>
        <h1 className="text-[20px] font-bold tracking-tight text-center">Reset link expired</h1>
        <p className="text-[14px] text-muted-foreground text-center mt-2 max-w-xs">
          This reset link is invalid or has expired. Please request a new password reset link.
        </p>
        <button
          onClick={() => router.replace("/app")}
          className="mt-6 h-12 px-6 rounded-xl bg-foreground text-background font-semibold text-[14px]"
        >
          Back to Login
        </button>
      </div>
    );
  }

  // ===== Success state =====
  if (success) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="h-20 w-20 rounded-full bg-foreground text-background flex items-center justify-center mb-6"
        >
          <Check size={36} strokeWidth={3} />
        </motion.div>
        <h1 className="text-[24px] font-bold tracking-tight text-center">Password Updated!</h1>
        <p className="text-[14px] text-muted-foreground text-center mt-2">
          Your password has been changed successfully. Redirecting to login...
        </p>
      </div>
    );
  }

  // ===== Ready — show form =====
  return (
    <div className="fixed inset-0 bg-background flex flex-col px-6 pt-12 pb-6 overflow-y-auto no-scrollbar">
      <button
        onClick={() => router.replace("/app")}
        className="h-9 w-9 -ml-2 rounded-full hover:bg-muted flex items-center justify-center mb-6"
      >
        <ChevronLeft size={26} />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="h-16 w-16 rounded-3xl bg-foreground text-background flex items-center justify-center mb-4">
          <Lock size={28} />
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">Set New Password</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Enter your new password below. Make it strong!
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm mx-auto"
      >
        <div className="space-y-3">
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full h-14 pl-11 pr-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground"
              maxLength={72}
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) handleUpdatePassword();
              }}
              placeholder="Confirm new password"
              className="w-full h-14 pl-11 pr-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground"
              maxLength={72}
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-[13px] text-red-500">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {newPassword.length > 0 && newPassword.length < 6 && (
          <p className="text-[11px] text-red-500 mt-2 ml-1">
            Password must be at least 6 characters
          </p>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleUpdatePassword}
          disabled={loading || !newPassword || !confirmPassword || newPassword.length < 6 || newPassword !== confirmPassword}
          className="w-full h-14 mt-5 rounded-xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : (
            <>
              <Check size={18} />
              Update Password
            </>
          )}
        </motion.button>

        <p className="text-[12px] text-muted-foreground text-center mt-6">
          After updating, you'll be redirected to login with your new password.
        </p>
      </motion.div>
    </div>
  );
}
