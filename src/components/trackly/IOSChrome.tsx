"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

export function StatusBar({ dark }: { dark?: boolean }) {
  const [time, setTime] = useState("9:41");
  const { theme } = useTheme();

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setTime(
        d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "")
      );
    };
    update();
    const i = setInterval(update, 30000);
    return () => clearInterval(i);
  }, []);

  const isDark = dark ?? theme === "dark";
  const fg = isDark ? "text-white" : "text-black";

  return (
    <div className={`absolute top-0 left-0 right-0 z-30 h-12 flex items-center justify-between px-7 pt-2 ${fg}`}>
      <span className="text-[15px] font-semibold tracking-tight tabular-nums">{time}</span>
      <div className="flex items-center gap-1.5">
        {/* Signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
          <rect x="0" y="7" width="3" height="4" rx="0.5" fill="currentColor" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.5" fill="currentColor" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" fill="currentColor" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill="currentColor" opacity="0.4" />
        </svg>
        {/* Wifi */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M8 9.5a1.2 1.2 0 100 0.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4.5 6.8a5 5 0 017 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M2 4.2a8.5 8.5 0 0112 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
        {/* Battery */}
        <div className="flex items-center gap-0.5">
          <div className="relative w-[25px] h-[12px] rounded-[3px] border border-current opacity-90">
            <div className="absolute inset-[1.5px] right-[6px] rounded-[1.5px] bg-current" />
          </div>
          <div className="w-[1.5px] h-[4px] rounded-r-sm bg-current opacity-60" />
        </div>
      </div>
    </div>
  );
}

export function DynamicIsland() {
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="h-[34px] w-[120px] bg-black rounded-full" />
    </div>
  );
}

export function HomeIndicator({ dark }: { dark?: boolean }) {
  const { theme } = useTheme();
  const isDark = dark ?? theme === "dark";
  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 h-8 flex items-end justify-center pb-2 pointer-events-none">
      <div
        className={`h-[5px] w-[135px] rounded-full ${isDark ? "bg-white" : "bg-black"} opacity-90`}
      />
    </div>
  );
}
