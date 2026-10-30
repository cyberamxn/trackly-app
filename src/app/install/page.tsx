"use client";

import { motion } from "framer-motion";
import {
  Share, Plus, ChevronRight, Smartphone, Apple, Check, Play, X,
} from "lucide-react";
import { useTheme } from "@/components/trackly/ThemeProvider";
import { useEffect, useState } from "react";

export default function InstallPage() {
  const { theme } = useTheme();
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [config, setConfig] = useState<{ title: string; subtitle: string; videoUrl: string }>({
    title: "Install Trackly on your iPhone",
    subtitle: "Turn Trackly into a real app on your home screen — no App Store needed. Takes 30 seconds.",
    videoUrl: "",
  });

  // Fetch admin-controlled config
  useEffect(() => {
    fetch("/api/public/sync")
      .then((r) => r.json())
      .then((data) => {
        const c = data.config || {};
        setConfig({
          title: c.install_page_title || "Install Trackly on your iPhone",
          subtitle: c.install_page_subtitle || "Turn Trackly into a real app on your home screen — no App Store needed. Takes 30 seconds.",
          videoUrl: c.install_video_url || "",
        });
      })
      .catch(() => {});
  }, []);

  // NOTE: no scroll-override hack needed anymore — globals.css no longer
  // locks html/body overflow globally (only /app locks itself via
  // html.app-lock), so this page scrolls naturally as a document.

  const steps = [
    {
      num: 1,
      icon: <Share size={20} />,
      title: "Open in Safari",
      desc: "Open trackly.app in Safari browser on your iPhone. Don't use Chrome — Add to Home Screen only works in Safari.",
      detail: "Type the website URL in Safari's address bar and open it.",
    },
    {
      num: 2,
      icon: <Share size={20} />,
      title: "Tap the Share button",
      desc: "At the bottom of Safari, tap the Share icon (square with an arrow pointing up).",
      detail: "It's at the bottom center of the screen on older iPhones, or next to the address bar on newer ones.",
    },
    {
      num: 3,
      icon: <Plus size={20} />,
      title: "Select 'Add to Home Screen'",
      desc: "Scroll down the share menu and tap 'Add to Home Screen'.",
      detail: "You may need to scroll down to see it. It has a + icon.",
    },
    {
      num: 4,
      icon: <Check size={20} />,
      title: "Tap 'Add'",
      desc: "A preview of the icon will appear. Tap 'Add' in the top right corner.",
      detail: "You can rename the app if you want, then tap Add.",
    },
    {
      num: 5,
      icon: <Smartphone size={20} />,
      title: "Done! Use like a native app",
      desc: "Trackly will appear on your home screen. Tap it to open in full-screen mode — no Safari bars, just like a real app.",
      detail: "It works offline, gets push notifications, and behaves exactly like a native iOS app.",
    },
  ];

  return (
    <div className={`min-h-screen w-full ${theme === "dark" ? "bg-black text-white" : "bg-white text-black"}`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 backdrop-blur-xl ${theme === "dark" ? "bg-black/70 border-neutral-800/60" : "bg-white/70 border-neutral-200/60"} border-b`}>
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/trackly-logo-192.png"
              alt="Trackly logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-xl object-cover shadow-sm"
            />
            <span className="font-bold tracking-tight">Trackly</span>
          </div>
          <a href="/app" className="text-[13px] font-medium opacity-70 hover:opacity-100">
            Back to App
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 h-8 rounded-full border mb-4 ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'}">
            <Apple size={14} />
            <span className="text-[12px] font-semibold uppercase tracking-wider">iPhone Guide</span>
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-tight">
            {config.title}
          </h1>
          <p className="text-[15px] mt-3 opacity-60 max-w-md mx-auto">
            {config.subtitle}
          </p>
        </motion.div>

        {/* Video Tutorial Button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 mb-2"
        >
          <button
            onClick={() => setVideoOpen(true)}
            className={`w-full h-14 rounded-2xl border flex items-center justify-center gap-3 font-semibold text-[15px] transition-all hover:scale-[1.02] ${theme === "dark" ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-200 text-black"}`}
          >
            <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center">
              <Play size={14} className="fill-current ml-0.5" />
            </div>
            Watch Video Tutorial
            <span className="text-[12px] opacity-50">10 sec</span>
          </button>
        </motion.div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (i + 1) }}
              className={`rounded-3xl p-5 border ${theme === "dark" ? "bg-neutral-900/50 border-neutral-800" : "bg-neutral-50 border-neutral-200"}`}
            >
              <div className="flex items-start gap-4">
                {/* Step number */}
                <div className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-[16px] shrink-0">
                  {step.num}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="opacity-50">{step.icon}</div>
                    <h3 className="text-[16px] font-bold">{step.title}</h3>
                  </div>
                  <p className="text-[14px] opacity-70 leading-relaxed">{step.desc}</p>
                  <p className="text-[12px] opacity-50 mt-2 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Visual guide */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className={`mt-8 rounded-3xl p-6 border ${theme === "dark" ? "bg-neutral-900/50 border-neutral-800" : "bg-neutral-50 border-neutral-200"}`}
        >
          <h3 className="text-[15px] font-bold mb-4 flex items-center gap-2">
            <Smartphone size={16} /> Quick Visual Guide
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Step 2 visual */}
            <div className={`rounded-2xl p-4 ${theme === "dark" ? "bg-neutral-800" : "bg-white border border-neutral-200"}`}>
              <p className="text-[12px] font-semibold opacity-70 mb-2">Step 2: Share Menu</p>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${theme === "dark" ? "bg-neutral-700" : "bg-neutral-100"}`}>
                  <Share size={14} className="opacity-60" />
                  <span className="text-[13px] opacity-70">Share</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${theme === "dark" ? "bg-neutral-700" : "bg-neutral-100"}`}>
                  <span className="text-[13px] opacity-70">Scroll down...</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground text-background`}>
                  <Plus size={14} />
                  <span className="text-[13px] font-semibold">Add to Home Screen</span>
                </div>
              </div>
            </div>
            {/* Step 4 visual */}
            <div className={`rounded-2xl p-4 ${theme === "dark" ? "bg-neutral-800" : "bg-white border border-neutral-200"}`}>
              <p className="text-[12px] font-semibold opacity-70 mb-2">Step 4: Confirm</p>
              <div className={`rounded-xl p-3 ${theme === "dark" ? "bg-neutral-700" : "bg-neutral-100"}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] opacity-70">Trackly</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/trackly-logo-192.png"
                    alt="Trackly app icon"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[12px] opacity-50">Cancel</span>
                  <div className="px-4 py-1.5 rounded-lg bg-foreground text-background text-[13px] font-bold">
                    Add
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-8"
        >
          <h3 className="text-[15px] font-bold mb-4">Why install?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`rounded-2xl p-4 ${theme === "dark" ? "bg-neutral-900/50" : "bg-neutral-50 border border-neutral-200"}`}>
              <Check size={18} className="mb-2 opacity-50" />
              <p className="text-[13px] font-semibold">Full Screen</p>
              <p className="text-[12px] opacity-60 mt-1">No Safari bars — looks like a real app</p>
            </div>
            <div className={`rounded-2xl p-4 ${theme === "dark" ? "bg-neutral-900/50" : "bg-neutral-50 border border-neutral-200"}`}>
              <Check size={18} className="mb-2 opacity-50" />
              <p className="text-[13px] font-semibold">Works Offline</p>
              <p className="text-[12px] opacity-60 mt-1">Access your data even without internet</p>
            </div>
            <div className={`rounded-2xl p-4 ${theme === "dark" ? "bg-neutral-900/50" : "bg-neutral-50 border border-neutral-200"}`}>
              <Check size={18} className="mb-2 opacity-50" />
              <p className="text-[13px] font-semibold">Push Notifications</p>
              <p className="text-[12px] opacity-60 mt-1">Get alerts like a native app</p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-10 text-center"
        >
          <a
            href="/app"
            className="inline-flex items-center gap-2 h-14 px-8 rounded-2xl bg-foreground text-background font-semibold text-[16px] hover:scale-[1.03] transition-transform"
          >
            Open Trackly
            <ChevronRight size={18} />
          </a>
          <p className="text-[12px] opacity-50 mt-4">
            Then follow the steps above to add it to your home screen
          </p>
        </motion.div>
      </div>

      {/* ===== Video Modal ===== */}
      {videoOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setVideoOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-md aspect-[9/16] bg-black rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setVideoOpen(false)}
              className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white"
            >
              <X size={18} />
            </button>

            {/* Video player */}
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            ) : config.videoUrl ? (
              <video
                src={config.videoUrl}
                controls
                autoPlay
                playsInline
                poster="/install-video-poster.jpg"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <Play size={28} className="fill-current ml-1" />
                </div>
                <p className="text-[15px] font-semibold mb-2">Video Coming Soon</p>
                <p className="text-[13px] opacity-60 max-w-xs">
                  The video tutorial will be added here. For now, follow the step-by-step guide below.
                </p>
                {/* Upload area */}
                <label className="mt-6 cursor-pointer">
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setVideoUrl(url);
                      }
                    }}
                  />
                  <div className="px-5 py-2.5 rounded-xl bg-white/10 text-[13px] font-medium">
                    Upload Video
                  </div>
                </label>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
