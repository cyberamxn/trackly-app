"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// ===================================================================
// PWA Auth Bridge — /app/auth/bridge/<ticket>
// ===================================================================
// Opened IN THE BROWSER (Safari/Chrome) as the Google OAuth redirect
// target when sign-in was started from the installed PWA. Reads the
// session tokens from the URL hash (implicit flow), hands them to the
// relay so the waiting PWA can pick them up, and also signs this browser
// in (nice side-effect: opening trackly.today here shows the app too).
// ===================================================================

type Phase = "reading" | "sending" | "done" | "error";

export default function AuthBridgePage() {
  const params = useParams<{ ticket: string }>();
  const ticket = String(params?.ticket ?? "");
  const [phase, setPhase] = useState<Phase>("reading");
  const [errorMsg, setErrorMsg] = useState("");
  const postedRef = useRef(false);

  useEffect(() => {
    if (!ticket || postedRef.current) return;

    // Tokens arrive in the hash (implicit flow):
    // #access_token=...&refresh_token=...  (or #error=... on failure)
    const readHash = () => {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      return new URLSearchParams(hash);
    };

    const process = async () => {
      const h = readHash();

      // OAuth error (user cancelled etc.)
      if (h.get("error")) {
        setErrorMsg(
          h.get("error_description") || "Google sign-in was cancelled."
        );
        setPhase("error");
        return;
      }

      const accessToken = h.get("access_token");
      const refreshToken = h.get("refresh_token");
      if (accessToken && refreshToken) {
        await deliver(accessToken, refreshToken);
        return;
      }

      // Tokens not in the hash. Two common causes:
      // 1) The main Supabase client (detectSessionInUrl on load) already
      //    consumed the hash, saved the session and cleared the URL — by the
      //    time this effect runs, the hash is empty.
      // 2) The redirect came back on the PKCE/code path (?code=…) and the
      //    exchange is still in flight.
      // In BOTH cases the session lands in storage a moment later. The old
      // code checked storage exactly once, found nothing and declared
      // "Sign-in didn't complete" — even though the sign-in had actually
      // succeeded (tapping "Go to Trackly" opened the account). Wait for the
      // session instead of erroring instantly.
      await waitForSession();
    };

    // Poll storage (and listen for auth events) until a session appears or
    // the deadline passes. Resolves via deliver() on success.
    const waitForSession = () => {
      const DEADLINE_MS = 10_000;
      const POLL_MS = 400;
      const startedAt = Date.now();

      const valid = (s: any) =>
        s?.access_token && s?.refresh_token ? s : null;

      let settled = false;
      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let unsub: (() => void) | null = null;

      const fail = () => {
        if (settled) return;
        settled = true;
        if (pollTimer) clearInterval(pollTimer);
        unsub?.();
        setErrorMsg(
          "No sign-in data found in this page. Please try again from the Trackly app."
        );
        setPhase("error");
      };

      const succeed = (s: { access_token: string; refresh_token: string }) => {
        if (settled) return;
        settled = true;
        if (pollTimer) clearInterval(pollTimer);
        unsub?.();
        deliver(s.access_token, s.refresh_token);
      };

      // Auth events fire the instant the code exchange / hash save lands.
      try {
        const { data: listener } = supabase.auth.onAuthStateChange(
          (event, sess) => {
            const s = valid(sess);
            if (
              s &&
              (event === "SIGNED_IN" ||
                event === "INITIAL_SESSION" ||
                event === "TOKEN_REFRESHED")
            ) {
              succeed(s);
            }
          }
        );
        unsub = () => listener.subscription.unsubscribe();
      } catch {
        // listener optional — polling below still works
      }

      const tick = async () => {
        if (settled) return;
        const { data } = await supabase.auth.getSession();
        const s = valid(data?.session);
        if (s) {
          succeed(s);
        } else if (Date.now() - startedAt > DEADLINE_MS) {
          fail();
        }
      };

      pollTimer = setInterval(tick, POLL_MS);
      tick(); // first try immediately
    };

    const deliver = async (accessToken: string, refreshToken: string) => {
      postedRef.current = true;
      setPhase("sending");
      try {
        // 1) Sign this browser in as well (harmless bonus, keeps Safari
        //    and the PWA in sync for future visits)
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        // 2) Hand the tokens to the relay for the waiting PWA
        const res = await fetch("/api/public/pwa-relay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticket,
            session: { access_token: accessToken, refresh_token: refreshToken },
          }),
        });
        if (!res.ok) throw new Error(`relay ${res.status}`);

        // 3) Clean the URL (tokens should not stay in the address bar)
        window.history.replaceState({}, "", "/app");
        setPhase("done");
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Could not complete sign-in handoff.");
        setPhase("error");
      }
    };

    process();
  }, [ticket]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-8 text-center safe-pt">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm"
      >
        {phase === "reading" || phase === "sending" ? (
          <>
            <div className="h-16 w-16 rounded-3xl bg-white flex items-center justify-center mx-auto mb-6">
              <Loader2 size={28} className="animate-spin text-black" />
            </div>
            <h1 className="text-[22px] font-bold text-white tracking-tight">
              Completing sign-in…
            </h1>
            <p className="text-[14px] text-white/60 mt-2 leading-relaxed">
              Handing your Google sign-in back to the Trackly app. This takes a
              second.
            </p>
          </>
        ) : phase === "done" ? (
          <>
            <div className="h-16 w-16 rounded-3xl bg-white flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={30} className="text-black" />
            </div>
            <h1 className="text-[22px] font-bold text-white tracking-tight">
              You&apos;re signed in!
            </h1>
            <p className="text-[14px] text-white/60 mt-2 leading-relaxed">
              Now switch back to the <span className="text-white font-semibold">Trackly app</span> on
              your home screen — it will open signed in automatically.
            </p>
            <a
              href="/app"
              className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-black text-[14px] font-bold hover:scale-[1.03] transition-transform"
            >
              Continue in this browser <ArrowRight size={16} />
            </a>
          </>
        ) : (
          <>
            <div className="h-16 w-16 rounded-3xl bg-white/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={28} className="text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-white tracking-tight">
              Sign-in didn&apos;t complete
            </h1>
            <p className="text-[14px] text-white/60 mt-2 leading-relaxed">
              {errorMsg}
            </p>
            <a
              href="/app"
              className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-black text-[14px] font-bold hover:scale-[1.03] transition-transform"
            >
              Go to Trackly <ArrowRight size={16} />
            </a>
          </>
        )}
      </motion.div>
    </div>
  );
}
