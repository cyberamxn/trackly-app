"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronRight, Mail, Phone, Clock, Globe, Instagram,
  Twitter, Youtube, Facebook, MessageCircle, HelpCircle, LifeBuoy,
  Send, Sparkles, Search, X, BookOpen, FileText, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Card, ScreenHeader, EmptyState } from "../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { useSync } from "@/lib/trackly/sync";
import { useSettings } from "@/lib/trackly/settings";

// ===== Types =====
interface Article {
  id: string;
  title: string;
  body: string;
  category?: string;
  icon?: string;
  sortOrder?: number;
}

interface Faq {
  id: string;
  title: string;
  body: string;
  sortOrder?: number;
}

// ===== Helpers =====
function buildInstagramUrl(handleOrUrl: string): string {
  if (!handleOrUrl) return "";
  if (/^https?:\/\//i.test(handleOrUrl)) return handleOrUrl;
  const handle = handleOrUrl.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}

function buildTwitterUrl(handleOrUrl: string): string {
  if (!handleOrUrl) return "";
  if (/^https?:\/\//i.test(handleOrUrl)) return handleOrUrl;
  const handle = handleOrUrl.replace(/^@/, "");
  return `https://twitter.com/${handle}`;
}

function buildWhatsappUrl(phone: string, text: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// ===== Component =====
export function HelpSupport() {
  const { setScreen } = useTracklyStore();
  const config = useSync((s) => s.config);
  const content = useSync((s) => s.content);
  const settings = useSettings();
  const isHinglish = settings.language === "hi";

  const [search, setSearch] = useState("");
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Pull help articles + FAQs from admin-controlled content
  const articles = useMemo<Article[]>(() => {
    const raw = content?.["HELP_ARTICLE"] ?? [];
    return raw
      .map((a: any) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        category: a.metadata?.category ?? "General",
        icon: a.metadata?.icon ?? "book-open",
        sortOrder: a.metadata?.sortOrder ?? 0,
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [content]);

  const faqs = useMemo<Faq[]>(() => {
    const raw = content?.["FAQ"] ?? [];
    return raw
      .map((f: any) => ({
        id: f.id,
        title: f.title,
        body: f.body,
        sortOrder: f.metadata?.sortOrder ?? 0,
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [content]);

  // Filtered views
  const filteredArticles = useMemo(() => {
    if (!search.trim()) return articles;
    const q = search.toLowerCase();
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
    );
  }, [articles, search]);

  const filteredFaqs = useMemo(() => {
    if (!search.trim()) return faqs;
    const q = search.toLowerCase();
    return faqs.filter(
      (f) => f.title.toLowerCase().includes(q) || f.body.toLowerCase().includes(q)
    );
  }, [faqs, search]);

  // Config-driven fields (admin-editable)
  const supportEmail = config.support_email ?? "amanatalibaisi786@gmail.com";
  const supportPhone = config.support_phone ?? "";
  const responseTime = config.support_response_time ?? "Within 24 hours";
  const helpWebsite = config.help_website ?? "";
  const introEn = config.help_intro_en ?? "Trackly is your all-in-one life tracker. Tap any section below to learn how to use every feature, or reach out to our support team — we usually reply within 24 hours.";
  const introHi = config.help_intro_hi ?? "Trackly aapka all-in-one life tracker hai. Niche kisi bhi section pe tap karke har feature use karna seekhiye, ya apni support team se contact karein — hum usually 24 ghante ke andar reply karte hain.";
  const intro = isHinglish ? introHi : introEn;
  const instagram = config.social_instagram ?? "trackly.in";
  const twitter = config.social_twitter ?? "";
  const youtube = config.social_youtube ?? "";
  const facebook = config.social_facebook ?? "";
  const appName = config.app_name ?? "Trackly";
  const appVersion = config.app_version ?? "2.4.1";

  // Action handlers
  const handleEmail = () => {
    const subject = encodeURIComponent(`${appName} — Support Request`);
    const body = encodeURIComponent(
      `Hi ${appName} team,\n\nI need help with:\n\n\nApp version: ${appVersion}\nLanguage: ${isHinglish ? "Hinglish" : "English"}`
    );
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    toast.success("Opening email app…");
  };

  const handleWhatsapp = () => {
    if (!supportPhone) return;
    const text = `Hi ${appName} team, I need help with…`;
    window.open(buildWhatsappUrl(supportPhone, text), "_blank");
    toast.success("Opening WhatsApp…");
  };

  const handleWebsite = () => {
    if (!helpWebsite) return;
    window.open(helpWebsite, "_blank");
    toast.success("Opening website…");
  };

  const handleInstagram = () => {
    window.open(buildInstagramUrl(instagram), "_blank");
    toast.success("Opening Instagram…");
  };

  const handleTwitter = () => {
    window.open(buildTwitterUrl(twitter), "_blank");
    toast.success("Opening Twitter…");
  };

  const handleSocial = (url: string, label: string) => {
    if (!url) return;
    window.open(url, "_blank");
    toast.success(`Opening ${label}…`);
  };

  const copyEmail = () => {
    navigator.clipboard?.writeText(supportEmail);
    toast.success("Email copied");
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-40">
      <ScreenHeader
        title="Help & Support"
        subtitle={isHinglish ? "App use karna seekhiye · Support se baat karein" : "Learn how to use the app · Talk to support"}
        onBack={() => setScreen("settings")}
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const next = isHinglish ? "en" : "hi";
              settings.setLanguage(next);
              toast.success(next === "hi" ? "Hinglish chuni gayi" : "English selected");
            }}
            className="px-3 h-9 rounded-full bg-muted flex items-center text-[12px] font-medium gap-1.5"
          >
            <Globe size={13} />
            {isHinglish ? "EN" : "हिं"}
          </motion.button>
        }
      />

      {/* ===== Hero / App intro (admin-editable) ===== */}
      <div className="px-5 mt-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-foreground text-background p-5"
        >
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-background/15 flex items-center justify-center shrink-0">
              <LifeBuoy size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">
                {isHinglish ? "App ke baare mein" : "About this app"}
              </p>
              <h2 className="text-[20px] font-bold tracking-tight mt-0.5 leading-tight">
                {appName} v{appVersion}
              </h2>
              <p className="text-[13px] opacity-85 mt-2 leading-relaxed">
                {intro}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-background/15">
            <Clock size={13} className="opacity-70" />
            <p className="text-[12px] opacity-80">
              {isHinglish ? "Reply" : "Reply"}: {responseTime}
            </p>
          </div>
        </motion.div>
      </div>

      {/* ===== Contact options (admin-editable) ===== */}
      <div className="px-5 mt-5">
        <SectionTitle>{isHinglish ? "Contact karein" : "Contact us"}</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          <ContactTile
            icon={<Mail size={18} />}
            label={isHinglish ? "Email" : "Email"}
            value={supportEmail}
            onClick={handleEmail}
            onLongPress={copyEmail}
          />
          {supportPhone && (
            <ContactTile
              icon={<MessageCircle size={18} />}
              label="WhatsApp"
              value={supportPhone}
              onClick={handleWhatsapp}
            />
          )}
          {helpWebsite && (
            <ContactTile
              icon={<Globe size={18} />}
              label={isHinglish ? "Website" : "Website"}
              value={helpWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              onClick={handleWebsite}
            />
          )}
          <ContactTile
            icon={<Instagram size={18} />}
            label="Instagram"
            value={`@${instagram.replace(/^@/, "")}`}
            onClick={handleInstagram}
          />
          {twitter && (
            <ContactTile
              icon={<Twitter size={18} />}
              label="Twitter / X"
              value={`@${twitter.replace(/^@/, "")}`}
              onClick={handleTwitter}
            />
          )}
          {youtube && (
            <ContactTile
              icon={<Youtube size={18} />}
              label="YouTube"
              value="Channel"
              onClick={() => handleSocial(youtube, "YouTube")}
            />
          )}
          {facebook && (
            <ContactTile
              icon={<Facebook size={18} />}
              label="Facebook"
              value="Page"
              onClick={() => handleSocial(facebook, "Facebook")}
            />
          )}
        </div>

        {/* Email chip + copy */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={copyEmail}
          className="w-full mt-2.5 flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-border text-[13px]"
        >
          <Mail size={14} className="text-muted-foreground" />
          <span className="flex-1 text-left font-medium truncate">{supportEmail}</span>
          <span className="text-[11px] text-muted-foreground">{isHinglish ? "Copy karne ke liye tap karein" : "Tap to copy"}</span>
        </motion.button>
      </div>

      {/* ===== Search bar ===== */}
      <div className="px-5 mt-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isHinglish ? "Article ya FAQ search karein…" : "Search articles or FAQs…"}
            className="w-full h-11 pl-9 pr-9 rounded-xl bg-muted text-[14px] outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-background flex items-center justify-center"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ===== How-to-use articles (admin-editable HELP_ARTICLE) ===== */}
      <div className="mt-6">
        <div className="px-5 flex items-center justify-between mb-2.5">
          <h2 className="text-[20px] font-bold tracking-tight flex items-center gap-2">
            <BookOpen size={18} />
            {isHinglish ? "App kaise use karein" : "How to use the app"}
          </h2>
          <span className="text-[12px] text-muted-foreground font-medium">{filteredArticles.length}</span>
        </div>

        <div className="px-5 space-y-2">
          {filteredArticles.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={20} className="text-muted-foreground" />}
              title={isHinglish ? "Koi article nahi mila" : "No articles found"}
              description={isHinglish ? "Alag search term try karein." : "Try a different search term."}
            />
          ) : (
            filteredArticles.map((a) => (
              <ArticleCard
                key={a.id}
                article={a}
                open={openArticle === a.id}
                onToggle={() => setOpenArticle(openArticle === a.id ? null : a.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ===== FAQs (admin-editable FAQ) ===== */}
      <div className="mt-6">
        <div className="px-5 flex items-center justify-between mb-2.5">
          <h2 className="text-[20px] font-bold tracking-tight flex items-center gap-2">
            <HelpCircle size={18} />
            {isHinglish ? "Aksar puche jane wale sawaal" : "Frequently Asked Questions"}
          </h2>
          <span className="text-[12px] text-muted-foreground font-medium">{filteredFaqs.length}</span>
        </div>

        <div className="px-5 space-y-2">
          {filteredFaqs.length === 0 ? (
            <EmptyState
              icon={<HelpCircle size={20} className="text-muted-foreground" />}
              title={isHinglish ? "Koi FAQ nahi mila" : "No FAQs found"}
            />
          ) : (
            filteredFaqs.map((f) => (
              <FaqCard
                key={f.id}
                faq={f}
                open={openFaq === f.id}
                onToggle={() => setOpenFaq(openFaq === f.id ? null : f.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ===== Quick links ===== */}
      <div className="px-5 mt-6">
        <SectionTitle>{isHinglish ? "Quick links" : "Quick links"}</SectionTitle>
        <Card className="p-0 overflow-hidden">
          <QuickLinkRow
            icon={<Shield size={16} />}
            label={isHinglish ? "Privacy Policy" : "Privacy Policy"}
            onClick={() => setScreen("privacy")}
          />
          <QuickLinkRow
            icon={<FileText size={16} />}
            label={isHinglish ? "Terms of Service" : "Terms of Service"}
            onClick={() => setScreen("privacy")}
            last
          />
        </Card>
      </div>

      {/* ===== Footer ===== */}
      <div className="px-5 mt-8 text-center">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleEmail}
          className="inline-flex items-center gap-2 h-[52px] px-6 rounded-full bg-foreground text-background text-[15px] font-semibold"
        >
          <Send size={16} />
          {isHinglish ? "Support se baat karein" : "Contact support"}
        </motion.button>
        <p className="text-[11px] text-muted-foreground mt-4">
          {appName} v{appVersion} · {isHinglish ? "Purnea, Bihar, India mein banaaya gaya" : "Made with care in Purnea, Bihar, India"}
        </p>
      </div>
    </div>
  );
}

// ===== Sub-components =====
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[20px] font-bold tracking-tight mb-2.5">{children}</h2>;
}

function ContactTile({
  icon,
  label,
  value,
  onClick,
  onLongPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
  onLongPress?: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault();
          onLongPress();
        }
      }}
      className="rounded-2xl border border-border p-3.5 text-left active:bg-muted/50"
    >
      <div className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className="text-[13px] font-semibold truncate mt-0.5">{value}</p>
    </motion.button>
  );
}

function ArticleCard({
  article,
  open,
  onToggle,
}: {
  article: Article;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div layout whileTap={{ scale: 0.99 }}>
      <Card className="overflow-hidden">
        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={onToggle}
          className="w-full flex items-center gap-3 p-4 text-left"
        >
          <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <BookOpen size={15} className="text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold leading-snug">{article.title}</p>
            {article.category && (
              <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wider">{article.category}</p>
            )}
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-muted-foreground" />
          </motion.div>
        </motion.button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0">
                <div className="border-t border-border pt-3" />
                <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
                  {article.body}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function FaqCard({
  faq,
  open,
  onToggle,
}: {
  faq: Faq;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div layout whileTap={{ scale: 0.99 }}>
      <Card className="overflow-hidden">
        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={onToggle}
          className="w-full flex items-center gap-3 p-4 text-left"
        >
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <HelpCircle size={14} className="text-foreground" />
          </div>
          <p className="flex-1 text-[14px] font-semibold leading-snug">{faq.title}</p>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={15} className="text-muted-foreground" />
          </motion.div>
        </motion.button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                <div className="border-t border-border pt-3" />
                <p className="text-[13px] text-muted-foreground leading-relaxed">{faq.body}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function QuickLinkRow({
  icon,
  label,
  onClick,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 py-3 px-4 active:bg-muted/50 text-left ${
        last ? "" : "border-b border-border"
      }`}
    >
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
      <p className="flex-1 text-[15px] font-medium">{label}</p>
      <ChevronRight size={16} className="text-muted-foreground" />
    </motion.button>
  );
}
