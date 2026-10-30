"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, RefreshCw, Pencil, Trash2, ShieldAlert, Flag,
  Loader2, Code2, Globe,
} from "lucide-react";
import {
  PageHeader, AdminButton, AdminCard, AdminInput, AdminTextarea,
  Toggle, AdminModal, ConfirmDialog, Badge, EmptyState, LoadingState,
} from "../components/ui";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/admin/api";

// ===== Types =====
interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rolloutPercent: number;
  minAppVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

// ===== Component =====
export function FeaturesScreen() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FeatureFlag | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureFlag | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet<FeatureFlag[]>("/api/admin/features");
      setFlags(data);
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load features: " + e.message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleEnabled = async (f: FeatureFlag) => {
    setTogglingId(f.id);
    // Optimistic update
    setFlags((prev) => prev.map((x) => x.id === f.id ? { ...x, enabled: !f.enabled } : x));
    try {
      await apiPut(`/api/admin/features/${f.id}`, { enabled: !f.enabled });
      toast.success(`${f.name} ${!f.enabled ? "enabled" : "disabled"}`);
    } catch (e: any) {
      // Rollback
      setFlags((prev) => prev.map((x) => x.id === f.id ? { ...x, enabled: f.enabled } : x));
      toast.error(e.message);
    } finally { setTogglingId(null); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/admin/features/${deleteTarget.id}`);
      toast.success("Feature deleted");
      setDeleteTarget(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <div>
      <PageHeader
        title="Feature Flags"
        subtitle="Enable or disable app features remotely"
        actions={
          <>
            <AdminButton variant="outline" size="md" onClick={load} loading={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </AdminButton>
            <AdminButton variant="primary" size="md" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add Feature
            </AdminButton>
          </>
        }
      />

      {/* Summary strip */}
      {!loading && !error && flags.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <AdminCard className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Flags</p>
            <p className="text-[24px] font-bold tracking-tight mt-1 tabular-nums">{flags.length}</p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Enabled</p>
            <p className="text-[24px] font-bold tracking-tight mt-1 tabular-nums">{enabledCount}</p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Disabled</p>
            <p className="text-[24px] font-bold tracking-tight mt-1 tabular-nums text-muted-foreground">{flags.length - enabledCount}</p>
          </AdminCard>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading feature flags…" />
      ) : error ? (
        <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
          action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
      ) : flags.length === 0 ? (
        <EmptyState
          icon={<Flag size={20} />}
          title="No feature flags"
          description="Create your first feature flag to control app functionality remotely."
          action={<AdminButton variant="primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Feature</AdminButton>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {flags.map((f) => (
            <FeatureCard
              key={`${f.id}:${f.rolloutPercent}:${f.minAppVersion ?? ""}:${f.enabled}`}
              flag={f}
              toggling={togglingId === f.id}
              onToggle={() => toggleEnabled(f)}
              onRolloutCommit={async (pct) => {
                try {
                  await apiPut(`/api/admin/features/${f.id}`, { rolloutPercent: pct });
                  setFlags((prev) => prev.map((x) => x.id === f.id ? { ...x, rolloutPercent: pct } : x));
                  toast.success(`Rollout set to ${pct}%`);
                } catch (e: any) { toast.error(e.message); }
              }}
              onMinVersionCommit={async (v) => {
                try {
                  await apiPut(`/api/admin/features/${f.id}`, { minAppVersion: v || null });
                  setFlags((prev) => prev.map((x) => x.id === f.id ? { ...x, minAppVersion: v || null } : x));
                  toast.success("Min app version saved");
                } catch (e: any) { toast.error(e.message); }
              }}
              onEdit={() => setEditTarget(f)}
              onDelete={() => setDeleteTarget(f)}
            />
          ))}
        </div>
      )}

      <FeatureFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); load(); }}
      />
      <FeatureFormModal
        open={!!editTarget}
        flag={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); load(); }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete feature flag"
        message={`Delete “${deleteTarget?.name}” (${deleteTarget?.key})? This will immediately remove the flag from the app config.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={doDelete}
      />
    </div>
  );
}

// ===== Feature Card =====
function FeatureCard({
  flag, toggling, onToggle, onRolloutCommit, onMinVersionCommit, onEdit, onDelete,
}: {
  flag: FeatureFlag;
  toggling: boolean;
  onToggle: () => void;
  onRolloutCommit: (pct: number) => Promise<void>;
  onMinVersionCommit: (v: string) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [rollout, setRollout] = useState(flag.rolloutPercent);
  const [minVersion, setMinVersion] = useState(flag.minAppVersion ?? "");
  const [committingRollout, setCommittingRollout] = useState(false);
  const [committingVersion, setCommittingVersion] = useState(false);

  const commitRollout = (val: number) => {
    if (val === flag.rolloutPercent) return;
    setCommittingRollout(true);
    onRolloutCommit(val).finally(() => setCommittingRollout(false));
  };

  const onSliderInput = (val: number) => {
    setRollout(val);
  };

  const onSliderRelease = () => {
    commitRollout(rollout);
  };

  const commitVersion = () => {
    if ((minVersion || null) === flag.minAppVersion) return;
    setCommittingVersion(true);
    onMinVersionCommit(minVersion).finally(() => setCommittingVersion(false));
  };

  return (
    <motion.div whileTap={{ scale: 0.99 }} layout>
      <AdminCard className={`p-5 h-full flex flex-col relative overflow-hidden ${flag.enabled ? "" : ""}`}>
        {/* Enabled accent: black left border */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${flag.enabled ? "bg-foreground" : "bg-transparent"}`} />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[16px] font-bold tracking-tight truncate">{flag.name}</h3>
              {flag.enabled ? <Badge variant="success">On</Badge> : <Badge variant="outline">Off</Badge>}
            </div>
            <div className="flex items-center gap-1.5">
              <Code2 size={11} className="text-muted-foreground" />
              <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{flag.key}</code>
            </div>
          </div>
        </div>

        {flag.description && (
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 line-clamp-2">{flag.description}</p>
        )}

        {/* Big toggle */}
        <div className={`rounded-xl p-3 mb-4 transition-colors ${flag.enabled ? "bg-foreground/5" : "bg-muted"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold">{flag.enabled ? "Enabled" : "Disabled"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {flag.enabled ? "Active in production" : "Not served to users"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {toggling && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
              <Toggle checked={flag.enabled} onChange={onToggle} />
            </div>
          </div>
        </div>

        {/* Rollout slider */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-semibold flex items-center gap-1.5">
              Rollout
              {committingRollout && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
            </label>
            <span className="text-[13px] font-bold tabular-nums">{rollout}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={rollout}
            onChange={(e) => onSliderInput(parseInt(e.target.value, 10))}
            onPointerUp={onSliderRelease}
            onKeyUp={onSliderRelease}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-foreground
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-sm
              [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>

        {/* Min app version */}
        <div className="mb-4">
          <label className="text-[12px] font-semibold flex items-center gap-1.5 mb-1.5">
            <Globe size={11} className="text-muted-foreground" />
            Min app version
            {committingVersion && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
          </label>
          <input
            type="text"
            value={minVersion}
            onChange={(e) => setMinVersion(e.target.value)}
            onBlur={commitVersion}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            placeholder="e.g. 2.4.1"
            className="w-full h-9 px-3 rounded-lg bg-background border border-border text-[13px] font-mono outline-none focus:border-foreground transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1 mt-auto pt-3 border-t border-border">
          <button onClick={onEdit} className="h-8 px-2.5 rounded-lg hover:bg-muted flex items-center gap-1.5 text-[12px] font-medium">
            <Pencil size={13} /> Edit
          </button>
          <button onClick={onDelete} className="h-8 px-2.5 rounded-lg hover:bg-muted flex items-center gap-1.5 text-[12px] font-medium">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </AdminCard>
    </motion.div>
  );
}

// ===== Feature Form Modal =====
function FeatureFormModal({
  open, onClose, onSaved, flag,
}: {
  open: boolean; onClose: () => void; onSaved: () => void; flag?: FeatureFlag | null;
}) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [rolloutPercent, setRolloutPercent] = useState("0");
  const [minAppVersion, setMinAppVersion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (flag) {
      setKey(flag.key); setName(flag.name); setDescription(flag.description ?? "");
      setEnabled(flag.enabled); setRolloutPercent(String(flag.rolloutPercent));
      setMinAppVersion(flag.minAppVersion ?? "");
    } else {
      setKey(""); setName(""); setDescription("");
      setEnabled(false); setRolloutPercent("0"); setMinAppVersion("");
    }
  }, [open, flag]);

  const submit = async () => {
    if (!key || !name) { toast.error("Key and name are required"); return; }
    setSaving(true);
    const body = {
      key, name,
      description: description || null,
      enabled,
      rolloutPercent: parseInt(rolloutPercent, 10) || 0,
      minAppVersion: minAppVersion || null,
    };
    try {
      if (flag) {
        await apiPut(`/api/admin/features/${flag.id}`, body);
        toast.success("Feature updated");
      } else {
        await apiPost("/api/admin/features", body);
        toast.success("Feature created");
      }
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // Normalize key to UPPER_SNAKE_CASE as user types
  const onKeyChange = (v: string) => {
    setKey(v.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, ""));
  };

  return (
    <AdminModal open={open} onClose={onClose} title={flag ? "Edit feature flag" : "Add feature flag"} size="md">
      <div className="space-y-4">
        <AdminInput label="Name" value={name} onChange={setName} placeholder="AI Expense Insights" required />
        <AdminInput label="Key" value={key} onChange={onKeyChange} placeholder="AI_EXPENSE_INSIGHTS" required />
        {key && <p className="text-[11px] text-muted-foreground -mt-2">Identifier: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{key}</code></p>}
        <AdminTextarea label="Description" value={description} onChange={setDescription} rows={2} placeholder="What does this flag control?" />
        <div className="grid grid-cols-2 gap-3">
          <AdminInput label="Rollout %" value={rolloutPercent} onChange={setRolloutPercent} type="number" />
          <AdminInput label="Min app version" value={minAppVersion} onChange={setMinAppVersion} placeholder="2.4.1" />
        </div>
        <div className="rounded-xl bg-muted p-3">
          <Toggle checked={enabled} onChange={setEnabled} label="Enabled" description="Master switch — turns the feature on for eligible users" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={submit} loading={saving}>{flag ? "Save changes" : "Create flag"}</AdminButton>
        </div>
      </div>
    </AdminModal>
  );
}
