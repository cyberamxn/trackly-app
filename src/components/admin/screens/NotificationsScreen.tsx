"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, RefreshCw, Trash2, ShieldAlert, Bell, Send, Clock, Eye,
  Loader2, X, Users, Globe, Smartphone, Tag, ChevronDown, ChevronRight,
  Check, Search, Calendar, Inbox,
} from "lucide-react";
import {
  PageHeader, AdminButton, AdminCard, AdminInput, AdminTextarea,
  AdminSelect, Toggle, AdminModal, ConfirmDialog, KpiCard, Badge,
  StatusPill, EmptyState, LoadingState,
} from "../components/ui";
import { apiGet, apiPost, apiDelete } from "@/lib/admin/api";

// ===== Types =====
type TargetType = "ALL" | "PREMIUM" | "FREE" | "SELECTED" | "COUNTRY" | "VERSION" | "DEVICE";

interface PushNotification {
  id: string;
  title: string;
  body: string;
  target: TargetType | string;
  targetValue: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  status: string; // DRAFT | SCHEDULED | SENT | FAILED
  sentCount: number;
  openedCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AppUser {
  id: string;
  email: string;
  name: string;
}

const TARGET_META: Record<string, { label: string; icon: typeof Users }> = {
  ALL: { label: "All Users", icon: Users },
  PREMIUM: { label: "Premium", icon: Tag },
  FREE: { label: "Free", icon: Tag },
  SELECTED: { label: "Selected", icon: Users },
  COUNTRY: { label: "Country", icon: Globe },
  VERSION: { label: "App Version", icon: Smartphone },
  DEVICE: { label: "Device", icon: Smartphone },
};

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
];

// ===== Helpers =====
function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
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
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function openRate(n: PushNotification): number {
  if (n.sentCount <= 0) return 0;
  return Math.round((n.openedCount / n.sentCount) * 100);
}

// Local datetime input value (yyyy-MM-ddTHH:mm) for <input type=datetime-local>
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ===== Component =====
export function NotificationsScreen() {
  const [items, setItems] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [composeOpen, setComposeOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PushNotification | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PushNotification | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet<PushNotification[]>("/api/admin/notifications");
      setItems(data);
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load notifications: " + e.message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/admin/notifications/${deleteTarget.id}`);
      toast.success("Notification deleted");
      setDeleteTarget(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  const filtered = filter === "ALL" ? items : items.filter((n) => n.status === filter);

  // KPIs
  const sent = items.filter((n) => n.status === "SENT");
  const totalSentCount = sent.reduce((a, n) => a + n.sentCount, 0);
  const totalOpens = sent.reduce((a, n) => a + n.openedCount, 0);
  const avgOpen = totalSentCount > 0 ? Math.round((totalOpens / totalSentCount) * 100) : 0;
  const scheduled = items.filter((n) => n.status === "SCHEDULED").length;

  return (
    <div>
      <PageHeader
        title="Notification Center"
        subtitle="Send push notifications to targeted user segments"
        actions={
          <>
            <AdminButton variant="outline" size="md" onClick={load} loading={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </AdminButton>
            <AdminButton variant="primary" size="md" onClick={() => setComposeOpen(true)}>
              <Plus size={14} /> Compose
            </AdminButton>
          </>
        }
      />

      {/* KPI row */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KpiCard label="Total Sent" value={totalSentCount.toLocaleString("en-IN")} icon={<Send size={18} />} />
          <KpiCard label="Avg Open Rate" value={`${avgOpen}%`} icon={<Eye size={18} />} trend={avgOpen >= 20 ? "up" : "neutral"} delta={avgOpen >= 20 ? "healthy" : "low"} />
          <KpiCard label="Scheduled" value={scheduled} icon={<Clock size={18} />} />
        </div>
      )}

      {/* Filters */}
      {!loading && !error && items.length > 0 && (
        <div className="flex items-center gap-1 mb-4 overflow-x-auto thin-scrollbar -mx-1 px-1">
          {STATUS_FILTERS.map((f) => {
            const count = f.value === "ALL" ? items.length : items.filter((n) => n.status === f.value).length;
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`relative h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors
                  ${active ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70"}`}
              >
                {f.label}
                <span className={`ml-1.5 text-[11px] ${active ? "opacity-70" : "text-muted-foreground"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading notifications…" />
      ) : error ? (
        <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
          action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox size={20} />}
          title={items.length === 0 ? "No notifications yet" : "Nothing matches the filter"}
          description={items.length === 0
            ? "Compose your first push notification to engage your users."
            : "Try a different status filter to see more notifications."}
          action={items.length === 0
            ? <AdminButton variant="primary" onClick={() => setComposeOpen(true)}><Plus size={14} /> Compose</AdminButton>
            : <AdminButton variant="outline" onClick={() => setFilter("ALL")}>Clear filter</AdminButton>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationRow
              key={n.id}
              n={n}
              onClick={() => setDetailTarget(n)}
              onDelete={() => setDeleteTarget(n)}
            />
          ))}
        </div>
      )}

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSaved={() => { setComposeOpen(false); load(); }}
      />

      <DetailModal
        n={detailTarget}
        onClose={() => setDetailTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete notification"
        message={`Delete “${deleteTarget?.title}”? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={doDelete}
      />
    </div>
  );
}

// ===== Notification Row =====
function NotificationRow({
  n, onClick, onDelete,
}: {
  n: PushNotification;
  onClick: () => void;
  onDelete: () => void;
}) {
  const TargetIcon = TARGET_META[n.target]?.icon ?? Users;
  const targetLabel = TARGET_META[n.target]?.label ?? n.target;
  const rate = openRate(n);

  return (
    <motion.div whileTap={{ scale: 0.995 }} layout>
      <AdminCard className="p-4 hover:border-foreground/30 transition-colors" onClick={onClick}>
        <div className="flex items-start gap-4">
          {/* Status indicator */}
          <div className="hidden sm:flex h-10 w-10 rounded-xl bg-muted items-center justify-center shrink-0">
            <Bell size={16} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-[15px] font-bold tracking-tight truncate">{n.title}</h3>
                  <StatusPill status={n.status} />
                </div>
                <p className="text-[13px] text-muted-foreground line-clamp-1">{n.body}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap text-[12px] mt-2">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <TargetIcon size={11} /> {targetLabel}
              </span>
              {n.status === "SENT" && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Send size={11} /> {n.sentCount.toLocaleString("en-IN")} delivered
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Eye size={11} /> {rate}% open rate
                  </span>
                </>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock size={11} />
                {n.status === "SCHEDULED" ? `Scheduled ${fmtDateTime(n.scheduledAt)}` :
                 n.status === "SENT" ? `Sent ${timeAgo(n.sentAt ?? n.createdAt)}` :
                 `Created ${timeAgo(n.createdAt)}`}
              </span>
            </div>
          </div>
        </div>
      </AdminCard>
    </motion.div>
  );
}

// ===== Detail Modal =====
function DetailModal({ n, onClose }: { n: PushNotification | null; onClose: () => void }) {
  if (!n) return null;
  const TargetIcon = TARGET_META[n.target]?.icon ?? Users;
  const targetLabel = TARGET_META[n.target]?.label ?? n.target;
  const rate = openRate(n);
  const delivered = n.sentCount;
  const opened = n.openedCount;

  return (
    <AdminModal open={!!n} onClose={onClose} title="Notification details" size="md">
      <div className="space-y-4">
        {/* iOS preview */}
        <div className="rounded-2xl bg-foreground text-background p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-background/15 flex items-center justify-center shrink-0">
              <Bell size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[12px] font-semibold uppercase tracking-wide opacity-70">Trackly</p>
                <p className="text-[11px] opacity-60">now</p>
              </div>
              <p className="text-[14px] font-bold leading-snug">{n.title}</p>
              <p className="text-[13px] opacity-80 leading-snug mt-0.5">{n.body}</p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Delivered</p>
            <p className="text-[20px] font-bold tracking-tight mt-1 tabular-nums">{delivered.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Opened</p>
            <p className="text-[20px] font-bold tracking-tight mt-1 tabular-nums">{opened.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Open Rate</p>
            <p className="text-[20px] font-bold tracking-tight mt-1 tabular-nums">{rate}%</p>
          </div>
        </div>

        {/* Metadata */}
        <div className="rounded-xl border border-border p-4 space-y-2 text-[13px]">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Status</span>
            <StatusPill status={n.status} />
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Target</span>
            <span className="font-medium inline-flex items-center gap-1.5"><TargetIcon size={12} /> {targetLabel}</span>
          </div>
          {n.targetValue && (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Target value</span>
              <code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded">{n.targetValue}</code>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">{fmtDateTime(n.createdAt)}</span>
          </div>
          {n.sentAt && (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Sent</span>
              <span className="font-medium">{fmtDateTime(n.sentAt)}</span>
            </div>
          )}
          {n.scheduledAt && (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Scheduled for</span>
              <span className="font-medium">{fmtDateTime(n.scheduledAt)}</span>
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
}

// ===== Compose Modal =====
function ComposeModal({
  open, onClose, onSaved,
}: {
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<TargetType>("ALL");
  const [targetValue, setTargetValue] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "schedule" | "draft">("now");
  const [saving, setSaving] = useState(false);

  // Selected users multi-select
  const [users, setUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [usersPanelOpen, setUsersPanelOpen] = useState(false);

  // Load users when target becomes SELECTED
  useEffect(() => {
    if (!open) return;
    if (target === "SELECTED" && users.length === 0) {
      setUsersLoading(true);
      apiGet<{ users: AppUser[]; total: number }>("/api/admin/users?limit=100")
        .then((d) => setUsers(d.users || []))
        .catch(() => toast.error("Failed to load users"))
        .finally(() => setUsersLoading(false));
    }
  }, [open, target, users.length]);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setTitle(""); setBody(""); setTarget("ALL"); setTargetValue("");
    setScheduledAt(""); setSendMode("now"); setSelectedUserIds([]);
    setUserSearch(""); setUsersPanelOpen(false);
  }, [open]);

  const TITLE_MAX = 50;
  const BODY_MAX = 200;

  const submit = async () => {
    if (!title || !body) { toast.error("Title and body are required"); return; }
    if (title.length > TITLE_MAX) { toast.error(`Title must be ≤ ${TITLE_MAX} chars`); return; }
    if (body.length > BODY_MAX) { toast.error(`Body must be ≤ ${BODY_MAX} chars`); return; }

    let finalTargetValue: string | null = null;
    if (target === "SELECTED") {
      if (selectedUserIds.length === 0) { toast.error("Select at least one user"); return; }
      finalTargetValue = JSON.stringify(selectedUserIds);
    } else if (target === "COUNTRY") {
      if (!targetValue.trim()) { toast.error("Country code required"); return; }
      finalTargetValue = targetValue.trim().toUpperCase();
    } else if (target === "VERSION") {
      if (!targetValue.trim()) { toast.error("App version required"); return; }
      finalTargetValue = targetValue.trim();
    } else if (target === "DEVICE") {
      if (!targetValue.trim()) { toast.error("Device type required"); return; }
      finalTargetValue = targetValue.trim().toUpperCase();
    }

    const payload: any = { title, body, target, targetValue: finalTargetValue };
    if (sendMode === "schedule") {
      if (!scheduledAt) { toast.error("Pick a schedule time"); return; }
      payload.scheduledAt = new Date(scheduledAt).toISOString();
      payload.sendNow = false;
    } else if (sendMode === "now") {
      payload.sendNow = true;
    } else {
      // draft
      payload.sendNow = false;
    }

    setSaving(true);
    try {
      await apiPost("/api/admin/notifications", payload);
      toast.success(
        sendMode === "now" ? "Notification sent" :
        sendMode === "schedule" ? "Notification scheduled" :
        "Saved as draft"
      );
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const TargetIcon = TARGET_META[target]?.icon ?? Users;

  // Filter users for multi-select
  const filteredUsers = users.filter((u) =>
    !userSearch ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Compose notification" size="xl">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: form */}
        <div className="lg:col-span-3 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium">Title <span className="text-muted-foreground">*</span></label>
              <span className={`text-[11px] tabular-nums ${title.length > TITLE_MAX ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX + 10))}
              placeholder="Push title"
              className="w-full h-10 px-3 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium">Body <span className="text-muted-foreground">*</span></label>
              <span className={`text-[11px] tabular-nums ${body.length > BODY_MAX ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {body.length}/{BODY_MAX}
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX + 10))}
              rows={4}
              placeholder="What should we tell users?"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors resize-none"
            />
          </div>

          <AdminSelect
            label="Target audience"
            value={target}
            onChange={(v) => { setTarget(v as TargetType); setTargetValue(""); setSelectedUserIds([]); }}
            options={[
              { value: "ALL", label: "All Users" },
              { value: "PREMIUM", label: "Premium Users" },
              { value: "FREE", label: "Free Users" },
              { value: "SELECTED", label: "Selected Users" },
              { value: "COUNTRY", label: "Country" },
              { value: "VERSION", label: "App Version" },
              { value: "DEVICE", label: "Device Type" },
            ]}
          />

          {/* Conditional target value */}
          {target === "SELECTED" && (
            <div>
              <label className="block text-[13px] font-medium mb-1.5">Selected users</label>
              <button
                onClick={() => setUsersPanelOpen((v) => !v)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Users size={14} className="text-muted-foreground" />
                  <span className={selectedUserIds.length === 0 ? "text-muted-foreground" : ""}>
                    {selectedUserIds.length === 0 ? "Select users" : `${selectedUserIds.length} user${selectedUserIds.length === 1 ? "" : "s"} selected`}
                  </span>
                </span>
                {usersPanelOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <AnimatePresence initial={false}>
                {usersPanelOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 rounded-xl border border-border">
                      <div className="p-2 border-b border-border">
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Search by name or email"
                            className="w-full h-9 pl-8 pr-3 rounded-lg bg-muted text-[13px] outline-none focus:bg-background focus:ring-1 focus:ring-foreground"
                          />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto thin-scrollbar">
                        {usersLoading ? (
                          <div className="p-4 flex justify-center"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
                        ) : filteredUsers.length === 0 ? (
                          <p className="p-4 text-[13px] text-muted-foreground text-center">No users found</p>
                        ) : (
                          filteredUsers.map((u) => {
                            const checked = selectedUserIds.includes(u.id);
                            return (
                              <button
                                key={u.id}
                                onClick={() => toggleUser(u.id)}
                                className={`w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0`}
                              >
                                <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0
                                  ${checked ? "bg-foreground border-foreground" : "border-border"}`}>
                                  {checked && <Check size={12} className="text-background" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[13px] font-medium truncate">{u.name}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )}

          {target === "COUNTRY" && (
            <AdminInput
              label="Country code"
              value={targetValue}
              onChange={(v) => setTargetValue(v.toUpperCase().slice(0, 2))}
              placeholder="IN"
              required
            />
          )}
          {target === "VERSION" && (
            <AdminInput
              label="App version"
              value={targetValue}
              onChange={setTargetValue}
              placeholder="2.4.1"
              required
            />
          )}
          {target === "DEVICE" && (
            <AdminSelect
              label="Device type"
              value={targetValue}
              onChange={setTargetValue}
              options={[
                { value: "", label: "Select…" },
                { value: "IOS", label: "iOS" },
                { value: "ANDROID", label: "Android" },
              ]}
            />
          )}

          {/* Schedule */}
          <div className="rounded-xl bg-muted p-3">
            <p className="text-[13px] font-semibold mb-2.5">Delivery</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "now", label: "Send now", icon: Send },
                { value: "schedule", label: "Schedule", icon: Clock },
                { value: "draft", label: "Draft", icon: Inbox },
              ] as const).map((opt) => {
                const OptIcon = opt.icon;
                const active = sendMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSendMode(opt.value)}
                    className={`h-16 rounded-xl flex flex-col items-center justify-center gap-1 text-[12px] font-semibold transition-colors
                      ${active ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-background/70"}`}
                  >
                    <OptIcon size={15} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {sendMode === "schedule" && (
              <div className="mt-3">
                <label className="block text-[12px] font-medium mb-1.5 flex items-center gap-1.5">
                  <Calendar size={11} /> Send at
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={toLocalInput(new Date())}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors"
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
            <AdminButton
              variant="primary"
              onClick={submit}
              loading={saving}
            >
              {sendMode === "now" ? <><Send size={14} /> Send now</> :
               sendMode === "schedule" ? <><Clock size={14} /> Schedule</> :
               <><Inbox size={14} /> Save draft</>}
            </AdminButton>
          </div>
        </div>

        {/* Right: iOS preview */}
        <div className="lg:col-span-2">
          <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">Preview</p>
          <div className="rounded-2xl bg-foreground text-background p-4 sticky top-0">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-background/15 flex items-center justify-center shrink-0">
                <Bell size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-semibold uppercase tracking-wide opacity-70">Trackly</p>
                  <p className="text-[11px] opacity-60">now</p>
                </div>
                <p className="text-[15px] font-bold leading-snug break-words">{title || "Your title appears here"}</p>
                <p className="text-[13px] opacity-80 leading-snug mt-1 break-words">{body || "Your message body appears here. Keep it short and actionable."}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-border p-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target</span>
              <span className="font-medium inline-flex items-center gap-1.5"><TargetIcon size={11} /> {TARGET_META[target]?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="font-medium">
                {sendMode === "now" ? "Immediate" : sendMode === "schedule" ? (scheduledAt ? fmtDateTime(new Date(scheduledAt).toISOString()) : "Pick a time") : "Saved as draft"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminModal>
  );
}
