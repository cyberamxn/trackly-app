"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, FileText, Mail, Globe, Building2, Calendar, ChevronDown,
  ExternalLink, Copy, Scale,
} from "lucide-react";
import { toast } from "sonner";
import { Card, ScreenHeader, EmptyState } from "../ui";
import { useTracklyStore } from "@/lib/trackly/store";
import { useSync } from "@/lib/trackly/sync";
import { useSettings } from "@/lib/trackly/settings";

interface LegalDoc {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: any;
}

export function PrivacyPolicy() {
  const { setScreen } = useTracklyStore();
  const config = useSync((s) => s.config);
  const content = useSync((s) => s.content);
  const settings = useSettings();
  const isHinglish = settings.language === "hi";

  const [activeTab, setActiveTab] = useState<"PRIVACY" | "TERMS">("PRIVACY");

  // Pull legal docs from admin-controlled content
  const legalDocs = useMemo<LegalDoc[]>(() => {
    const privacy = content?.["PRIVACY"] ?? [];
    const terms = content?.["TERMS"] ?? [];
    return [...privacy, ...terms].map((d: any) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      body: d.body,
      metadata: d.metadata ?? {},
    }));
  }, [content]);

  const activeDoc = legalDocs.find((d) => d.type === activeTab) ?? legalDocs[0];

  // Config-driven meta
  const supportEmail = config.support_email ?? "amanatalibaisi786@gmail.com";
  const companyName = config.company_name ?? "ahexa.studio";
  const companyAddress = config.company_address ?? "Purnea, Bihar, India";
  const companyWebsite = config.company_website ?? "https://ahexa.studio";
  const privacyUpdatedAt = config.privacy_updated_at ?? new Date().toISOString().slice(0, 10);
  const termsUpdatedAt = config.terms_updated_at ?? new Date().toISOString().slice(0, 10);
  const activeUpdatedAt = activeTab === "PRIVACY" ? privacyUpdatedAt : termsUpdatedAt;

  // Parse the legal body into sections (split on numbered headings like "1. TITLE")
  const sections = useMemo(() => {
    if (!activeDoc?.body) return [];
    const lines = activeDoc.body.split("\n");
    const result: { heading: string | null; lines: string[] }[] = [];
    let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] };

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^(\d+\.\s+[A-Z][A-Z\s,&()\-]+)$/);
      if (match) {
        if (current.lines.length || current.heading) result.push(current);
        current = { heading: match[1], lines: [] };
      } else {
        current.lines.push(line);
      }
    }
    if (current.lines.length || current.heading) result.push(current);
    return result;
  }, [activeDoc]);

  const [openSection, setOpenSection] = useState<string | null>(null);

  const handleEmail = () => {
    const subject = encodeURIComponent("Privacy / Legal Query");
    window.location.href = `mailto:${supportEmail}?subject=${subject}`;
    toast.success("Opening email app…");
  };

  const handleWebsite = () => {
    window.open(companyWebsite, "_blank");
    toast.success("Opening website…");
  };

  const copyEmail = () => {
    navigator.clipboard?.writeText(supportEmail);
    toast.success("Email copied");
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-40">
      <ScreenHeader
        title={isHinglish ? "Privacy & Legal" : "Privacy & Legal"}
        subtitle={isHinglish ? "Aapke data ka protection · Indian + International law" : "Your data, protected · Indian + International law"}
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

      {/* ===== Hero — compliance summary ===== */}
      <div className="px-5 mt-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-foreground text-background p-5"
        >
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-background/15 flex items-center justify-center shrink-0">
              <Shield size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">
                {isHinglish ? "Compliance" : "Compliance"}
              </p>
              <h2 className="text-[20px] font-bold tracking-tight mt-0.5 leading-tight">
                {isHinglish ? "Aapka data surakshit hai" : "Your data is protected"}
              </h2>
              <p className="text-[13px] opacity-85 mt-2 leading-relaxed">
                {isHinglish
                  ? "Hum Indian DPDP Act 2023, GDPR (Europe), CCPA (California), aur IT Act 2000 ke standards follow karte hain. Aapka data encrypted hai, kabhi becha nahi jaata."
                  : "We comply with the Indian DPDP Act 2023, GDPR (Europe), CCPA (California), and IT Act 2000 standards. Your data is encrypted and never sold."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-background/15">
            {["DPDP Act 2023", "GDPR", "CCPA", "IT Act 2000"].map((badge) => (
              <span
                key={badge}
                className="text-[10px] uppercase tracking-wider bg-background/15 px-2 py-1 rounded-md font-semibold"
              >
                {badge}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ===== Tabs: Privacy Policy / Terms ===== */}
      <div className="px-5 mt-5">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted">
          <TabButton
            active={activeTab === "PRIVACY"}
            onClick={() => setActiveTab("PRIVACY")}
            icon={<Shield size={14} />}
            label="Privacy Policy"
          />
          <TabButton
            active={activeTab === "TERMS"}
            onClick={() => setActiveTab("TERMS")}
            icon={<FileText size={14} />}
            label="Terms of Service"
          />
        </div>
      </div>

      {/* ===== Last updated + meta ===== */}
      <div className="px-5 mt-4 flex items-center gap-3 flex-wrap text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar size={12} />
          {isHinglish ? "Last update" : "Last updated"}: {activeUpdatedAt}
        </span>
        <span className="inline-flex items-center gap-1">
          <Scale size={12} />
          {isHinglish ? "Version" : "Version"}: {activeDoc?.metadata?.version ?? "1.0"}
        </span>
      </div>

      {/* ===== Legal body ===== */}
      <div className="px-5 mt-3">
        {!activeDoc ? (
          <EmptyState
            icon={<FileText size={20} className="text-muted-foreground" />}
            title={isHinglish ? "Document available nahi" : "No document available"}
            description={isHinglish ? "Admin panel se content add karein." : "Add content from the admin panel."}
          />
        ) : sections.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
              {activeDoc.body}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Intro (text before first numbered section) */}
            {sections[0]?.heading === null && sections[0]?.lines.length > 0 && (
              <Card>
                <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
                  {sections[0].lines.join("\n").trim()}
                </p>
              </Card>
            )}
            {/* Numbered sections as accordion */}
            {sections
              .filter((s) => s.heading !== null)
              .map((section, idx) => {
                const isOpen = openSection === section.heading;
                return (
                  <motion.div key={section.heading} layout whileTap={{ scale: 0.99 }}>
                    <Card className="overflow-hidden">
                      <motion.button
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setOpenSection(isOpen ? null : section.heading!)}
                        className="w-full flex items-center gap-3 p-4 text-left"
                      >
                        <div className="h-7 w-7 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0 text-[11px] font-bold">
                          {idx + 1}
                        </div>
                        <p className="flex-1 text-[14px] font-semibold leading-snug">{section.heading}</p>
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronDown size={15} className="text-muted-foreground" />
                        </motion.div>
                      </motion.button>
                      <motion.div
                        initial={false}
                        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <div className="border-t border-border pt-3" />
                          <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
                            {section.lines.join("\n").trim()}
                          </p>
                        </div>
                      </motion.div>
                    </Card>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* ===== Company info (admin-editable) ===== */}
      <div className="px-5 mt-6">
        <h2 className="text-[20px] font-bold tracking-tight mb-2.5">
          {isHinglish ? "Company ke baare mein" : "About the company"}
        </h2>
        <Card>
          <div className="space-y-3">
            <InfoRow icon={<Building2 size={15} />} label={isHinglish ? "Company" : "Company"} value={companyName} />
            <InfoRow icon={<Shield size={15} />} label={isHinglish ? "Address" : "Address"} value={companyAddress} />
            <InfoRow icon={<Globe size={15} />} label="Website" value={companyWebsite.replace(/^https?:\/\//, "")} onClick={handleWebsite} />
            <InfoRow
              icon={<Mail size={15} />}
              label="Email"
              value={supportEmail}
              onClick={handleEmail}
              onCopy={copyEmail}
              last
            />
          </div>
        </Card>
      </div>

      {/* ===== Grievance Officer (DPDP Act) ===== */}
      <div className="px-5 mt-4">
        <Card className="bg-muted/50 border-dashed">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
              <Scale size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">
                {isHinglish ? "Grievance Officer (DPDP Act 2023)" : "Grievance Officer (DPDP Act 2023)"}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                {isHinglish
                  ? "Privacy concerns ya data requests ke liye hum 24 ghante ke andar acknowledge karte hain, aur 30 din ke andar resolve karte hain (DPDP Act Rule 11)."
                  : "For privacy concerns or data requests, we acknowledge within 24 hours and resolve within 30 days (DPDP Act Rule 11)."}
              </p>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleEmail}
                className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-foreground text-background text-[13px] font-semibold"
              >
                <Mail size={13} />
                {isHinglish ? "Email karein" : "Email us"}
              </motion.button>
            </div>
          </div>
        </Card>
      </div>

      {/* ===== Footer ===== */}
      <div className="px-5 mt-8 text-center">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {companyName} · {companyAddress}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {isHinglish ? "Indian law ke under governed" : "Governed by the laws of India"}
        </p>
      </div>
    </div>
  );
}

// ===== Sub-components =====
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex-1 h-10 rounded-xl text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
        active ? "bg-foreground text-background" : "text-foreground"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onClick,
  onCopy,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
  onCopy?: () => void;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${last ? "" : "pb-3 border-b border-border"}`}>
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-[14px] font-semibold truncate">{value}</p>
      </div>
      {onClick && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClick}
          className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"
          aria-label="Open"
        >
          <ExternalLink size={13} />
        </motion.button>
      )}
      {onCopy && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onCopy}
          className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"
          aria-label="Copy"
        >
          <Copy size={13} />
        </motion.button>
      )}
    </div>
  );
}
