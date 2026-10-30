"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet, Repeat, CalendarClock, StickyNote, ShoppingBag, GraduationCap,
  Plane, Shield, Apple, Play, ArrowRight,
  Bell, LayoutGrid, Settings as SettingsIcon, Calendar as CalendarIcon,
  Sun, Moon, Sparkles, Briefcase, Users, ChevronDown,
} from "lucide-react";
import { IPhoneFrame } from "@/components/trackly/IPhoneFrame";
import { DemoAppShell } from "@/components/trackly/DemoAppShell";
import { useTheme } from "@/components/trackly/ThemeProvider";
import { useTracklyStore } from "@/lib/trackly/store";
import { supabase } from "@/lib/supabase/client";
import { captureRefFromUrl, getStoredRef } from "@/lib/referrals/client";
import { FAQS, type LandingConfig } from "./landingShared";

// Types + static content (DEFAULT_FEATURES, FAQS, LandingConfig) live in
// ./landingShared so the SERVER page can read them as plain data too —
// exports of a "use client" module become client references on the server.
export type { Feature, Stat, Screenshot, LandingConfig } from "./landingShared";

// (icon map used for admin-configured + default features alike)
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  wallet: Wallet,
  repeat: Repeat,
  "calendar-clock": CalendarClock,
  "sticky-note": StickyNote,
  "shopping-bag": ShoppingBag,
  "graduation-cap": GraduationCap,
  plane: Plane,
  shield: Shield,
  briefcase: Briefcase,
  users: Users,
  sparkles: Sparkles,
};

// ===== Default features live in ./landingShared (shared with the server
// page so they render into the raw HTML for crawlers). =====

// ===== FAQ lives in ./landingShared (mirrored 1:1 by the JSON-LD
// FAQPage schema on the server page, per Google's guidelines). =====

interface PillDef {
  label: string;
  screen: string;
  icon?: React.ReactNode;
}
const PILLS: PillDef[] = [
  { label: "Dashboard", screen: "dashboard" },
  { label: "Expenses", screen: "expenses" },
  { label: "Habits", screen: "habits" },
  { label: "Notes", screen: "notes" },
  { label: "Shopping", screen: "shopping" },
  { label: "Borrow/Lend", screen: "borrow" },
  { label: "Routine", screen: "routine" },
  { label: "Calendar", screen: "calendar", icon: <CalendarIcon size={12} /> },
  { label: "Reports", screen: "reports" },
  { label: "Alerts", screen: "notifications", icon: <Bell size={12} /> },
  { label: "Widgets", screen: "widgets", icon: <LayoutGrid size={12} /> },
  { label: "Settings", screen: "settings", icon: <SettingsIcon size={12} /> },
];

export default function LandingClient({ initialConfig }: { initialConfig: LandingConfig }) {
  // SSR defaults come from the server component (present in the raw HTML for
  // crawlers); the admin-panel config fetched below only overrides the keys
  // it actually defines, so the page never renders empty.
  const [config, setConfig] = useState<LandingConfig>(initialConfig);
  const { theme, toggle } = useTheme();
  const { screen, setScreen } = useTracklyStore();

  // ===== Referral welcome banner (friend's invite link) =====
  // /r/CODE → /?ref=CODE → RefCapture stores it → greet the visitor by
  // the referrer's first name (public validate endpoint, no auth).
  const [refGreet, setRefGreet] = useState<{ name: string | null } | null>(null);
  useEffect(() => {
    const code = getStoredRef();
    if (!code) return;
    fetch(`/api/referrals/validate?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.valid) setRefGreet({ name: j.name ?? null });
      })
      .catch(() => {});
  }, []);

  // ===== Old home-screen installs → straight into the app =====
  // Home-screen installs made BEFORE the app moved to /app still open "/" —
  // ONLY those (standalone PWA display mode) are forwarded to /app.
  // Regular browser visitors stay on the landing page even when signed in
  // (they can click "Open app" whenever they want) — no forced redirect.
  // (Capture any ?ref= FIRST — this effect can race ahead of RefCapture.)
  useEffect(() => {
    captureRefFromUrl();
    const standalone =
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (window.navigator as any).standalone === true; // iOS Safari home-screen
    if (!standalone) return;
    let dead = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!dead && data?.session) window.location.replace("/app");
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, []);

  // NOTE: no scroll-override hacks needed anymore — globals.css no longer
  // locks html/body overflow globally (only /app locks itself via
  // html.app-lock), so this page scrolls naturally as a document.

  // Admin-controlled overrides — defined keys only (never wipe SSR defaults).
  useEffect(() => {
    fetch("/api/public/sync")
      .then((r) => r.json())
      .then((data) => {
        const c = data.config ?? {};
        const next: LandingConfig = {};
        if (c.landing_tagline) next.tagline = c.landing_tagline;
        if (c.landing_hero_title) next.hero_title = c.landing_hero_title;
        if (c.landing_hero_subtitle) next.hero_subtitle = c.landing_hero_subtitle;
        if (c.landing_cta_text) next.cta_text = c.landing_cta_text;
        if (c.landing_ios_url) next.ios_url = c.landing_ios_url;
        if (c.landing_android_url) next.android_url = c.landing_android_url;
        if (Array.isArray(c.landing_features) && c.landing_features.length > 0) next.features = c.landing_features;
        if (Array.isArray(c.landing_stats) && c.landing_stats.length > 0) next.stats = c.landing_stats;
        if (Array.isArray(c.landing_screenshots) && c.landing_screenshots.length > 0) next.screenshots = c.landing_screenshots;
        if (c.landing_footer_text) next.footer_text = c.landing_footer_text;
        if (Object.keys(next).length > 0) setConfig((prev) => ({ ...prev, ...next }));
      })
      .catch(() => {});
  }, []);

  const tagline = config.tagline || "Premium Daily Life Tracker";
  const heroTitle = config.hero_title || "One app for your whole life.";
  const heroSubtitle = config.hero_subtitle ||
    "Expenses, shopping, habits, routines, notes, reminders & analytics — unified in a pure black & white, distraction-free interface.";
  const ctaText = config.cta_text || "Download Trackly";
  const iosUrl = config.ios_url || "https://trackly.today/install";
  // Default to the install guide — the placeholder Play Store listing doesn't
  // exist yet (no native app). Admin config can override with real store URLs
  // the day the native apps ship.
  const androidUrl = config.android_url || "https://trackly.today/install";
  // Uploaded files (admin panel → Config → Demo Page Download Buttons) download in the
  // same tab; internal links open in the same tab; external links in a new tab.
  const linkProps = (url: string) =>
    url.startsWith("/api/uploads/")
      ? { href: url, download: true as const }
      : url.startsWith("/")
        ? { href: url }
        : { href: url, target: "_blank" as const, rel: "noopener noreferrer" };
  const features = config.features || [];
  const stats = config.stats || [];
  const screenshots = config.screenshots || [];
  const footerText = config.footer_text || "by ahexa.studio · © 2026. All rights reserved.";

  const activeScreenshotIndex = PILLS.findIndex((p) => p.screen === screen);
  const activeScreenshot = screenshots[activeScreenshotIndex >= 0 ? activeScreenshotIndex : 0];

  return (
    <div
      className={`min-h-screen w-full overflow-x-hidden ${theme === "dark" ? "bg-black text-white" : "bg-neutral-50 text-black"}`}
    >
      {/* Sticky top bar */}
      <header className={`sticky top-0 z-30 backdrop-blur-xl ${theme === "dark" ? "bg-black/70 border-neutral-800/60" : "bg-white/70 border-neutral-200/60"} border-b`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/trackly-logo-192.png"
              alt="Trackly logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-2xl object-cover shadow-sm"
            />
            <span className="text-[18px] font-bold tracking-tight">Trackly</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Primary CTA — the real app lives at /app */}
            <a
              href="/app"
              className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold transition-transform hover:scale-[1.03] bg-black dark:bg-white text-white dark:text-black`}
            >
              Open App <ArrowRight size={14} />
            </a>
            <button
              onClick={toggle}
              className={`h-9 w-9 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-neutral-900" : "bg-neutral-200"}`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Referral welcome banner (friend's invite link) ===== */}
      {refGreet && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-16 z-20 max-w-6xl mx-auto px-5 sm:px-8 pt-4"
        >
          <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${theme === "dark" ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"}`}>
            <span className="text-[22px] shrink-0">🎁</span>
            <p className="flex-1 text-[13px] leading-snug">
              {refGreet.name ? (
                <><b>{refGreet.name}</b> invited you to Trackly —{" "}</>
              ) : (
                <>You've been invited to Trackly —{" "}</>
              )}
              sign up now and get <b>bonus AI messages</b> (you both get them)!
            </p>
            <a
              href="/app"
              className="shrink-0 inline-flex items-center gap-1 h-9 px-4 rounded-full bg-black dark:bg-white text-white dark:text-black text-[12.5px] font-bold hover:scale-[1.03] transition-transform"
            >
              Claim <ArrowRight size={13} />
            </a>
          </div>
        </motion.div>
      )}

      {/* Hero — split layout */}
      <section className="relative px-5 sm:px-8 py-4 sm:py-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={`absolute -top-40 -left-40 h-96 w-96 rounded-full blur-3xl ${theme === "dark" ? "bg-neutral-900/40" : "bg-neutral-200/40"}`} />
          <div className={`absolute -bottom-40 -right-40 h-96 w-96 rounded-full blur-3xl ${theme === "dark" ? "bg-neutral-900/40" : "bg-neutral-200/40"}`} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center gap-4 sm:gap-6 lg:gap-8">
          {/* 1. TOP — Tagline + Headline + Subtitle */}
          <div className="text-center w-full max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`inline-flex items-center gap-2 px-3 h-8 rounded-full border mb-2 ${theme === "dark" ? "bg-neutral-900 border-neutral-800" : "bg-neutral-100 border-neutral-200"}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <span className="text-[12px] font-semibold uppercase tracking-wider">{tagline}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="text-[36px] sm:text-[48px] lg:text-[56px] font-bold tracking-tight leading-[1.02] text-balance"
            >
              {heroTitle.split(" ").map((word, i, arr) => (
                <span key={i}>
                  {i === arr.length - 2 ? (
                    <span className="relative inline-block">
                      <span className="relative z-10">{word}</span>
                      <motion.span
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 100, damping: 18 }}
                        className={`absolute bottom-1 left-0 right-0 h-3 origin-left -z-0 ${theme === "dark" ? "bg-white/15" : "bg-black/10"}`}
                      />
                    </span>
                  ) : word}{" "}
                </span>
              ))}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className={`text-[14px] sm:text-[16px] mt-4 leading-relaxed max-w-xl mx-auto ${theme === "dark" ? "text-neutral-400" : "text-neutral-600"}`}
            >
              {heroSubtitle}
            </motion.p>

          </div>

          {/* 2. MIDDLE — iPhone mockup (centered) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 80, damping: 18 }}
            className="relative flex justify-center scale-[0.72] sm:scale-85 md:scale-95 lg:scale-100 origin-center -my-[118px] sm:-my-[63px] md:-my-[21px] lg:my-0"
          >
            <IPhoneFrame>
              <DemoAppShell />
            </IPhoneFrame>
          </motion.div>

          {/* 3. BOTTOM — Download buttons */}
          <div className="text-center w-full max-w-2xl">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-3"
            >
              {ctaText}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="flex items-center justify-center gap-3 flex-wrap"
            >
              <a {...linkProps(iosUrl)} className="group inline-flex items-center gap-3 h-14 px-6 rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:scale-[1.03] transition-transform">
                <Apple size={26} className="shrink-0" />
                <div className="text-left leading-tight">
                  <p className="text-[10px] uppercase tracking-wider opacity-70 font-medium">Download on the</p>
                  <p className="text-[17px] font-bold tracking-tight">App Store</p>
                </div>
              </a>
              <a {...linkProps(androidUrl)} className="group inline-flex items-center gap-3 h-14 px-6 rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:scale-[1.03] transition-transform">
                <Play size={22} className="shrink-0 fill-current" />
                <div className="text-left leading-tight">
                  <p className="text-[10px] uppercase tracking-wider opacity-70 font-medium">Get it on</p>
                  <p className="text-[17px] font-bold tracking-tight">Google Play</p>
                </div>
              </a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[12px] text-neutral-500 mt-4"
            >
              Free download · No credit card required · Works offline
            </motion.p>
          </div>
        </div>
      </section>

      {/* Jump-to-screen pills */}
      <section className="px-5 sm:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">Tap a screen to preview</p>
            <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight">Explore every corner of Trackly.</h2>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
            {PILLS.map((p) => {
              const active = screen === p.screen;
              return (
                <motion.button
                  key={p.screen}
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => setScreen(p.screen as any)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border flex items-center gap-1.5 transition-colors ${
                    active
                      ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                      : theme === "dark"
                        ? "border-neutral-800 text-neutral-300 hover:border-neutral-600"
                        : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {p.icon}
                  {p.label}
                </motion.button>
              );
            })}
          </div>
          {activeScreenshot && (
            <motion.div
              key={activeScreenshotIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className={`mt-8 mx-auto max-w-2xl rounded-3xl border p-6 text-center ${theme === "dark" ? "bg-neutral-950 border-neutral-800" : "bg-white border-neutral-200"}`}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
                  <Sparkles size={14} />
                </div>
                <h3 className="text-[18px] font-bold tracking-tight">{activeScreenshot.title}</h3>
              </div>
              <p className={`text-[14px] leading-relaxed ${theme === "dark" ? "text-neutral-400" : "text-neutral-600"}`}>{activeScreenshot.description}</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Stats */}
      {stats.length > 0 && (
        <section className="px-5 sm:px-8 pb-16">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-2xl border p-5 text-center ${theme === "dark" ? "bg-neutral-950 border-neutral-800" : "bg-white border-neutral-200"}`}
              >
                <p className="text-[28px] sm:text-[32px] font-bold tracking-tight text-display tabular-nums">{s.value}</p>
                <p className="text-[11px] uppercase tracking-wider font-semibold mt-1 text-neutral-500">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <section className="px-5 sm:px-8 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-3">Everything inside</p>
              <h2 className="text-[32px] sm:text-[44px] font-bold tracking-tight leading-tight text-balance">One app to replace them all.</h2>
              <p className={`text-[15px] mt-3 max-w-xl mx-auto ${theme === "dark" ? "text-neutral-400" : "text-neutral-600"}`}>
                Stop juggling 8 different apps. Trackly brings everything together in a single, beautifully designed interface.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((f, i) => {
                const Icon = ICON_MAP[f.icon] || Wallet;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ delay: (i % 4) * 0.06 }}
                    whileHover={{ y: -3 }}
                    className={`group rounded-3xl border p-6 hover:border-black dark:hover:border-white transition-colors ${theme === "dark" ? "bg-black border-neutral-800" : "bg-white border-neutral-200"}`}
                  >
                    <div className="h-11 w-11 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-[17px] font-bold tracking-tight mb-2">{f.title}</h3>
                    <p className={`text-[13px] leading-relaxed ${theme === "dark" ? "text-neutral-400" : "text-neutral-600"}`}>{f.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 1 App vs 5 Apps — comparison table (instant value for new visitors + SEO) */}
      <section className="px-5 sm:px-8 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-3">Why Trackly</p>
            <h2 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-tight text-balance">
              Stop juggling 5 apps to run your day.
            </h2>
            <p className={`text-[15px] mt-3 max-w-2xl mx-auto ${theme === "dark" ? "text-neutral-400" : "text-neutral-600"}`}>
              Why switch between an expense tracker, a habit app, Splitwise and Notion — when Trackly does all of it in one app, offline, private and free?
            </p>
          </div>
          <div className={`rounded-3xl border overflow-hidden ${theme === "dark" ? "border-neutral-800" : "border-neutral-200"}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] sm:text-[14px] min-w-[680px]">
                <thead>
                  <tr className={theme === "dark" ? "bg-neutral-900/60" : "bg-neutral-100"}>
                    <th className="text-left font-bold px-4 sm:px-5 py-4">What you need</th>
                    <th className="text-left font-bold px-4 sm:px-5 py-4">The old way — 5 separate apps</th>
                    <th className="text-left font-bold px-4 sm:px-5 py-4 bg-black text-white dark:bg-white dark:text-black">
                      The Trackly way — 1 app
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Log an expense", "Open Money Manager → 6 taps and 3 forms to add ₹80", "Type \"momo 80\" → auto-categorized as Food in seconds"],
                    ["Build a habit or routine", "Open a habit app → set up each habit one by one", "Tell the AI: \"build a skincare routine\" → habits and reminders created for you"],
                    ["Split bills & udhaar", "Open Splitwise → daily limits, ads and paywalls", "Built-in group split + borrow/lend ledger, zero limits"],
                    ["Student / office life", "One attendance app, mess photos in your gallery, another to-do app", "One tap: Student Mode (attendance, mess, exams) or Office Mode (tasks, salary)"],
                    ["Privacy & speed", "Apps reading your bank SMS and OTPs, heavy apps loading slowly", "100% offline-first, zero SMS permissions, instant load"],
                    ["Monthly cost", "₹1,000+ across Pro subscriptions", "₹0 — free, no credit card"],
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className={`border-t ${theme === "dark" ? "border-neutral-800" : "border-neutral-200"}`}
                    >
                      <td className="px-4 sm:px-5 py-4 font-semibold align-top whitespace-nowrap">{row[0]}</td>
                      <td className={`px-4 sm:px-5 py-4 align-top leading-relaxed ${theme === "dark" ? "text-neutral-400" : "text-neutral-600"}`}>
                        {row[1]}
                      </td>
                      <td className="px-4 sm:px-5 py-4 align-top leading-relaxed bg-black text-white dark:bg-white dark:text-black font-medium">
                        {row[2]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — static Q&A, native <details> so it's in the raw HTML (AEO) */}
      <section className="px-5 sm:px-8 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-3">FAQ</p>
            <h2 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-tight text-balance">Questions, answered.</h2>
            <p className={`text-[15px] mt-3 ${theme === "dark" ? "text-neutral-400" : "text-neutral-600"}`}>
              Everything people ask before switching to Trackly.
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className={`group rounded-2xl border ${theme === "dark" ? "bg-black border-neutral-800" : "bg-white border-neutral-200"}`}
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-5 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-[16px] font-bold tracking-tight">{f.q}</h3>
                  <ChevronDown size={18} className="shrink-0 opacity-50 group-open:rotate-180 transition-transform" />
                </summary>
                <p className={`px-6 pb-5 -mt-1 text-[14px] leading-relaxed ${theme === "dark" ? "text-neutral-400" : "text-neutral-600"}`}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* From the blog — internal links (SEO) + real content for visitors */}
      <section className="px-5 sm:px-8 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-3">From the blog</p>
            <h2 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-tight text-balance">Guides worth your time.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { href: "/blog/best-free-expense-tracker-apps-india", tag: "Expenses", title: "Best Free Expense Tracker Apps in India (2026)", desc: "Trackly, Walnut, Money Manager and more — honest comparison on privacy, offline use and reports." },
              { href: "/blog/best-habit-tracker-apps-with-streaks", tag: "Habits", title: "Best Habit Tracker Apps with Streaks", desc: "Trackly, Habitica, Loop and Streaks compared — plus the science of habit formation." },
              { href: "/blog/how-to-build-a-morning-routine-that-sticks", tag: "Routines", title: "Build a Morning Routine That Sticks", desc: "The 66-day science, habit stacking, and a realistic 30-minute template — plus how to survive breaking a streak." },
            ].map((post) => (
              <a
                key={post.href}
                href={post.href}
                className={`group rounded-3xl border p-6 hover:border-black dark:hover:border-white transition-colors ${theme === "dark" ? "bg-black border-neutral-800" : "bg-white border-neutral-200"}`}
              >
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">{post.tag}</p>
                <h3 className="text-[16px] font-bold tracking-tight mt-2 group-hover:underline underline-offset-4">{post.title}</h3>
                <p className={`text-[13px] leading-relaxed mt-2 ${theme === "dark" ? "text-neutral-400" : "text-neutral-600"}`}>{post.desc}</p>
              </a>
            ))}
          </div>
          {/* Keyword landing pages — internal links (SEO) */}
          <div className="flex items-center justify-center gap-x-5 gap-y-2 flex-wrap mt-6">
            <a href="/expense-tracker" className="text-[12.5px] text-neutral-500 hover:underline underline-offset-4">Expense Tracker</a>
            <a href="/habit-tracker" className="text-[12.5px] text-neutral-500 hover:underline underline-offset-4">Habit Tracker</a>
            <a href="/money-tracker" className="text-[12.5px] text-neutral-500 hover:underline underline-offset-4">Money Tracker (Kharcha)</a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 sm:px-8 pb-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-[32px] bg-black dark:bg-white text-white dark:text-black p-10 sm:p-14 text-center overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-white dark:bg-black flex items-center justify-center mx-auto mb-6">
                <div className="h-7 w-7 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-black dark:bg-white" />
                </div>
              </div>
              <h2 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-tight text-balance">Ready to take control of your life?</h2>
              <p className="text-[15px] opacity-80 mt-3 max-w-md mx-auto">Join thousands of users who replaced 8 apps with one. Download Trackly today.</p>
              <div className="flex items-center justify-center gap-3 flex-wrap mt-8">
                <a href="/app" className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-white dark:bg-black text-black dark:text-white text-[14px] font-bold hover:scale-[1.03] transition-transform">
                  Open the App <ArrowRight size={16} />
                </a>
                <a {...linkProps(iosUrl)} className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white dark:bg-black text-black dark:text-white text-[14px] font-semibold hover:scale-[1.03] transition-transform">
                  <Apple size={18} /> App Store
                </a>
                <a {...linkProps(androidUrl)} className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white dark:bg-black text-black dark:text-white text-[14px] font-semibold hover:scale-[1.03] transition-transform">
                  <Play size={16} className="fill-current" /> Google Play
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t px-5 sm:px-8 py-8 ${theme === "dark" ? "border-neutral-800" : "border-neutral-200"}`}>
        <div className={`max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-neutral-500`}>
          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/trackly-logo-192.png"
              alt="Trackly logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-xl object-cover shrink-0"
            />
            <span className={`font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}>Trackly</span>
            <span className="opacity-60">·</span>
            <span>{footerText}</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <a href="/blog" className={`hover:transition-colors ${theme === "dark" ? "hover:text-white" : "hover:text-black"}`}>Blog</a>
            <a href="/features" className={`hover:transition-colors ${theme === "dark" ? "hover:text-white" : "hover:text-black"}`}>Features</a>
            <a href="/expense-tracker" className={`hover:transition-colors ${theme === "dark" ? "hover:text-white" : "hover:text-black"}`}>Expense Tracker</a>
            <a href="/habit-tracker" className={`hover:transition-colors ${theme === "dark" ? "hover:text-white" : "hover:text-black"}`}>Habit Tracker</a>
            <a href="/money-tracker" className={`hover:transition-colors ${theme === "dark" ? "hover:text-white" : "hover:text-black"}`}>Money Tracker</a>
            <a href="/about" className={`hover:transition-colors ${theme === "dark" ? "hover:text-white" : "hover:text-black"}`}>About</a>
            <a href="/privacy" className={`hover:transition-colors ${theme === "dark" ? "hover:text-white" : "hover:text-black"}`}>Privacy</a>
            <a href="/app" className={`hover:transition-colors ${theme === "dark" ? "hover:text-white" : "hover:text-black"}`}>Open app</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
