"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, RefreshCw, Pencil, Trash2, ShieldAlert, Code2, Loader2,
  ChevronDown, ChevronRight, Save, AlertTriangle, Type, Hash, Braces, Settings2, ToggleRight,
  Apple, Play, Upload, ExternalLink, CheckCircle2,
} from "lucide-react";
import {
  PageHeader, AdminButton, AdminCard, AdminInput, AdminTextarea,
  AdminSelect, Toggle, AdminModal, ConfirmDialog, Badge, EmptyState, LoadingState,
} from "../components/ui";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/admin/api";

// ===== Types =====
type ConfigType = "STRING" | "BOOLEAN" | "NUMBER" | "JSON";

interface RemoteConfig {
  id: string;
  key: string;
  value: string;
  type: ConfigType;
  description: string | null;
  updatedAt: string;
}

// ===== Helpers =====
function parseValue(value: string, type: ConfigType): any {
  if (type === "BOOLEAN") return value === "true" || value === "1";
  if (type === "NUMBER") {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  if (type === "JSON") {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}

function formatValue(value: string, type: ConfigType): string {
  if (type === "JSON") {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  return value;
}

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

const TYPE_META: Record<ConfigType, { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }> = {
  STRING: { icon: Type, label: "String" },
  BOOLEAN: { icon: ToggleRight, label: "Boolean" },
  NUMBER: { icon: Hash, label: "Number" },
  JSON: { icon: Braces, label: "JSON" },
};

// ===== Component =====
export function ConfigScreen() {
  const [configs, setConfigs] = useState<RemoteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RemoteConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RemoteConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet<RemoteConfig[]>("/api/admin/config");
      setConfigs(data);
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load config: " + e.message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/admin/config/${deleteTarget.id}`);
      toast.success("Config deleted");
      setDeleteTarget(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  // Sort: maintenance_mode always first, then alphabetical
  const sorted = [...configs].sort((a, b) => {
    if (a.key === "maintenance_mode" && b.key !== "maintenance_mode") return -1;
    if (b.key === "maintenance_mode" && a.key !== "maintenance_mode") return 1;
    return a.key.localeCompare(b.key);
  });

  const enabledCount = configs.filter((c) => c.type === "BOOLEAN" && parseValue(c.value, "BOOLEAN")).length;
  const maintenanceOn = configs.some((c) => c.key === "maintenance_mode" && parseValue(c.value, "BOOLEAN"));

  return (
    <div>
      <PageHeader
        title="Remote Configuration"
        subtitle="Control app behavior remotely without app updates"
        actions={
          <>
            <AdminButton variant="outline" size="md" onClick={load} loading={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </AdminButton>
            <AdminButton variant="primary" size="md" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add Config
            </AdminButton>
          </>
        }
      />

      {/* Demo page download buttons — link / file upload control */}
      {!loading && !error && <DemoDownloadCard configs={configs} onSaved={load} />}

      {/* Summary strip */}
      {!loading && !error && configs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <AdminCard className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Keys</p>
            <p className="text-[24px] font-bold tracking-tight mt-1 tabular-nums">{configs.length}</p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Boolean ON</p>
            <p className="text-[24px] font-bold tracking-tight mt-1 tabular-nums">{enabledCount}</p>
          </AdminCard>
          <AdminCard className={`p-4 ${maintenanceOn ? "border-foreground" : ""}`}>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Maintenance</p>
            <p className={`text-[24px] font-bold tracking-tight mt-1 tabular-nums ${maintenanceOn ? "" : "text-muted-foreground"}`}>
              {maintenanceOn ? "ACTIVE" : "Off"}
            </p>
          </AdminCard>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading remote config…" />
      ) : error ? (
        <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
          action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Settings2 size={20} />}
          title="No remote config"
          description="Create your first configuration key to control the app remotely without shipping an update."
          action={<AdminButton variant="primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Config</AdminButton>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((c) => (
            <ConfigCard
              key={c.id}
              config={c}
              onSaved={() => load()}
              onEdit={() => setEditTarget(c)}
              onDelete={() => setDeleteTarget(c)}
            />
          ))}
        </div>
      )}

      <ConfigFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); load(); }}
      />
      <ConfigFormModal
        open={!!editTarget}
        config={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); load(); }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete config key"
        message={`Delete “${deleteTarget?.key}”? This will immediately affect any code reading this config value.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={doDelete}
      />
    </div>
  );
}

// ===== Config Card =====
function ConfigCard({
  config, onSaved, onEdit, onDelete,
}: {
  config: RemoteConfig;
  onSaved: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isMaintenance = config.key === "maintenance_mode";
  const isMaintenanceOn = isMaintenance && parseValue(config.value, "BOOLEAN");

  // Local value state for STRING/NUMBER/JSON editors (so card remounts after save)
  const [localValue, setLocalValue] = useState(() => formatValue(config.value, config.type));
  const [jsonOpen, setJsonOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLocalValue(formatValue(config.value, config.type));
    setDirty(false);
  }, [config.value, config.type]);

  const commitValue = async (newValue: any) => {
    setSaving(true);
    try {
      await apiPut(`/api/admin/config/${config.id}`, { value: String(newValue) });
      toast.success(`Saved “${config.key}”`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const toggleBoolean = async (next: boolean) => {
    setSaving(true);
    try {
      await apiPut(`/api/admin/config/${config.id}`, { value: String(next) });
      toast.success(`“${config.key}” ${next ? "enabled" : "disabled"}`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const onSaveText = async () => {
    if (!dirty) return;
    let toSend: any = localValue;
    if (config.type === "JSON") {
      try { JSON.parse(localValue); }
      catch (e: any) { toast.error("Invalid JSON: " + e.message); return; }
      toSend = localValue; // store pretty string; API will String() it
    }
    if (config.type === "NUMBER") {
      if (Number.isNaN(Number(localValue))) { toast.error("Invalid number"); return; }
    }
    await commitValue(toSend);
  };

  const TypeIcon = TYPE_META[config.type].icon;

  return (
    <motion.div whileTap={{ scale: 0.99 }} layout>
      <AdminCard className={`p-5 h-full flex flex-col relative overflow-hidden transition-colors
        ${isMaintenanceOn ? "bg-foreground text-background" : isMaintenance ? "border-foreground" : ""}`}>

        {/* Maintenance warning accent */}
        {isMaintenance && (
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${isMaintenanceOn ? "bg-background" : "bg-foreground"}`} />
        )}
        {!isMaintenance && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent" />
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2 pl-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {isMaintenance && (
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0
                  ${isMaintenanceOn ? "bg-background text-foreground" : "bg-foreground text-background"}`}>
                  <AlertTriangle size={13} />
                </div>
              )}
              <h3 className="text-[15px] font-bold tracking-tight truncate">{config.key}</h3>
              <Badge variant={isMaintenanceOn ? "warning" : "outline"}>
                <TypeIcon size={10} /> {TYPE_META[config.type].label}
              </Badge>
            </div>
            {config.description && (
              <p className={`text-[12px] leading-relaxed line-clamp-2 ${isMaintenanceOn ? "text-background/70" : "text-muted-foreground"}`}>
                {config.description}
              </p>
            )}
          </div>
        </div>

        {/* Maintenance banner */}
        {isMaintenance && (
          <div className={`rounded-xl px-3 py-2 mb-3 mt-1 mx-1 flex items-center gap-2 text-[11px] font-semibold
            ${isMaintenanceOn ? "bg-background text-foreground" : "bg-muted text-foreground"}`}>
            <AlertTriangle size={11} />
            CRITICAL — affects all users
          </div>
        )}

        {/* Value editor */}
        <div className="flex-1 mb-3 px-1">
          {config.type === "BOOLEAN" ? (
            <div className={`rounded-xl p-3 transition-colors
              ${isMaintenanceOn ? "bg-background/10" : "bg-muted"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">{parseValue(config.value, "BOOLEAN") ? "Enabled" : "Disabled"}</p>
                  <p className={`text-[11px] mt-0.5 ${isMaintenanceOn ? "text-background/70" : "text-muted-foreground"}`}>
                    {parseValue(config.value, "BOOLEAN") ? "Served to clients" : "Currently off"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {saving && <Loader2 size={13} className={`animate-spin ${isMaintenanceOn ? "text-background" : "text-muted-foreground"}`} />}
                  <button
                    type="button"
                    onClick={() => toggleBoolean(!parseValue(config.value, "BOOLEAN"))}
                    disabled={saving}
                    className={`relative h-7 w-12 rounded-full transition-colors shrink-0
                      ${parseValue(config.value, "BOOLEAN") ? "bg-background" : "bg-muted-foreground/40"}`}
                  >
                    <motion.div
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={`absolute top-0.5 h-6 w-6 rounded-full shadow-sm
                        ${parseValue(config.value, "BOOLEAN") ? "left-[22px] bg-foreground" : "left-0.5 bg-background"}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ) : config.type === "STRING" ? (
            <div>
              <input
                type="text"
                value={localValue}
                onChange={(e) => { setLocalValue(e.target.value); setDirty(true); }}
                onBlur={onSaveText}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className={`w-full h-10 px-3 rounded-xl bg-background border border-border text-[13px] font-mono outline-none focus:border-foreground transition-colors
                  ${isMaintenanceOn ? "bg-background text-foreground" : ""}`}
              />
              {dirty && (
                <button
                  onClick={onSaveText}
                  className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground"
                >
                  <Save size={11} /> Save changes
                </button>
              )}
            </div>
          ) : config.type === "NUMBER" ? (
            <div>
              <input
                type="number"
                value={localValue}
                onChange={(e) => { setLocalValue(e.target.value); setDirty(true); }}
                onBlur={onSaveText}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className={`w-full h-10 px-3 rounded-xl bg-background border border-border text-[13px] font-mono outline-none focus:border-foreground transition-colors tabular-nums
                  ${isMaintenanceOn ? "bg-background text-foreground" : ""}`}
              />
              {dirty && (
                <button
                  onClick={onSaveText}
                  className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold"
                >
                  <Save size={11} /> Save changes
                </button>
              )}
            </div>
          ) : config.type === "JSON" ? (
            <div>
              <button
                onClick={() => setJsonOpen((v) => !v)}
                className="flex items-center gap-1.5 text-[12px] font-semibold mb-2"
              >
                {jsonOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Code2 size={12} /> {jsonOpen ? "Hide editor" : "Show JSON editor"}
              </button>
              <AnimatePresence initial={false}>
                {jsonOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      value={localValue}
                      onChange={(e) => { setLocalValue(e.target.value); setDirty(true); }}
                      rows={6}
                      spellCheck={false}
                      className={`w-full px-3 py-2 rounded-xl bg-background border border-border text-[12px] font-mono outline-none focus:border-foreground transition-colors resize-none
                        ${isMaintenanceOn ? "bg-background text-foreground" : ""}`}
                    />
                    <div className="flex items-center justify-between mt-2">
                      {dirty ? (
                        <button
                          onClick={onSaveText}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
                        >
                          <Save size={11} /> Save JSON
                        </button>
                      ) : <span className="text-[11px] text-muted-foreground">Pretty-printed</span>}
                      {saving && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
                    </div>
                  </motion.div>
                ) : (
                  <div className={`rounded-xl p-2.5 text-[11px] font-mono overflow-x-auto thin-scrollbar
                    ${isMaintenanceOn ? "bg-background/10" : "bg-muted"}`}>
                    <pre className="whitespace-pre">{localValue || "{}"}</pre>
                  </div>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </div>

        {/* Footer: time + actions */}
        <div className={`flex items-center justify-between mt-auto pt-3 border-t px-1
          ${isMaintenanceOn ? "border-background/20" : "border-border"}`}>
          <p className={`text-[11px] ${isMaintenanceOn ? "text-background/60" : "text-muted-foreground"}`}>
            Updated {timeAgo(config.updatedAt)}
          </p>
          <div className="flex items-center gap-1">
            {saving && <Loader2 size={11} className={`animate-spin ${isMaintenanceOn ? "text-background" : "text-muted-foreground"}`} />}
            <button
              onClick={onEdit}
              className={`h-7 px-2 rounded-lg flex items-center gap-1.5 text-[12px] font-medium transition-colors
                ${isMaintenanceOn ? "hover:bg-background/10" : "hover:bg-muted"}`}
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={onDelete}
              className={`h-7 px-2 rounded-lg flex items-center gap-1.5 text-[12px] font-medium transition-colors
                ${isMaintenanceOn ? "hover:bg-background/10" : "hover:bg-muted"}`}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </AdminCard>
    </motion.div>
  );
}

// ===== Config Form Modal =====
function ConfigFormModal({
  open, onClose, onSaved, config,
}: {
  open: boolean; onClose: () => void; onSaved: () => void; config?: RemoteConfig | null;
}) {
  const [key, setKey] = useState("");
  const [type, setType] = useState<ConfigType>("STRING");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (config) {
      setKey(config.key);
      setType(config.type);
      setValue(formatValue(config.value, config.type));
      setDescription(config.description ?? "");
    } else {
      setKey(""); setType("STRING"); setValue(""); setDescription("");
    }
  }, [open, config]);

  const submit = async () => {
    if (!key) { toast.error("Key is required"); return; }
    setSaving(true);
    try {
      let toSend: any = value;
      if (type === "BOOLEAN") toSend = value === "true" || value === "1" ? "true" : "false";
      if (type === "JSON" && value) {
        try { JSON.parse(value); } catch (e: any) { toast.error("Invalid JSON: " + e.message); setSaving(false); return; }
      }
      if (type === "NUMBER" && value && Number.isNaN(Number(value))) {
        toast.error("Invalid number"); setSaving(false); return;
      }
      if (config) {
        await apiPut(`/api/admin/config/${config.id}`, {
          type, description: description || null, value: String(toSend),
        });
        toast.success("Config updated");
      } else {
        await apiPost("/api/admin/config", {
          key, type, value: String(toSend), description: description || null,
        });
        toast.success("Config created");
      }
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // Normalize key to snake_case as user types
  const onKeyChange = (v: string) => {
    setKey(v.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  };

  return (
    <AdminModal open={open} onClose={onClose} title={config ? "Edit config" : "Add config"} size="md">
      <div className="space-y-4">
        <AdminInput label="Key" value={key} onChange={onKeyChange} placeholder="maintenance_mode" required />
        {key && <p className="text-[11px] text-muted-foreground -mt-2">Identifier: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{key}</code></p>}

        <AdminSelect
          label="Type"
          value={type}
          onChange={(v) => {
            setType(v as ConfigType);
            if (v === "BOOLEAN") setValue("false");
            else if (v === "JSON") setValue(value || "{}");
            else setValue("");
          }}
          options={[
            { value: "STRING", label: "String" },
            { value: "BOOLEAN", label: "Boolean" },
            { value: "NUMBER", label: "Number" },
            { value: "JSON", label: "JSON" },
          ]}
        />

        {type === "BOOLEAN" ? (
          <div className="rounded-xl bg-muted p-3">
            <Toggle
              checked={value === "true"}
              onChange={(v) => setValue(v ? "true" : "false")}
              label="Enabled"
              description="Master boolean value for this config"
            />
          </div>
        ) : type === "JSON" ? (
          <AdminTextarea
            label="Value (JSON)"
            value={value}
            onChange={setValue}
            rows={6}
            placeholder='{"key":"value"}'
          />
        ) : (
          <AdminInput
            label="Value"
            value={value}
            onChange={setValue}
            type={type === "NUMBER" ? "number" : "text"}
            placeholder={type === "NUMBER" ? "0" : "any string"}
          />
        )}

        <AdminTextarea label="Description" value={description} onChange={setDescription} rows={2} placeholder="What does this config control?" />

        <div className="flex justify-end gap-2 pt-1">
          <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={submit} loading={saving}>{config ? "Save changes" : "Create config"}</AdminButton>
        </div>
      </div>
    </AdminModal>
  );
}

// ===== Demo Page — Download Buttons (App Store / Google Play) =====
function DemoDownloadCard({ configs, onSaved }: { configs: RemoteConfig[]; onSaved: () => void }) {
  const ios = configs.find((c) => c.key === "landing_ios_url") ?? null;
  const android = configs.find((c) => c.key === "landing_android_url") ?? null;

  return (
    <AdminCard className="p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold tracking-tight">Demo Page — Download Buttons</h3>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed max-w-2xl">
            Controls where the <b>App Store</b> and <b>Google Play</b> buttons on the <code className="font-mono bg-muted px-1.5 py-0.5 rounded">/demo</code> page point.
            Koi bhi link paste karein, ya file upload karein (APK / IPA / PDF — up to 100 MB) — button us file ko download karega.
          </p>
        </div>
        <span className="shrink-0"><Badge variant="outline">/demo</Badge></span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DownloadButtonRow
          label="App Store (iOS)"
          configKey="landing_ios_url"
          icon={<Apple size={17} />}
          placeholder="https://apps.apple.com/app/trackly"
          config={ios}
          onSaved={onSaved}
        />
        <DownloadButtonRow
          label="Google Play (Android)"
          configKey="landing_android_url"
          icon={<Play size={16} className="fill-current" />}
          placeholder="https://play.google.com/store/apps/details?id=app.trackly"
          config={android}
          onSaved={onSaved}
        />
      </div>
    </AdminCard>
  );
}

function DownloadButtonRow({
  label, configKey, icon, placeholder, config, onSaved,
}: {
  label: string;
  configKey: string;
  icon: React.ReactNode;
  placeholder: string;
  config: RemoteConfig | null;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(config?.value ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<{ originalName: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setValue(config?.value ?? "");
    setUploaded(null);
  }, [config?.id, config?.value]);

  const savedValue = config?.value ?? "";
  const dirty = value.trim() !== savedValue.trim();
  const isUploadedFile = value.trim().startsWith("/api/uploads/");

  const validate = (v: string): string | null => {
    const t = v.trim();
    if (!t) return "Paste a link or upload a file — value cannot be empty.";
    if (!/^https?:\/\//.test(t) && !t.startsWith("/api/uploads/")) {
      return "Link must start with https:// (or upload a file).";
    }
    return null;
  };

  const save = async () => {
    const err = validate(value);
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const v = value.trim();
      if (config) {
        await apiPut(`/api/admin/config/${config.id}`, { value: v });
      } else {
        await apiPost("/api/admin/config", {
          key: configKey,
          type: "STRING",
          value: v,
          description: `${label} download button on the /demo landing page`,
        });
      }
      toast.success(`${label} button link saved`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
      setSaving(false);
    }
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size <= 0) { toast.error("File is empty"); return; }
    if (file.size > 100 * 1024 * 1024) { toast.error("File too large (max 100 MB)"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
      setValue(data.url);
      setUploaded({ originalName: data.originalName, size: data.size });
      toast.success(`"${data.originalName}" uploaded — ab Save dabayein`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

  return (
    <div className={`rounded-2xl border p-4 ${config ? "border-border bg-muted/40" : "border-dashed border-border"}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-8 w-8 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-tight">{label}</p>
          <p className="text-[11px] text-muted-foreground font-mono truncate">{configKey}</p>
        </div>
        {isUploadedFile && <span className="shrink-0"><Badge variant="success">File</Badge></span>}
      </div>

      {/* Link input */}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-[12px] font-mono outline-none focus:border-foreground transition-colors"
      />

      {/* Status line */}
      {uploaded ? (
        <p className="flex items-center gap-1.5 text-[11px] mt-2 text-foreground font-medium">
          <CheckCircle2 size={12} className="shrink-0" />
          Uploaded: {uploaded.originalName} · {fmtSize(uploaded.size)} — ab Save dabayein
        </p>
      ) : isUploadedFile ? (
        <p className="text-[11px] text-muted-foreground mt-2">Button will download this uploaded file.</p>
      ) : !config ? (
        <p className="text-[11px] text-muted-foreground mt-2">Key DB me nahi hai — Save karne par create ho jayega.</p>
      ) : null}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <AdminButton variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading || saving}>
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? "Uploading…" : "Upload file"}
        </AdminButton>
        {value.trim() && (
          <a
            href={value.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-semibold hover:bg-muted transition-colors"
          >
            Test <ExternalLink size={11} />
          </a>
        )}
        <div className="ml-auto">
          <AdminButton variant="primary" size="sm" onClick={save} loading={saving} disabled={!dirty || uploading}>
            <Save size={12} /> Save
          </AdminButton>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          onPickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
