"use client";

import { ReactNode } from "react";

export function IPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative" style={{ width: 390, height: 844 }}>
      {/* Outer titanium frame */}
      <div className="absolute inset-0 rounded-[60px] bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.6),0_0_0_2px_rgba(255,255,255,0.05)_inset]" />
      {/* Inner bezel */}
      <div className="absolute inset-[6px] rounded-[55px] bg-black" />
      {/* Side buttons */}
      <div className="absolute -left-[3px] top-[120px] w-[4px] h-[32px] rounded-l-sm bg-zinc-700" />
      <div className="absolute -left-[3px] top-[180px] w-[4px] h-[60px] rounded-l-sm bg-zinc-700" />
      <div className="absolute -left-[3px] top-[260px] w-[4px] h-[60px] rounded-l-sm bg-zinc-700" />
      <div className="absolute -right-[3px] top-[200px] w-[4px] h-[100px] rounded-r-sm bg-zinc-700" />
      {/* Screen */}
      <div className="absolute inset-[6px] rounded-[55px] overflow-hidden bg-background">
        {children}
      </div>
    </div>
  );
}
