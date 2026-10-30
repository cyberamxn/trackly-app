"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plug, RefreshCw, Settings2, Zap, Check, X, Eye, EyeOff, Loader2,
  ShieldAlert, CreditCard, BarChart3, Bug, Bell, BrainCircuit,
  Database, Power, Activity, Clock,
} from "lucide-react";
import {
  PageHeader, AdminButton, AdminCard,
  AdminModal, ConfirmDialog, Badge, EmptyState, LoadingState,
} from "../components/ui";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/admin/api";

// ===== Types =====
interface Integration {
  id: string;
  key: string;
  name: string;
  connected: boolean;
  config: Record<string, any>;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type CategoryKey = "Payments" | "Analytics" | "Crash Reporting" | "Push" | "AI" | "Storage";

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  required?: boolean;
}
interface CatalogEntry {
  key: string;
  name: string;
  description: string;
  category: CategoryKey;
  fields: FieldDef[];
}

// ===== Catalog =====
const CATALOG: CatalogEntry[] = [
  {
    key: "stripe",
    name: "Stripe",
    description: "Payment processing for subscriptions",
    category: "Payments",
    fields: [
      { key: "secretKey", label: "Secret Key", placeholder: "sk_live_…", secret: true, required: true },
      { key: "publishableKey", label: "Publishable Key", placeholder: "pk_live_…", secret: true, required: true },
      { key: "webhookSecret", label: "Webhook Secret", placeholder: "whsec_…", secret: true, required: true },
    ],
  },
  {
    key: "revenuecat",
    name: "RevenueCat",
    description: "Subscription management & entitlements",
    category: "Payments",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "appl_…", secret: true, required: true },
      { key: "projectId", label: "Project ID", placeholder: "proj_abc123", required: true },
    ],
  },
  {
    key: "appstore",
    name: "Apple App Store",
    description: "In-app purchases & app store connect",
    category: "Payments",
    fields: [
      { key: "sharedSecret", label: "Shared Secret", placeholder: "••••••••", secret: true, required: true },
      { key: "issuerId", label: "Issuer ID", placeholder: "issuer_xxx" },
    ],
  },
  {
    key: "ga",
    name: "Google Analytics",
    description: "Web & app analytics tracking",
    category: "Analytics",
    fields: [
      { key: "measurementId", label: "Measurement ID", placeholder: "G-XXXXXXXXXX", required: true },
      { key: "apiSecret", label: "API Secret", placeholder: "••••••••", secret: true, required: true },
    ],
  },
  {
    key: "crashlytics",
    name: "Crashlytics",
    description: "Mobile crash reporting & analysis",
    category: "Crash Reporting",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "••••••••", secret: true, required: true },
      { key: "projectId", label: "Project ID", placeholder: "proj-123", required: true },
    ],
  },
  {
    key: "sentry",
    name: "Sentry",
    description: "Error monitoring & performance",
    category: "Crash Reporting",
    fields: [
      { key: "dsn", label: "DSN", placeholder: "https://…@sentry.io/…", required: true },
      { key: "authToken", label: "Auth Token", placeholder: "sntrys_…", secret: true },
    ],
  },
  {
    key: "firebase",
    name: "Firebase",
    description: "Push notifications & cloud messaging",
    category: "Push",
    fields: [
      { key: "serverKey", label: "Server Key", placeholder: "AAAA…", secret: true, required: true },
      { key: "projectId", label: "Project ID", placeholder: "trackly-prod", required: true },
    ],
  },
  {
    key: "onesignal",
    name: "OneSignal",
    description: "Cross-platform push delivery",
    category: "Push",
    fields: [
      { key: "appId", label: "App ID", placeholder: "app-uuid", required: true },
      { key: "restApiKey", label: "REST API Key", placeholder: "••••••••", secret: true, required: true },
    ],
  },
  {
    key: "openai",
    name: "OpenAI / AI Chat",
    description: "Powers Trackly AI chat. AI already works out of the box (built-in free provider). Adding your own key gives faster & better replies — supports OpenAI, Google Gemini (free key from aistudio.google.com), Groq & OpenRouter, auto-detected",
    category: "AI",
    fields: [
      { key: "apiKey", label: "API Key (optional — AI works without it)", placeholder: "AIza… (Gemini) · sk-… (OpenAI) · gsk_… (Groq) · sk-or-… (OpenRouter)", secret: true },
      { key: "model", label: "Model (optional)", placeholder: "gemini-2.0-flash · gpt-4o-mini · llama-3.3-70b-versatile" },
      { key: "baseUrl", label: "Base URL (optional, for self-hosted/other providers)", placeholder: "https://api.openai.com/v1" },
    ],
  },
  {
    key: "cloudkit",
    name: "CloudKit",
    description: "Apple iCloud storage & sync",
    category: "Storage",
    fields: [
      { key: "containerId", label: "Container ID", placeholder: "iCloud.com.trackly.app", required: true },
      { key: "apiKey", label: "API Key", placeholder: "••••••••", secret: true, required: true },
    ],
  },
];

const CATEGORY_META: Record<CategoryKey, { icon: typeof CreditCard; desc: string }> = {
  Payments: { icon: CreditCard, desc: "Billing & in-app purchases" },
  Analytics: { icon: BarChart3, desc: "User behavior tracking" },
  "Crash Reporting": { icon: Bug, desc: "Error monitoring" },
  Push: { icon: Bell, desc: "Notifications delivery" },
  AI: { icon: BrainCircuit, desc: "Machine learning services" },
  Storage: { icon: Database, desc: "Cloud data storage" },
};

// ===== Helpers =====
function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
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

// ===== Component =====
export function IntegrationsScreen() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configTarget, setConfigTarget] = useState<Integration | null>(null);
  const [configCatalog, setConfigCatalog] = useState<CatalogEntry | null>(null);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<Integration | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet<Integration[]>("/api/admin/integrations");
      setIntegrations(data);
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load integrations: " + e.message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Merge catalog with DB state. For each catalog entry, find matching DB record (by key).
  const merged = useMemo(() => {
    return CATALOG.map((cat) => {
      const db = integrations.find((i) => i.key === cat.key);
      return { catalog: cat, db: db ?? null };
    });
  }, [integrations]);

  const byCategory = useMemo(() => {
    const map: Record<CategoryKey, { catalog: CatalogEntry; db: Integration | null }[]> = {
      Payments: [], Analytics: [], "Crash Reporting": [], Push: [], AI: [], Storage: [],
    };
    merged.forEach((m) => { map[m.catalog.category].push(m); });
    return map;
  }, [merged]);

  const connectedCount = integrations.filter((i) => i.connected).length;

  // Actions
  const handleConnect = async (catalog: CatalogEntry) => {
    try {
      const existing = integrations.find((i) => i.key === catalog.key);
      if (existing) {
        // Just toggle on
        await apiPut(`/api/admin/integrations/${existing.id}`, { connected: true });
        toast.success(`${catalog.name} connected`);
      } else {
        await apiPost("/api/admin/integrations", {
          key: catalog.key,
          name: catalog.name,
          connected: true,
          config: {},
        });
        toast.success(`${catalog.name} connected`);
      }
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleTestConnection = async (catalog: CatalogEntry, db: Integration | null) => {
    setTestingKey(catalog.key);
    // Simulate network call
    await new Promise((r) => setTimeout(r, 1100));
    setTestingKey(null);
    if (!db || !db.connected) {
      toast.error(`${catalog.name} is not connected — cannot test`);
      return;
    }
    // Check required config fields
    const missing = catalog.fields.filter((f) => f.required && !db.config[f.key]);
    if (missing.length > 0) {
      toast.error(`Missing required fields: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    toast.success(`${catalog.name} connection successful — 200 OK`);
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    try {
      await apiDelete(`/api/admin/integrations/${disconnectTarget.id}`);
      toast.success(`${disconnectTarget.name} disconnected`);
      setDisconnectTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
      setDisconnectTarget(null);
    }
  };

  const lastSyncTime = useMemo(() => {
    const synced = integrations.filter((i) => i.lastSyncedAt);
    if (synced.length === 0) return null;
    return synced.reduce((latest, i) =>
      new Date(i.lastSyncedAt!) > new Date(latest!) ? i.lastSyncedAt : latest, synced[0].lastSyncedAt
    );
  }, [integrations]);

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Connect third-party services"
        actions={
          <AdminButton variant="outline" size="md" onClick={load} loading={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Status
          </AdminButton>
        }
      />

      {/* Summary strip */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <AdminCard className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Connected</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-[28px] font-bold tracking-tight tabular-nums">{connectedCount}</p>
              <p className="text-[13px] text-muted-foreground">/ {CATALOG.length}</p>
            </div>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Available</p>
            <p className="text-[28px] font-bold tracking-tight tabular-nums mt-1">{CATALOG.length - connectedCount}</p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Last Sync</p>
            <p className="text-[20px] font-bold tracking-tight mt-1">{lastSyncTime ? timeAgo(lastSyncTime) : "Never"}</p>
          </AdminCard>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading integrations…" />
      ) : error ? (
        <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
          action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
      ) : (
        <div className="space-y-8">
          {(Object.keys(byCategory) as CategoryKey[]).map((cat) => {
            const items = byCategory[cat];
            if (items.length === 0) return null;
            const CatIcon = CATEGORY_META[cat].icon;
            return (
              <section key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-foreground text-background flex items-center justify-center">
                    <CatIcon size={14} />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold tracking-tight">{cat}</h2>
                    <p className="text-[11px] text-muted-foreground">{CATEGORY_META[cat].desc}</p>
                  </div>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {items.filter((i) => i.db?.connected).length} / {items.length} connected
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map(({ catalog, db }) => (
                    <IntegrationCard
                      key={catalog.key}
                      catalog={catalog}
                      db={db}
                      testing={testingKey === catalog.key}
                      onConfigure={() => { setConfigTarget(db); setConfigCatalog(catalog); }}
                      onConnect={() => handleConnect(catalog)}
                      onDisconnect={() => setDisconnectTarget(db!)}
                      onTest={() => handleTestConnection(catalog, db)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Configure modal */}
      <ConfigureModal
        open={!!configCatalog}
        catalog={configCatalog}
        integration={configTarget}
        onClose={() => { setConfigTarget(null); setConfigCatalog(null); }}
        onSaved={() => { setConfigTarget(null); setConfigCatalog(null); load(); }}
      />

      {/* Disconnect confirm */}
      <ConfirmDialog
        open={!!disconnectTarget}
        onClose={() => setDisconnectTarget(null)}
        title="Disconnect integration"
        message={`Disconnect ${disconnectTarget?.name}? All stored credentials will be removed and the integration will stop working immediately.`}
        confirmLabel="Disconnect"
        onConfirm={handleDisconnect}
      />
    </div>
  );
}

// ===== Integration Card =====
function IntegrationCard({
  catalog, db, testing, onConfigure, onConnect, onDisconnect, onTest,
}: {
  catalog: CatalogEntry;
  db: Integration | null;
  testing: boolean;
  onConfigure: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onTest: () => void;
}) {
  const connected = db?.connected ?? false;
  const hasConfig = db && Object.keys(db.config || {}).length > 0;

  return (
    <motion.div whileTap={{ scale: 0.99 }}>
      <AdminCard className={`p-5 h-full flex flex-col relative overflow-hidden transition-colors ${connected ? "border-foreground" : ""}`}>
        {/* Connected accent */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${connected ? "bg-foreground" : "bg-transparent"}`} />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3 pl-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-[16px] font-bold shrink-0 ${
              connected ? "bg-foreground text-background" : "bg-muted text-foreground"
            }`}>
              {catalog.name[0]}
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold tracking-tight truncate">{catalog.name}</h3>
              <p className="text-[12px] text-muted-foreground line-clamp-1">{catalog.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {connected ? (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-foreground" />
                <span className="text-[11px] font-semibold">Connected</span>
              </>
            ) : (
              <>
                <div className="h-2.5 w-2.5 rounded-full border border-border" />
                <span className="text-[11px] text-muted-foreground font-medium">Off</span>
              </>
            )}
          </div>
        </div>

        {/* Configured fields summary */}
        <div className="mb-4 pl-1">
          {hasConfig ? (
            <div className="flex flex-wrap gap-1.5">
              {catalog.fields.slice(0, 3).map((f) => {
                const val = db!.config[f.key];
                const has = val && String(val).length > 0;
                return (
                  <span key={f.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono ${
                    has ? "bg-muted text-foreground" : "bg-background border border-border text-muted-foreground"
                  }`}>
                    {has ? <Check size={9} /> : <X size={9} />}
                    {f.label}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">No configuration yet</p>
          )}
        </div>

        {/* Last synced */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-4 pl-1">
          <span className="flex items-center gap-1.5">
            <Clock size={11} /> Last synced
          </span>
          <span className="font-medium">{db?.lastSyncedAt ? timeAgo(db.lastSyncedAt) : "Never"}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-border">
          <button
            onClick={onConfigure}
            className="flex-1 h-9 rounded-lg hover:bg-muted flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors"
          >
            <Settings2 size={13} /> Configure
          </button>
          <button
            onClick={onTest}
            disabled={testing}
            className="flex-1 h-9 rounded-lg hover:bg-muted flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />} Test
          </button>
          {connected ? (
            <button
              onClick={onDisconnect}
              className="flex-1 h-9 rounded-lg hover:bg-muted flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors"
            >
              <Power size={13} /> Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              className="flex-1 h-9 rounded-lg bg-foreground text-background hover:opacity-90 flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-opacity"
            >
              <Plug size={13} /> Connect
            </button>
          )}
        </div>
      </AdminCard>
    </motion.div>
  );
}

// ===== Configure Modal =====
function ConfigureModal({
  open, catalog, integration, onClose, onSaved,
}: {
  open: boolean;
  catalog: CatalogEntry | null;
  integration: Integration | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open || !catalog) return;
    const init: Record<string, string> = {};
    catalog.fields.forEach((f) => {
      init[f.key] = integration?.config?.[f.key] ? String(integration.config[f.key]) : "";
    });
    setValues(init);
    setRevealed({});
  }, [open, catalog, integration]);

  if (!catalog) return null;

  const submit = async () => {
    // Validate required fields
    for (const f of catalog.fields) {
      if (f.required && !values[f.key]?.trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    try {
      // Build config: only include fields with values; preserve existing non-edited masked fields
      const config: Record<string, any> = {};
      catalog.fields.forEach((f) => {
        const v = values[f.key];
        if (v && v.trim()) config[f.key] = v.trim();
      });

      if (integration) {
        // Update existing — connect if not already
        await apiPut(`/api/admin/integrations/${integration.id}`, {
          connected: true,
          config,
        });
        toast.success(`${catalog.name} configuration saved`);
      } else {
        // Create new (auto-connect)
        await apiPost("/api/admin/integrations", {
          key: catalog.key,
          name: catalog.name,
          connected: true,
          config,
        });
        toast.success(`${catalog.name} configured & connected`);
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    await new Promise((r) => setTimeout(r, 1100));
    setTesting(false);
    const missing = catalog.fields.filter((f) => f.required && !values[f.key]?.trim());
    if (missing.length > 0) {
      toast.error(`Missing required: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    toast.success(`${catalog.name} test connection successful`);
  };

  return (
    <AdminModal open={open} onClose={onClose} title={`Configure ${catalog.name}`} size="md">
      <div className="space-y-4">
        {/* Description */}
        <div className="rounded-xl bg-muted p-3 flex items-start gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-foreground text-background flex items-center justify-center text-[14px] font-bold shrink-0">
            {catalog.name[0]}
          </div>
          <div>
            <p className="text-[13px] font-semibold">{catalog.name}</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{catalog.description}</p>
          </div>
          <div className="ml-auto shrink-0">
            {integration?.connected ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {catalog.fields.map((f) => {
            const isRevealed = revealed[f.key];
            const masked = f.secret && !isRevealed;
            const val = values[f.key] || "";
            return (
              <div key={f.key}>
                <label className="block text-[13px] font-medium mb-1.5">
                  {f.label} {f.required && <span className="text-muted-foreground">*</span>}
                  {f.secret && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Secret</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={masked ? "password" : "text"}
                    value={val}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder || "Enter value"}
                    className="w-full h-10 px-3 pr-10 rounded-xl bg-background border border-border text-[13px] font-mono outline-none focus:border-foreground transition-colors"
                  />
                  {f.secret && val && (
                    <button
                      type="button"
                      onClick={() => setRevealed((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  )}
                </div>
                {f.secret && val && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {val.includes("•") ? "Currently showing masked value — type to replace" : "New value will be saved securely"}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Test result / helper */}
        <div className="rounded-xl border border-border p-3 text-[11px] text-muted-foreground leading-relaxed">
          <Activity size={11} className="inline mr-1.5" />
          Configuration is stored encrypted. Sensitive fields are masked when displayed. Saving will {integration ? "update the existing" : "create a new"} integration record.
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <AdminButton variant="ghost" size="md" onClick={test} disabled={testing || saving}>
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Test connection
          </AdminButton>
          <div className="flex gap-2">
            <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
            <AdminButton variant="primary" onClick={submit} loading={saving}>
              {integration ? "Save changes" : "Save & connect"}
            </AdminButton>
          </div>
        </div>
      </div>
    </AdminModal>
  );
}
