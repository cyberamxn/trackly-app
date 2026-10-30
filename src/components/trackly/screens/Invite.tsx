"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Gift, Copy, Check, Share2, UserPlus, Sparkles, Loader2,
  MessageCircle, Zap, Trophy, Clock3,
} from "lucide-react";
import { toast } from "sonner";
import { Card, ScreenHeader, ProgressBar } from "../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { supabase } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/referrals/client";

// ===== Types (mirrors /api/referrals/me) =====
interface InviteEntry {
  name: string;
  status: string;
  invitedAt: string;
  completedAt: string | null;
}
interface MeResponse {
  code: string;
  link: string;
  stats: {
    completed: number;
    pending: number;
    bonusPerReferral: number;
    bonusCap: number;
    referrerBonus: number;
    refereeWelcomeBonus: number;
    refereeCompleteBonus: number;
  };
  invites: InviteEntry[];
}

const MILESTONES = [
  { at: 1, label: "First Invite", emoji: "🥉" },
  { at: 3, label: "Squad Builder", emoji: "🥈" },
  { at: 5, label: "Trackly Supporter", emoji: "🥇" },
  { at: 10, label: "Trackly Champion", emoji: "🏆" },
];

function shareText(link: string) {
  return `Try Trackly 🔥 Expenses, habits, tasks, notes — all in one app, completely FREE (works offline too). We both get bonus AI messages 👇\n${link}`;
}

export function InviteScreen() {
  const { setScreen } = useTracklyStore();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) { setLoading(false); return; }
      const res = await fetch("/api/referrals/me", {
        headers: { Authorization: `Bearer ${token}`, "X-Device-Id": getDeviceId() },
      });
      if (res.ok) setMe(await res.json());
    } catch { /* offline — keep whatever we have */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const link = me?.link || "https://trackly.today";
  const completed = me?.stats.completed ?? 0;
  const pending = me?.stats.pending ?? 0;
  const bonusPerDay = me?.stats.referrerBonus ?? 0;
  const bonusPer = me?.stats.bonusPerReferral ?? 5;
  const bonusCap = me?.stats.bonusCap ?? 30;

  // Next milestone for the progress ladder
  const nextMs = MILESTONES.find((m) => completed < m.at) ?? MILESTONES[MILESTONES.length - 1];
  const prevAt = MILESTONES.filter((m) => completed >= m.at).slice(-1)[0]?.at ?? 0;
  const msProgress = Math.min(100, Math.round(((completed - prevAt) / (nextMs.at - prevAt)) * 100));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — long-press the link instead");
    }
  };

  const whatsappShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText(link))}`, "_blank");
  };

  const nativeShare = async () => {
    const text = shareText(link);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Trackly", text });
        return;
      } catch { /* cancelled — fall through to copy */ }
    }
    copyLink();
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-10 bg-background">
      <ScreenHeader
        title="Invite & Earn"
        subtitle="Invite friends — you both earn bonus AI messages"
        onBack={() => setScreen("settings")}
      />

      <div className="px-5 mt-1 space-y-4">
        {/* ===== HERO: reward explainer ===== */}
        <Card className="bg-foreground text-background">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-background/15 flex items-center justify-center shrink-0">
              <Gift size={22} />
            </div>
            <div className="flex-1">
              <p className="text-[17px] font-bold leading-snug">+{bonusPer} AI messages/day, every friend</p>
              <p className="text-[12.5px] opacity-75 mt-1 leading-relaxed">
                Every friend who signs up <b>and starts using the app</b> earns you{" "}
                <b>+{bonusPer} extra AI messages every day</b> (max +{bonusCap}/day). Your friend instantly gets{" "}
                <b>+{me?.stats.refereeWelcomeBonus ?? 10} welcome messages</b> on signup day. 🎁
              </p>
            </div>
          </div>
        </Card>

        {/* ===== SHARE CARD ===== */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Your invite link
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3.5 h-12 rounded-2xl bg-muted flex items-center overflow-hidden">
                  <span className="text-[13px] font-medium truncate">{link}</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={copyLink}
                  className="h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center shrink-0"
                  aria-label="Copy invite link"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </motion.button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={whatsappShare}
                  className="h-12 rounded-2xl bg-[#25D366] text-black font-bold text-[14px] flex items-center justify-center gap-2"
                >
                  <MessageCircle size={17} strokeWidth={2.4} />
                  WhatsApp
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={nativeShare}
                  className="h-12 rounded-2xl bg-muted font-bold text-[14px] flex items-center justify-center gap-2"
                >
                  <Share2 size={16} />
                  More apps
                </motion.button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-2.5 leading-relaxed">
                Share to Instagram, Telegram or Snapchat via &quot;More apps&quot;
              </p>
            </>
          )}
        </Card>

        {/* ===== STATS ===== */}
        <Card>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[26px] font-bold leading-none">{completed}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5">Friends joined</p>
            </div>
            <div>
              <p className="text-[26px] font-bold leading-none">{pending}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5">Pending</p>
            </div>
            <div>
              <p className="text-[26px] font-bold leading-none text-foreground">+{bonusPerDay}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5">Bonus msgs/day</p>
            </div>
          </div>

          {/* Milestone ladder */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold flex items-center gap-1.5">
                <Trophy size={13} className="text-muted-foreground" />
                {completed >= 10 ? "Max tier unlocked 🏆" : `Next: ${nextMs.emoji} ${nextMs.label} (${nextMs.at} friends)`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {completed}/{nextMs.at}
              </p>
            </div>
            <ProgressBar value={msProgress} />
            <div className="flex justify-between mt-2">
              {MILESTONES.map((m) => (
                <span key={m.at} className={`text-[15px] ${completed >= m.at ? "" : "opacity-25 grayscale"}`}>
                  {m.emoji}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* ===== FRIENDS LIST ===== */}
        {me && me.invites.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-4 pt-4 mb-2">
              Your invites
            </p>
            <div className="divide-y divide-border">
              {me.invites.map((inv, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-[13px] font-bold shrink-0">
                    {inv.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate">{inv.name}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {inv.status === "COMPLETED"
                        ? `Joined · +${bonusPer}/day unlocked`
                        : "Signed up — reward unlocks when they add their first entry"}
                    </p>
                  </div>
                  {inv.status === "COMPLETED" ? (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-foreground text-background flex items-center gap-1">
                      <Sparkles size={10} /> Earned
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                      <Clock3 size={10} /> Pending
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ===== HOW IT WORKS ===== */}
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            How it works
          </p>
          <div className="space-y-3.5">
            {[
              { icon: <Share2 size={15} />, t: "Share your link", d: "Send it on WhatsApp, Instagram, Telegram — anywhere you like." },
              { icon: <UserPlus size={15} />, t: "Friend signs up", d: `Anyone who joins through your link instantly gets +${me?.stats.refereeWelcomeBonus ?? 10} bonus messages.` },
              { icon: <Zap size={15} />, t: "Friend uses the app", d: `The moment they add their first expense, task or note, the referral completes — you earn +${bonusPer} messages every day.` },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center shrink-0">{s.icon}</div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-semibold">
                    {i + 1}. {s.t}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-4">
          Bonus messages are added on top of your base daily limit and reset together with it at 4:00 AM IST.
          Fair-use limits apply — duplicate accounts don&apos;t count.
        </p>
      </div>
    </div>
  );
}
