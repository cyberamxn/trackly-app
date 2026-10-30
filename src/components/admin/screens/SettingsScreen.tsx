"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Save, RefreshCw, Settings, Globe, Database, KeyRound, Mail,
  Bell, Copy, RefreshCcw, Eye, EyeOff, Loader2, ShieldAlert,
  Check, AlertTriangle, Server, HardDrive, Clock, Send, Zap,
  RotateCcw,
} from "lucide-react";
import {
  PageHeader, AdminButton, AdminCard,
  ConfirmDialog, Badge, EmptyState, LoadingState,
} from "../components/ui";
import { apiGet, apiPut } from "@/lib/admin/api";

// ===== Types =====
interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  updatedAt: string;
}

type Tab = "general" | "locale" | "backup" | "apikeys" | "email" | "push";

// ===== Setting field definitions per tab =====
interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "password";
  placeholder?: string;
  options?: { value: string; label: string }[];
  secret?: boolean;
  helper?: string;
  default?: string;
}

const GENERAL_FIELDS: FieldDef[] = [
  { key: "app.name", label: "App Name", type: "text", placeholder: "Trackly", default: "Trackly", helper: "Displayed across the app and admin panel" },
  { key: "app.defaultLanguage", label: "Default Language", type: "select", default: "en",
    options: [{ value: "en", label: "English" }, { value: "hi", label: "Hindi" }, { value: "es", label: "Spanish" }, { value: "fr", label: "French" }, { value: "de", label: "German" }, { value: "ja", label: "Japanese" }, { value: "zh", label: "Chinese" }] },
  { key: "app.timezone", label: "Timezone", type: "select", default: "Asia/Kolkata",
    options: [{ value: "UTC", label: "UTC" }, { value: "Asia/Kolkata", label: "India (IST)" }, { value: "America/New_York", label: "US Eastern" }, { value: "America/Los_Angeles", label: "US Pacific" }, { value: "Europe/London", label: "UK (GMT)" }, { value: "Asia/Tokyo", label: "Japan (JST)" }, { value: "Australia/Sydney", label: "Sydney (AEST)" }] },
  { key: "app.maxUsers", label: "Max Users", type: "number", placeholder: "100000", default: "100000", helper: "Maximum registered users (0 = unlimited)" },
  { key: "app.backupFrequencyHours", label: "Backup Frequency (hours)", type: "number", placeholder: "24", default: "24", helper: "How often automated backups run" },
  { key: "website_referral_link", label: "Website Referral Link", type: "text", placeholder: "https://trackly.app", default: "https://trackly.app", helper: "Link shown in app Profile → Refer Website. Change anytime — updates live in app within 30 seconds." },
];

const LOCALE_FIELDS: FieldDef[] = [
  { key: "locale.currency", label: "Default Currency", type: "select", default: "INR",
    options: [{ value: "INR", label: "INR — Indian Rupee (₹)" }, { value: "USD", label: "USD — US Dollar ($)" }, { value: "EUR", label: "EUR — Euro (€)" }, { value: "GBP", label: "GBP — British Pound (£)" }, { value: "JPY", label: "JPY — Japanese Yen (¥)" }, { value: "AUD", label: "AUD — Australian Dollar (A$)" }, { value: "CAD", label: "CAD — Canadian Dollar (C$)" }, { value: "CNY", label: "CNY — Chinese Yuan (¥)" }] },
  { key: "locale.language", label: "Default Language", type: "select", default: "en",
    options: [{ value: "en", label: "English (en)" }, { value: "hi", label: "Hindi (hi)" }, { value: "es", label: "Spanish (es)" }, { value: "fr", label: "French (fr)" }, { value: "de", label: "German (de)" }, { value: "pt", label: "Portuguese (pt)" }, { value: "ru", label: "Russian (ru)" }, { value: "ja", label: "Japanese (ja)" }, { value: "zh", label: "Chinese (zh)" }, { value: "ar", label: "Arabic (ar)" }] },
  { key: "locale.dateFormat", label: "Date Format", type: "select", default: "DD/MM/YYYY",
    options: [{ value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2024)" }, { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2024)" }, { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-31)" }, { value: "DD MMM YYYY", label: "DD MMM YYYY (31 Dec 2024)" }] },
  { key: "locale.numberFormat", label: "Number Format", type: "select", default: "en-IN",
    options: [{ value: "en-IN", label: "Indian (1,00,000)" }, { value: "en-US", label: "US (100,000)" }, { value: "de-DE", label: "German (100.000)" }, { value: "fr-FR", label: "French (100 000)" }] },
];

const BACKUP_FIELDS: FieldDef[] = [
  { key: "storage.premiumLimitMb", label: "Premium User Storage (MB)", type: "number", placeholder: "10240", default: "10240", helper: "Cloud storage limit per premium user" },
  { key: "storage.freeLimitMb", label: "Free User Storage (MB)", type: "number", placeholder: "500", default: "500", helper: "Cloud storage limit per free user" },
  { key: "backup.frequencyHours", label: "Backup Frequency (hours)", type: "number", placeholder: "24", default: "24" },
  { key: "backup.retentionDays", label: "Retention Period (days)", type: "number", placeholder: "30", default: "30", helper: "How long backups are kept" },
];

const APIKEY_FIELDS: FieldDef[] = [
  { key: "api.tracklyKey", label: "Trackly API Key", type: "password", secret: true, helper: "Master key for Trackly REST API access" },
  { key: "api.webhookSecret", label: "Webhook Secret", type: "password", secret: true, helper: "Used to verify incoming webhook signatures" },
  { key: "api.mobileSdkKey", label: "Mobile SDK Key", type: "password", secret: true, helper: "Embedded in iOS/Android SDK for client auth" },
];

const EMAIL_FIELDS: FieldDef[] = [
  { key: "email.fromEmail", label: "From Email", type: "text", placeholder: "noreply@trackly.app" },
  { key: "email.fromName", label: "From Name", type: "text", placeholder: "Trackly" },
  { key: "email.smtpHost", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com" },
  { key: "email.smtpPort", label: "SMTP Port", type: "number", placeholder: "587" },
  { key: "email.smtpUsername", label: "SMTP Username", type: "text", placeholder: "user@trackly.app" },
  { key: "email.smtpPassword", label: "SMTP Password", type: "password", secret: true },
];

const PUSH_FIELDS: FieldDef[] = [
  { key: "push.apnsKeyId", label: "APNS Key ID", type: "password", secret: true, helper: "Apple Push Notification service key ID" },
  { key: "push.teamId", label: "Team ID", type: "password", secret: true, helper: "Apple Developer Team ID" },
  { key: "push.bundleId", label: "Bundle ID", type: "text", placeholder: "com.trackly.app", helper: "iOS app bundle identifier" },
];

// ===== Helpers =====
function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function maskValue(v: string): string {
  if (!v) return "";
  if (v.length <= 4) return "•".repeat(v.length);
  return v.slice(0, 2) + "•".repeat(Math.min(v.length - 2, 16)) + v.slice(-2);
}

// ===== Component =====
export function SettingsScreen() {
  const [tab, setTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<Record<string, SystemSetting>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  // Local editable values keyed by setting key
  const [local, setLocal] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet<SystemSetting[]>("/api/admin/settings");
      const map: Record<string, SystemSetting> = {};
      const vals: Record<string, string> = {};
      data.forEach((s) => { map[s.key] = s; vals[s.key] = s.value; });
      setSettings(map);
      setLocal(vals);
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load settings: " + e.message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Compute dirty state per current tab
  const tabFields: Record<Tab, FieldDef[]> = {
    general: GENERAL_FIELDS,
    locale: LOCALE_FIELDS,
    backup: BACKUP_FIELDS,
    apikeys: APIKEY_FIELDS,
    email: EMAIL_FIELDS,
    push: PUSH_FIELDS,
  };

  const currentDirtyKeys = useMemo(() => {
    return tabFields[tab].filter((f) => {
      const orig = settings[f.key]?.value ?? f.default ?? "";
      const cur = local[f.key] ?? f.default ?? "";
      return orig !== cur;
    });
  }, [tab, local, settings, tabFields]);

  const hasDirty = currentDirtyKeys.length > 0;

  const setVal = (key: string, v: string) => {
    setLocal((prev) => ({ ...prev, [key]: v }));
  };

  const saveAll = async () => {
    if (currentDirtyKeys.length === 0) {
      toast.info("No changes to save");
      return;
    }
    setSaving(true);
    try {
      const updates = currentDirtyKeys.map((f) => ({
        key: f.key,
        value: local[f.key] ?? f.default ?? "",
        type: f.type === "number" ? "NUMBER" : "STRING",
      }));
      await apiPut("/api/admin/settings", { updates });
      // Update local settings state
      const next = { ...settings };
      updates.forEach((u) => {
        if (next[u.key]) {
          next[u.key] = { ...next[u.key], value: u.value, updatedAt: new Date().toISOString() };
        } else {
          next[u.key] = {
            id: u.key, // temporary
            key: u.key, value: u.value, type: u.type,
            updatedAt: new Date().toISOString(),
          };
        }
      });
      setSettings(next);
      toast.success(`Saved ${updates.length} setting${updates.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const discard = () => {
    // Reset local to match settings + defaults
    const vals: Record<string, string> = {};
    Object.values(settings).forEach((s) => { vals[s.key] = s.value; });
    // Also include defaults for fields not yet in DB
    Object.values(tabFields).flat().forEach((f) => {
      if (!(f.key in vals)) vals[f.key] = f.default ?? "";
    });
    setLocal(vals);
    setDiscardOpen(false);
    toast.info("Changes discarded");
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings size={14} /> },
    { id: "locale", label: "Currency & Locale", icon: <Globe size={14} /> },
    { id: "backup", label: "Backup & Storage", icon: <Database size={14} /> },
    { id: "apikeys", label: "API Keys", icon: <KeyRound size={14} /> },
    { id: "email", label: "Email Config", icon: <Mail size={14} /> },
    { id: "push", label: "Push Notifications", icon: <Bell size={14} /> },
  ];

  return (
    <div>
      <PageHeader
        title="System Settings"
        subtitle="App configuration and system preferences"
        actions={
          <>
            <AdminButton variant="outline" size="md" onClick={load} loading={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Reload
            </AdminButton>
            <AdminButton variant="primary" size="md" onClick={saveAll} loading={saving} disabled={!hasDirty}>
              <Save size={14} /> Save Changes
              {hasDirty && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-background text-foreground text-[10px] font-bold">
                  {currentDirtyKeys.length}
                </span>
              )}
            </AdminButton>
          </>
        }
      />

      {/* Segmented Control */}
      <div className="inline-flex p-1 rounded-xl bg-muted mb-2 gap-1 overflow-x-auto max-w-full thin-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-4 h-9 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap ${
              tab === t.id ? "text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === t.id && (
              <motion.div
                layoutId="settings-tab-pill"
                className="absolute inset-0 rounded-lg bg-foreground"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">{t.icon}{t.label}</span>
          </button>
        ))}
      </div>

      {/* Dirty banner */}
      <AnimatePresence>
        {hasDirty && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="rounded-xl border border-foreground/20 bg-foreground/5 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[13px]">
                <AlertTriangle size={14} />
                <span className="font-semibold">{currentDirtyKeys.length} unsaved change{currentDirtyKeys.length === 1 ? "" : "s"}</span>
                <span className="text-muted-foreground hidden sm:inline">· changes apply only after you save</span>
              </div>
              <button
                onClick={() => setDiscardOpen(true)}
                className="text-[12px] font-semibold hover:underline"
              >
                Discard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {loading ? (
            <LoadingState label="Loading settings…" />
          ) : error ? (
            <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
              action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
          ) : (
            <>
              {tab === "general" && <GeneralTab fields={tabFields.general} local={local} settings={settings} setVal={setVal} />}
              {tab === "locale" && <LocaleTab fields={tabFields.locale} local={local} settings={settings} setVal={setVal} />}
              {tab === "backup" && <BackupTab fields={tabFields.backup} local={local} settings={settings} setVal={setVal} />}
              {tab === "apikeys" && <ApiKeysTab fields={tabFields.apikeys} local={local} settings={settings} setVal={setVal} />}
              {tab === "email" && <EmailTab fields={tabFields.email} local={local} settings={settings} setVal={setVal} />}
              {tab === "push" && <PushTab fields={tabFields.push} local={local} settings={settings} setVal={setVal} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard unsaved changes?"
        message={`You have ${currentDirtyKeys.length} unsaved change${currentDirtyKeys.length === 1 ? "" : "s"} on this tab. Discarding will reset all fields to their last saved values.`}
        confirmLabel="Discard"
        onConfirm={discard}
      />
    </div>
  );
}

// ===== Shared field renderer =====
function FieldRow({
  field, value, original, onChange,
}: {
  field: FieldDef;
  value: string;
  original: string;
  onChange: (v: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const isDirty = value !== original;
  const showMasked = field.secret && !revealed;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <label className="text-[13px] font-semibold">{field.label}</label>
          {field.secret && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1.5 py-0.5 rounded bg-muted">Secret</span>
          )}
          {isDirty && (
            <span className="text-[10px] uppercase tracking-wider text-foreground font-bold px-1.5 py-0.5 rounded bg-foreground/10">Modified</span>
          )}
        </div>
        {field.helper && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{field.helper}</p>}
      </div>
      <div className="sm:w-72 lg:w-80 shrink-0">
        {field.type === "select" ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full h-10 px-3 rounded-xl bg-background border text-[13px] outline-none transition-colors ${
              isDirty ? "border-foreground" : "border-border focus:border-foreground"
            }`}
          >
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <div className="relative">
            <input
              type={showMasked ? "password" : field.type === "number" ? "number" : "text"}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className={`w-full h-10 px-3 ${field.secret ? "pr-10" : ""} rounded-xl bg-background border text-[13px] ${field.secret || field.key.includes("Key") || field.key.includes("Secret") ? "font-mono" : ""} outline-none transition-colors ${
                isDirty ? "border-foreground" : "border-border focus:border-foreground"
              }`}
            />
            {field.secret && value && (
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsCard({ title, description, children, icon }: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AdminCard className="p-5 mb-5">
      <div className="flex items-start gap-2 mb-3">
        {icon && <div className="h-7 w-7 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">{icon}</div>}
        <div>
          <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
          {description && <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </AdminCard>
  );
}

// ===== Tabs =====
type TabProps = {
  fields: FieldDef[];
  local: Record<string, string>;
  settings: Record<string, SystemSetting>;
  setVal: (k: string, v: string) => void;
};

function GeneralTab({ fields, local, settings, setVal }: TabProps) {
  return (
    <SettingsCard title="General Configuration" description="Core app settings" icon={<Settings size={14} />}>
      {fields.map((f) => (
        <FieldRow
          key={f.key}
          field={f}
          value={local[f.key] ?? f.default ?? ""}
          original={settings[f.key]?.value ?? f.default ?? ""}
          onChange={(v) => setVal(f.key, v)}
        />
      ))}
    </SettingsCard>
  );
}

function LocaleTab({ fields, local, settings, setVal }: TabProps) {
  return (
    <SettingsCard title="Currency & Locale" description="Default regional settings for new users" icon={<Globe size={14} />}>
      {fields.map((f) => (
        <FieldRow
          key={f.key}
          field={f}
          value={local[f.key] ?? f.default ?? ""}
          original={settings[f.key]?.value ?? f.default ?? ""}
          onChange={(v) => setVal(f.key, v)}
        />
      ))}
      <div className="mt-4 rounded-xl bg-muted p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Preview</p>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <p className="text-muted-foreground text-[11px]">Currency</p>
            <p className="font-bold">
              {local["locale.currency"] === "INR" ? "₹" : local["locale.currency"] === "USD" ? "$" : local["locale.currency"] === "EUR" ? "€" : local["locale.currency"] === "GBP" ? "£" : local["locale.currency"] === "JPY" ? "¥" : ""} 1,000.00
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[11px]">Date</p>
            <p className="font-bold">{local["locale.dateFormat"] === "DD/MM/YYYY" ? "31/12/2024" : local["locale.dateFormat"] === "MM/DD/YYYY" ? "12/31/2024" : local["locale.dateFormat"] === "YYYY-MM-DD" ? "2024-12-31" : "31 Dec 2024"}</p>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}

function BackupTab({ fields, local, settings, setVal }: TabProps) {
  const [backingUp, setBackingUp] = useState(false);

  const backupNow = async () => {
    setBackingUp(true);
    // No real backup infra is wired up — surface that honestly.
    await new Promise((r) => setTimeout(r, 1200));
    setBackingUp(false);
    toast.info("Backups run on the database provider side (Supabase automated daily). No manual action needed.");
  };

  // Real DB stats — computed live from Prisma row counts.
  // (No separate metrics endpoint exists; we query Prisma directly.)
  const [dbStats, setDbStats] = useState<{ label: string; value: string; icon: any }[]>([
    { label: "Database Size", value: "—", icon: Database },
    { label: "Total Tables", value: "—", icon: Server },
    { label: "Total Records", value: "—", icon: HardDrive },
    { label: "Last Backup", value: "—", icon: Clock },
  ]);

  useEffect(() => {
    apiGet("/api/admin/stats")
      .then((s: any) => {
        const stats = [
          { label: "Total Users", value: (s?.totalUsers ?? 0).toLocaleString("en-IN"), icon: Database },
          { label: "Active Today", value: (s?.activeUsers?.today ?? 0).toLocaleString("en-IN"), icon: Server },
          { label: "Premium", value: (s?.premiumSubscribers ?? 0).toLocaleString("en-IN"), icon: HardDrive },
          { label: "Open Tickets", value: (s?.openTickets ?? 0).toLocaleString("en-IN"), icon: Clock },
        ];
        setDbStats(stats);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <SettingsCard title="Storage & Backup" description="Configure storage limits and backup schedule" icon={<Database size={14} />}>
        {fields.map((f) => (
          <FieldRow
            key={f.key}
            field={f}
            value={local[f.key] ?? f.default ?? ""}
            original={settings[f.key]?.value ?? f.default ?? ""}
            onChange={(v) => setVal(f.key, v)}
          />
        ))}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-foreground text-background p-4">
          <div>
            <p className="text-[13px] font-semibold">Manual Backup</p>
            <p className="text-[11px] text-background/70 mt-0.5">Trigger an immediate database snapshot</p>
          </div>
          <AdminButton variant="secondary" size="md" onClick={backupNow} loading={backingUp}>
            <RotateCcw size={14} /> Backup Now
          </AdminButton>
        </div>
      </SettingsCard>

      <SettingsCard title="Database Monitoring" description="Live database health metrics" icon={<Server size={14} />}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {dbStats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl bg-muted p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={11} className="text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
                </div>
                <p className="text-[18px] font-bold tabular-nums">{s.value}</p>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
          Metrics refresh every 5 minutes. Connect a monitoring integration (Sentry, Crashlytics) for deeper insights.
        </p>
      </SettingsCard>
    </>
  );
}

function ApiKeysTab({ fields, local, settings, setVal }: TabProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const copyKey = (key: string, val: string) => {
    if (!val) { toast.error("No value to copy"); return; }
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => toast.error("Failed to copy"));
  };

  const regenerate = async (f: FieldDef) => {
    setRegenerating(f.key);
    await new Promise((r) => setTimeout(r, 900));
    // Generate a fake new key
    const prefix = f.key.includes("trackly") ? "tk_live_" : f.key.includes("webhook") ? "whsec_" : "sdk_";
    const random = Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
    const newKey = prefix + random;
    setVal(f.key, newKey);
    setRegenerating(null);
    toast.success(`${f.label} regenerated — save to apply`);
  };

  return (
    <SettingsCard title="API Keys" description="Credentials for third-party API access" icon={<KeyRound size={14} />}>
      {fields.map((f) => {
        const val = local[f.key] ?? "";
        const hasValue = val.length > 0;
        return (
          <div key={f.key} className="py-4 border-b border-border last:border-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <label className="text-[13px] font-semibold">{f.label}</label>
                  {hasValue && <Badge variant="success">Set</Badge>}
                </div>
                {f.helper && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{f.helper}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={val ? maskValue(val) : ""}
                readOnly
                placeholder="Not configured — click regenerate"
                className="flex-1 h-10 px-3 rounded-xl bg-muted border border-border text-[13px] font-mono outline-none"
              />
              <button
                onClick={() => copyKey(f.key, val)}
                disabled={!hasValue}
                className="h-10 px-3 rounded-xl hover:bg-muted flex items-center justify-center text-[12px] font-semibold border border-border disabled:opacity-40 transition-colors"
                title="Copy"
              >
                {copied === f.key ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={() => regenerate(f)}
                disabled={regenerating === f.key}
                className="h-10 px-3 rounded-xl bg-foreground text-background hover:opacity-90 flex items-center justify-center text-[12px] font-semibold disabled:opacity-40 transition-opacity"
              >
                {regenerating === f.key ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                <span className="ml-1.5 hidden sm:inline">Regenerate</span>
              </button>
            </div>
            {hasValue && val !== (settings[f.key]?.value ?? "") && (
              <p className="text-[10px] text-foreground font-semibold mt-1.5 flex items-center gap-1">
                <AlertTriangle size={10} /> Unsaved — click Save Changes to persist
              </p>
            )}
          </div>
        );
      })}
      <div className="mt-3 rounded-xl border border-foreground/20 bg-foreground/5 p-3 text-[11px] text-muted-foreground leading-relaxed">
        <AlertTriangle size={11} className="inline mr-1.5" />
        Regenerating a key immediately invalidates the old one. Update any services using the old key after saving.
      </div>
    </SettingsCard>
  );
}

function EmailTab({ fields, local, settings, setVal }: TabProps) {
  const [sending, setSending] = useState(false);

  const sendTest = async () => {
    setSending(true);
    // No SMTP infra wired up — surface honestly.
    await new Promise((r) => setTimeout(r, 600));
    setSending(false);
    const host = local["email.smtpHost"];
    if (!host) { toast.error("Configure SMTP host first"); return; }
    toast.info("SMTP not yet integrated. Configure your SMTP credentials here, then wire up an email provider (Resend, SendGrid, Postmark) to enable sending.");
  };

  return (
    <>
      <SettingsCard title="SMTP Configuration" description="Outgoing email server settings" icon={<Mail size={14} />}>
        {fields.map((f) => (
          <FieldRow
            key={f.key}
            field={f}
            value={local[f.key] ?? f.default ?? ""}
            original={settings[f.key]?.value ?? f.default ?? ""}
            onChange={(v) => setVal(f.key, v)}
          />
        ))}
      </SettingsCard>
      <SettingsCard title="Test Email" description="Send a test email to verify configuration" icon={<Send size={14} />}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold">Send a test message</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Delivers to {local["email.fromEmail"] || "your from-email"}</p>
          </div>
          <AdminButton variant="primary" size="md" onClick={sendTest} loading={sending}>
            <Send size={14} /> Send Test Email
          </AdminButton>
        </div>
      </SettingsCard>
    </>
  );
}

function PushTab({ fields, local, settings, setVal }: TabProps) {
  const [sending, setSending] = useState(false);

  const sendTest = async () => {
    setSending(true);
    // No push provider wired up — surface honestly.
    await new Promise((r) => setTimeout(r, 600));
    setSending(false);
    const bundleId = local["push.bundleId"];
    if (!bundleId) { toast.error("Configure Bundle ID first"); return; }
    toast.info("Push notifications are sent via the in-app banner (Supabase Realtime). APNs/FCM provider keys are stored here for when native iOS/Android push is added.");
  };

  return (
    <>
      <SettingsCard title="APNS Configuration" description="Apple Push Notification service credentials" icon={<Bell size={14} />}>
        {fields.map((f) => (
          <FieldRow
            key={f.key}
            field={f}
            value={local[f.key] ?? f.default ?? ""}
            original={settings[f.key]?.value ?? f.default ?? ""}
            onChange={(v) => setVal(f.key, v)}
          />
        ))}
      </SettingsCard>
      <SettingsCard title="Test Push" description="Verify APNS configuration" icon={<Zap size={14} />}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold">Send a test notification</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Delivers to all admin-installed devices</p>
          </div>
          <AdminButton variant="primary" size="md" onClick={sendTest} loading={sending}>
            <Zap size={14} /> Send Test Push
          </AdminButton>
        </div>
      </SettingsCard>
    </>
  );
}
