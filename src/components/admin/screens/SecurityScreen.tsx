"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Shield, ShieldCheck, Users, Lock, Search,
  RefreshCw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, X,
  Check, AlertTriangle, Clock, UserCog, Ban, PlayCircle,
  ShieldAlert, Loader2, Globe, Mail, Fingerprint, History,
  ListChecks, Network, Trash2,
} from "lucide-react";
import {
  PageHeader, AdminButton, AdminCard, AdminInput, AdminSelect,
  Toggle, AdminModal, ConfirmDialog, StatusPill, EmptyState,
  LoadingState,
} from "../components/ui";
import { apiGet, apiPost, apiPut, apiFetch } from "@/lib/admin/api";

// ===== Types =====
interface AuditLog {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  admin: { id: string; name: string; email: string; role: string } | null;
}
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  _count: { auditLogs: number; sessions: number };
}

type Tab = "audit" | "admins" | "roles" | "access";

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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function actionStyle(action: string): "solid" | "outline" | "warning" | "muted" {
  if (action.startsWith("LOGIN") || action.startsWith("LOGOUT")) return "muted";
  if (action.startsWith("CREATE")) return "solid";
  if (action.startsWith("DELETE") || action.startsWith("DISCONNECT")) return "warning";
  if (action.startsWith("UPDATE")) return "outline";
  return "outline";
}

function ActionBadge({ action }: { action: string }) {
  const style = actionStyle(action);
  const cls = {
    solid: "bg-foreground text-background",
    outline: "border border-border text-foreground bg-background",
    warning: "bg-muted text-foreground border border-border",
    muted: "bg-muted/60 text-muted-foreground",
  }[style];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold ${cls}`}>
      {action}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isSuper = role === "SUPER_ADMIN";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${
      isSuper ? "bg-foreground text-background" : "border border-border text-foreground"
    }`}>
      {role.replace("_", " ")}
    </span>
  );
}

// ===== Component =====
export function SecurityScreen() {
  const [tab, setTab] = useState<Tab>("audit");
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "audit", label: "Audit Logs", icon: <History size={14} /> },
    { id: "admins", label: "Admin Users", icon: <Users size={14} /> },
    { id: "roles", label: "Roles & Permissions", icon: <ListChecks size={14} /> },
    { id: "access", label: "Access Control", icon: <Lock size={14} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Security"
        subtitle="Authentication, access control, and audit logs"
        actions={
          <AdminButton variant="outline" size="md" onClick={() => setSessionsOpen(true)}>
            <Fingerprint size={14} /> View Sessions
          </AdminButton>
        }
      />

      {/* Segmented Control */}
      <div className="inline-flex p-1 rounded-xl bg-muted mb-6 gap-1 overflow-x-auto max-w-full thin-scrollbar">
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
                layoutId="security-tab-pill"
                className="absolute inset-0 rounded-lg bg-foreground"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">{t.icon}{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "audit" && <AuditLogsTab />}
          {tab === "admins" && <AdminsTab />}
          {tab === "roles" && <RolesTab />}
          {tab === "access" && <AccessControlTab />}
        </motion.div>
      </AnimatePresence>

      <SessionsModal open={sessionsOpen} onClose={() => setSessionsOpen(false)} />
    </div>
  );
}

// ===== Audit Logs Tab =====
function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (actionFilter) params.set("action", actionFilter);
      if (adminFilter) params.set("adminId", adminFilter);
      const data = await apiGet<{ logs: AuditLog[]; total: number; totalPages: number }>(
        `/api/admin/security/audit?${params.toString()}`
      );
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages || Math.ceil(data.total / limit));
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load audit logs: " + e.message);
    } finally { setLoading(false); }
  }, [page, actionFilter, adminFilter]);

  const loadAdmins = useCallback(async () => {
    try {
      const data = await apiGet<AdminUser[]>("/api/admin/security/admins");
      setAdmins(data);
    } catch {}
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);
  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [actionFilter, adminFilter]);

  // Date filter (client-side on current page)
  const filteredLogs = useMemo(() => {
    if (!dateFrom && !dateTo) return logs;
    const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : 0;
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : Date.now();
    return logs.filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t >= from && t <= to;
    });
  }, [logs, dateFrom, dateTo]);

  const clearFilters = () => {
    setActionFilter(""); setAdminFilter(""); setDateFrom(""); setDateTo("");
  };

  const hasFilters = actionFilter || adminFilter || dateFrom || dateTo;

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Search action (e.g. LOGIN, CREATE_USER)…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-card border border-border text-[14px] outline-none focus:border-foreground transition-colors"
          />
        </div>
        <select
          value={adminFilter}
          onChange={(e) => setAdminFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-card border border-border text-[14px] outline-none focus:border-foreground transition-colors min-w-[180px]"
        >
          <option value="">All admins</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 px-3 rounded-xl bg-card border border-border text-[13px] outline-none focus:border-foreground transition-colors"
          />
          <span className="text-muted-foreground text-[12px]">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 px-3 rounded-xl bg-card border border-border text-[13px] outline-none focus:border-foreground transition-colors"
          />
        </div>
        {hasFilters && (
          <AdminButton variant="ghost" size="md" onClick={clearFilters}>
            <X size={14} /> Clear
          </AdminButton>
        )}
        <AdminButton variant="outline" size="md" onClick={load} loading={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </AdminButton>
      </div>

      {/* Stats strip */}
      {!loading && !error && (
        <div className="flex items-center gap-3 mb-4 text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">{total}</span> total logs
          <span>·</span>
          <span>Page {page} of {totalPages || 1}</span>
          {dateFrom && dateTo && (
            <>
              <span>·</span>
              <span>Date filter applies to current page</span>
            </>
          )}
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading audit logs…" />
      ) : error ? (
        <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
          action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={<History size={20} />}
          title="No audit logs"
          description={hasFilters ? "No logs match your filters. Try adjusting them." : "Audit logs will appear here as admins take actions."}
          action={hasFilters ? <AdminButton variant="outline" onClick={clearFilters}>Clear filters</AdminButton> : undefined}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          {/* Table header */}
          <div className="hidden lg:grid grid-cols-[180px_1fr_140px_120px_140px_120px] gap-4 px-5 py-3 border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <div>Timestamp</div>
            <div>Admin</div>
            <div>Action</div>
            <div>Entity</div>
            <div>IP Address</div>
            <div className="text-right">Details</div>
          </div>
          {/* Rows */}
          <div className="divide-y divide-border">
            {filteredLogs.map((log) => (
              <AuditRow key={log.id} log={log} />
            ))}
          </div>
        </AdminCard>
      )}

      {/* Pagination */}
      {!loading && !error && filteredLogs.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-[12px] text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <AdminButton variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft size={13} /> Prev
            </AdminButton>
            <span className="text-[12px] text-muted-foreground tabular-nums">{page} / {totalPages}</span>
            <AdminButton variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next <ChevronRight size={13} />
            </AdminButton>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  let meta: any = {};
  try { meta = JSON.parse(log.metadata); } catch {}

  return (
    <motion.div whileTap={{ scale: 0.998 }} onClick={() => setExpanded((v) => !v)} className="cursor-pointer hover:bg-muted/30 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_140px_120px_140px_120px] gap-3 lg:gap-4 px-5 py-3.5">
        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Clock size={11} className="shrink-0" />
          <span className="tabular-nums">{formatDateTime(log.createdAt)}</span>
        </div>
        {/* Admin */}
        <div className="flex items-center gap-2 min-w-0">
          {log.admin ? (
            <>
              <div className="h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold shrink-0">
                {initials(log.admin.name)}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold truncate">{log.admin.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{log.admin.email}</p>
              </div>
              <RoleBadge role={log.admin.role} />
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground italic">
              <Ban size={12} /> System / deleted admin
            </div>
          )}
        </div>
        {/* Action */}
        <div><ActionBadge action={log.action} /></div>
        {/* Entity */}
        <div className="text-[12px] font-mono text-muted-foreground truncate">
          {log.entityType ? (
            <>
              <div className="text-foreground">{log.entityType}</div>
              <div className="text-[10px] truncate">{log.entityId ?? "—"}</div>
            </>
          ) : "—"}
        </div>
        {/* IP */}
        <div className="flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground">
          <Globe size={11} className="shrink-0" />
          <span className="truncate">{log.ipAddress ?? "—"}</span>
        </div>
        {/* Expand indicator */}
        <div className="flex justify-end items-center text-[11px] text-muted-foreground">
          {Object.keys(meta).length > 0 && (
            <button className="hover:text-foreground transition-colors">
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </div>
      {/* Expanded metadata */}
      <AnimatePresence>
        {expanded && Object.keys(meta).length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1">
              <div className="rounded-xl bg-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Metadata</p>
                <pre className="text-[11px] font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(meta, null, 2)}
                </pre>
                {log.userAgent && (
                  <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border">
                    UA: {log.userAgent}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ===== Admin Users Tab =====
function AdminsTab() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet<AdminUser[]>("/api/admin/security/admins");
      setAdmins(data);
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load admins: " + e.message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[13px] text-muted-foreground">
          {admins.length} admin{admins.length === 1 ? "" : "s"} with access
        </p>
        <div className="flex items-center gap-2">
          <AdminButton variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </AdminButton>
          <AdminButton variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Admin
          </AdminButton>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading admin users…" />
      ) : error ? (
        <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
          action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
      ) : admins.length === 0 ? (
        <EmptyState icon={<Users size={20} />} title="No admin users" description="Add your first admin to grant panel access." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {admins.map((a) => (
            <AdminUserCard
              key={a.id}
              admin={a}
              onChangeRole={() => setRoleTarget(a)}
              onSuspend={() => setSuspendTarget(a)}
              onUpdate={(updated) => {
                setAdmins((prev) => prev.map((x) => x.id === updated.id ? updated : x));
              }}
            />
          ))}
        </div>
      )}

      <AddAdminModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); load(); }} />
      <ChangeRoleModal
        admin={roleTarget}
        onClose={() => setRoleTarget(null)}
        onUpdated={(updated) => {
          setAdmins((prev) => prev.map((x) => x.id === updated.id ? updated : x));
          setRoleTarget(null);
        }}
      />
      <ConfirmDialog
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        title={suspendTarget?.status === "ACTIVE" ? "Suspend admin" : "Activate admin"}
        message={
          suspendTarget?.status === "ACTIVE"
            ? `Suspend ${suspendTarget?.name}? They will immediately lose access to the admin panel.`
            : `Restore access for ${suspendTarget?.name}? They will be able to log in again.`
        }
        confirmLabel={suspendTarget?.status === "ACTIVE" ? "Suspend" : "Activate"}
        onConfirm={async () => {
          if (!suspendTarget) return;
          const next = suspendTarget.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
          try {
            await apiFetch(`/api/admin/security/admins/${suspendTarget.id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: next }),
            });
            toast.success(`${suspendTarget.name} ${next === "SUSPENDED" ? "suspended" : "activated"}`);
            setAdmins((prev) => prev.map((x) => x.id === suspendTarget.id ? { ...x, status: next } : x));
            setSuspendTarget(null);
          } catch (e: any) {
            toast.error(e.message);
            setSuspendTarget(null);
          }
        }}
      />
    </div>
  );
}

function AdminUserCard({
  admin, onChangeRole, onSuspend, onUpdate,
}: {
  admin: AdminUser;
  onChangeRole: () => void;
  onSuspend: () => void;
  onUpdate: (a: AdminUser) => void;
}) {
  const [toggling2fa, setToggling2fa] = useState(false);
  const isSuspended = admin.status === "SUSPENDED";

  const toggle2fa = async () => {
    setToggling2fa(true);
    try {
      await apiFetch(`/api/admin/security/admins/${admin.id}`, {
        method: "PATCH",
        body: JSON.stringify({ twoFactorEnabled: !admin.twoFactorEnabled }),
      });
      toast.success(`2FA ${!admin.twoFactorEnabled ? "enabled" : "disabled"} for ${admin.name}`);
      onUpdate({ ...admin, twoFactorEnabled: !admin.twoFactorEnabled });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setToggling2fa(false); }
  };

  return (
    <motion.div whileTap={{ scale: 0.99 }}>
      <AdminCard className={`p-5 h-full flex flex-col ${isSuspended ? "opacity-60" : ""}`}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-foreground text-background flex items-center justify-center text-[15px] font-bold shrink-0">
            {initials(admin.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-bold tracking-tight truncate">{admin.name}</h3>
              <RoleBadge role={admin.role} />
            </div>
            <p className="text-[12px] text-muted-foreground truncate mt-0.5">{admin.email}</p>
          </div>
          <StatusPill status={admin.status} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-xl bg-muted p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Actions</p>
            <p className="text-[18px] font-bold tabular-nums mt-0.5">{admin._count.auditLogs}</p>
          </div>
          <div className="rounded-xl bg-muted p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sessions</p>
            <p className="text-[18px] font-bold tabular-nums mt-0.5">{admin._count.sessions}</p>
          </div>
        </div>

        {/* Last login */}
        <div className="space-y-1.5 mb-4 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5"><Clock size={11} /> Last login</span>
            <span className="font-medium">{admin.lastLoginAt ? timeAgo(admin.lastLoginAt) : "Never"}</span>
          </div>
          {admin.lastLoginIp && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><Globe size={11} /> Last IP</span>
              <span className="font-mono text-[11px]">{admin.lastLoginIp}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5"><Shield size={11} /> Joined</span>
            <span className="font-medium">{timeAgo(admin.createdAt)}</span>
          </div>
        </div>

        {/* 2FA toggle */}
        <div className="rounded-xl bg-muted p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} />
              <div>
                <p className="text-[13px] font-semibold">Two-Factor Auth</p>
                <p className="text-[11px] text-muted-foreground">{admin.twoFactorEnabled ? "Enabled" : "Disabled"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {toggling2fa && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
              <Toggle checked={admin.twoFactorEnabled} onChange={toggle2fa} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-auto pt-3 border-t border-border">
          <button onClick={onChangeRole} className="flex-1 h-8 rounded-lg hover:bg-muted flex items-center justify-center gap-1.5 text-[12px] font-medium">
            <UserCog size={13} /> Change Role
          </button>
          <button onClick={onSuspend} className="flex-1 h-8 rounded-lg hover:bg-muted flex items-center justify-center gap-1.5 text-[12px] font-medium">
            {isSuspended ? <><PlayCircle size={13} /> Activate</> : <><Ban size={13} /> Suspend</>}
          </button>
        </div>
      </AdminCard>
    </motion.div>
  );
}

function AddAdminModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void; }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(""); setEmail(""); setRole("ADMIN"); setCreated(null);
  }, [open]);

  const submit = async () => {
    if (!name || !email) { toast.error("Name and email are required"); return; }
    setSaving(true);
    try {
      const res = await apiPost<{ email: string; tempPassword: string }>("/api/admin/security/admins", { name, email, role });
      setCreated({ email: res.email, tempPassword: res.tempPassword });
      toast.success("Admin created — copy the temp password below");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Add admin user" size="md">
      {created ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-foreground text-background p-4 space-y-2">
            <p className="text-[13px] font-semibold">✓ Admin created</p>
            <p className="text-[12px] opacity-80">Share these credentials with the new admin via a secure channel. They will be prompted to change this password on first login.</p>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Email</p>
              <p className="font-mono text-[13px] px-3 py-2 rounded-lg bg-muted">{created.email}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Temporary password</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-[13px] px-3 py-2 rounded-lg bg-muted flex-1 break-all">{created.tempPassword}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(created.tempPassword); toast.success("Copied"); }}
                  className="h-9 px-3 rounded-lg bg-foreground text-background text-[12px] font-semibold shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <AdminButton variant="primary" onClick={onClose}>Done</AdminButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AdminInput label="Full name" value={name} onChange={setName} placeholder="Jane Doe" required />
          <AdminInput label="Email" value={email} onChange={setEmail} placeholder="jane@trackly.app" type="email" required />
          <AdminSelect label="Role" value={role} onChange={setRole}
            options={[
              { value: "SUPER_ADMIN", label: "Super Admin" },
              { value: "ADMIN", label: "Admin" },
              { value: "SUPPORT", label: "Support" },
              { value: "MODERATOR", label: "Moderator" },
            ]}
          />
          <div className="rounded-xl bg-muted p-3 text-[12px] text-muted-foreground leading-relaxed">
            A temporary password will be generated and shown once. Share it with the new admin via a secure channel — they can sign in immediately and will set their own password later.
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
            <AdminButton variant="primary" onClick={submit} loading={saving}>Create admin</AdminButton>
          </div>
        </div>
      )}
    </AdminModal>
  );
}

function ChangeRoleModal({ admin, onClose, onUpdated }: {
  admin: AdminUser | null;
  onClose: () => void;
  onUpdated: (a: AdminUser) => void;
}) {
  const [role, setRole] = useState("ADMIN");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (admin) setRole(admin.role);
  }, [admin]);

  const submit = async () => {
    if (!admin) return;
    if (role === admin.role) { onClose(); return; }
    setSaving(true);
    try {
      await apiFetch(`/api/admin/security/admins/${admin.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      toast.success(`${admin.name} role changed to ${role.replace("_", " ")}`);
      onUpdated({ ...admin, role });
    } catch (e: any) {
      toast.error(e.message);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <AdminModal open={!!admin} onClose={onClose} title="Change role" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
          <div className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center text-[13px] font-bold shrink-0">
            {admin ? initials(admin.name) : ""}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold truncate">{admin?.name}</p>
            <p className="text-[12px] text-muted-foreground truncate">{admin?.email}</p>
          </div>
        </div>
        <AdminSelect label="New role" value={role} onChange={setRole}
          options={[
            { value: "SUPER_ADMIN", label: "Super Admin — full access" },
            { value: "ADMIN", label: "Admin — manage most resources" },
            { value: "SUPPORT", label: "Support — tickets & users" },
            { value: "MODERATOR", label: "Moderator — content only" },
          ]}
        />
        <div className="flex justify-end gap-2 pt-1">
          <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={submit} loading={saving}>Update role</AdminButton>
        </div>
      </div>
    </AdminModal>
  );
}

// ===== Roles & Permissions Tab (static) =====
const PERMISSIONS = [
  { key: "create_user", label: "Create users" },
  { key: "delete_user", label: "Delete users" },
  { key: "manage_plans", label: "Manage plans & coupons" },
  { key: "send_notifications", label: "Send push notifications" },
  { key: "view_audit_logs", label: "View audit logs" },
  { key: "manage_integrations", label: "Manage integrations" },
  { key: "manage_content", label: "Manage content" },
  { key: "manage_settings", label: "Manage system settings" },
  { key: "manage_admins", label: "Manage admin users" },
  { key: "view_reports", label: "View reports & analytics" },
  { key: "manage_features", label: "Manage feature flags" },
  { key: "manage_tickets", label: "Manage support tickets" },
];

const ROLES = [
  { key: "SUPER_ADMIN", label: "Super Admin", desc: "Unrestricted access to everything" },
  { key: "ADMIN", label: "Admin", desc: "Operational access, cannot manage admins" },
  { key: "SUPPORT", label: "Support", desc: "Limited to users & support tickets" },
  { key: "MODERATOR", label: "Moderator", desc: "Limited to content moderation" },
];

const ROLE_PERMS: Record<string, Record<string, boolean>> = {
  SUPER_ADMIN: Object.fromEntries(PERMISSIONS.map((p) => [p.key, true])),
  ADMIN: Object.fromEntries(PERMISSIONS.map((p) => [
    p.key,
    !["manage_admins", "delete_user"].includes(p.key),
  ])),
  SUPPORT: Object.fromEntries(PERMISSIONS.map((p) => [
    p.key,
    ["manage_tickets", "view_reports", "send_notifications"].includes(p.key),
  ])),
  MODERATOR: Object.fromEntries(PERMISSIONS.map((p) => [
    p.key,
    ["manage_content", "view_reports"].includes(p.key),
  ])),
};

function RolesTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[13px] text-muted-foreground">
          Role-based access control matrix · <span className="text-foreground font-semibold">{ROLES.length} roles</span> · <span className="text-foreground font-semibold">{PERMISSIONS.length} permissions</span>
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-foreground inline-block" /> Allowed</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-border inline-block" /> Denied</span>
        </div>
      </div>

      {/* Role cards summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {ROLES.map((r) => {
          const allowed = PERMISSIONS.filter((p) => ROLE_PERMS[r.key][p.key]).length;
          return (
            <AdminCard key={r.key} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <RoleBadge role={r.key} />
                <span className="text-[11px] text-muted-foreground tabular-nums">{allowed}/{PERMISSIONS.length}</span>
              </div>
              <h3 className="text-[15px] font-bold tracking-tight">{r.label}</h3>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{r.desc}</p>
            </AdminCard>
          );
        })}
      </div>

      {/* Matrix */}
      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Permission</th>
                {ROLES.map((r) => (
                  <th key={r.key} className="px-3 py-3 text-center text-[11px] uppercase tracking-wider text-muted-foreground font-semibold min-w-[110px]">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p, idx) => (
                <tr key={p.key} className={`border-b border-border ${idx % 2 === 1 ? "bg-muted/20" : ""}`}>
                  <td className="px-5 py-3 text-[13px] font-medium">{p.label}</td>
                  {ROLES.map((r) => {
                    const allowed = ROLE_PERMS[r.key][p.key];
                    return (
                      <td key={r.key} className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          {allowed ? (
                            <div className="h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded-full border border-border text-muted-foreground flex items-center justify-center">
                              <X size={11} />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
        This matrix is a read-only reference. Role definitions are managed in code via the auth middleware.
      </p>
    </div>
  );
}

// ===== Access Control Tab =====
function AccessControlTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Local editable state
  const [ipInput, setIpInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [ipWhitelist, setIpWhitelist] = useState<string[]>([]);
  const [alertEmails, setAlertEmails] = useState<string[]>([]);
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [enforce2fa, setEnforce2fa] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet<{ key: string; value: string; type: string }[]>("/api/admin/settings");
      const map: Record<string, string> = {};
      data.forEach((s) => { map[s.key] = s.value; });
      setSettings(map);
      try { setIpWhitelist(JSON.parse(map["security.ipWhitelist"] || "[]")); } catch { setIpWhitelist([]); }
      try { setAlertEmails(JSON.parse(map["security.loginAlertEmails"] || "[]")); } catch { setAlertEmails([]); }
      setSessionTimeout(map["security.sessionTimeoutMinutes"] || "60");
      setEnforce2fa(map["security.enforceTwoFactor"] === "true");
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load access control: " + e.message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveSetting = async (key: string, value: string, type: string = "STRING") => {
    setSavingKey(key);
    try {
      await apiPut("/api/admin/settings", { updates: [{ key, value, type }] });
      setSettings((prev) => ({ ...prev, [key]: value }));
      toast.success(`Saved ${key.replace("security.", "")}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSavingKey(null); }
  };

  const addIp = () => {
    const ip = ipInput.trim();
    if (!ip) return;
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && !/^[0-9a-fA-F:]+$/.test(ip)) {
      toast.error("Invalid IP address format");
      return;
    }
    if (ipWhitelist.includes(ip)) { toast.error("IP already in whitelist"); return; }
    const next = [...ipWhitelist, ip];
    setIpWhitelist(next);
    setIpInput("");
    saveSetting("security.ipWhitelist", JSON.stringify(next), "JSON");
  };

  const removeIp = (ip: string) => {
    const next = ipWhitelist.filter((x) => x !== ip);
    setIpWhitelist(next);
    saveSetting("security.ipWhitelist", JSON.stringify(next), "JSON");
  };

  const addEmail = () => {
    const e = emailInput.trim();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error("Invalid email format"); return; }
    if (alertEmails.includes(e)) { toast.error("Email already in list"); return; }
    const next = [...alertEmails, e];
    setAlertEmails(next);
    setEmailInput("");
    saveSetting("security.loginAlertEmails", JSON.stringify(next), "JSON");
  };

  const removeEmail = (e: string) => {
    const next = alertEmails.filter((x) => x !== e);
    setAlertEmails(next);
    saveSetting("security.loginAlertEmails", JSON.stringify(next), "JSON");
  };

  if (loading) return <LoadingState label="Loading access control…" />;
  if (error) return (
    <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
      action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* IP Whitelist */}
      <AdminCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Network size={16} />
          <h3 className="text-[15px] font-bold tracking-tight">IP Whitelist</h3>
          {savingKey === "security.ipWhitelist" && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">Restrict admin panel access to specific IP addresses. Empty list allows all IPs.</p>
        <div className="flex gap-2 mb-3">
          <input
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addIp(); }}
            placeholder="192.168.1.1"
            className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-[13px] font-mono outline-none focus:border-foreground transition-colors"
          />
          <AdminButton variant="primary" size="md" onClick={addIp}><Plus size={14} /> Add</AdminButton>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto thin-scrollbar">
          {ipWhitelist.length === 0 ? (
            <div className="rounded-xl bg-muted p-4 text-center text-[12px] text-muted-foreground">
              No IPs whitelisted — all IPs allowed
            </div>
          ) : ipWhitelist.map((ip) => (
            <div key={ip} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted">
              <span className="font-mono text-[13px]">{ip}</span>
              <button onClick={() => removeIp(ip)} className="h-7 w-7 rounded-lg hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* Login alert emails */}
      <AdminCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Mail size={16} />
          <h3 className="text-[15px] font-bold tracking-tight">Login Alert Emails</h3>
          {savingKey === "security.loginAlertEmails" && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">Receive an email notification whenever an admin signs in.</p>
        <div className="flex gap-2 mb-3">
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addEmail(); }}
            placeholder="security@trackly.app"
            className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-[13px] outline-none focus:border-foreground transition-colors"
          />
          <AdminButton variant="primary" size="md" onClick={addEmail}><Plus size={14} /> Add</AdminButton>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto thin-scrollbar">
          {alertEmails.length === 0 ? (
            <div className="rounded-xl bg-muted p-4 text-center text-[12px] text-muted-foreground">
              No alert recipients configured
            </div>
          ) : alertEmails.map((e) => (
            <div key={e} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted">
              <span className="text-[13px] truncate">{e}</span>
              <button onClick={() => removeEmail(e)} className="h-7 w-7 rounded-lg hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* Session timeout */}
      <AdminCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} />
          <h3 className="text-[15px] font-bold tracking-tight">Session Timeout</h3>
          {savingKey === "security.sessionTimeoutMinutes" && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">Admin sessions expire after this many minutes of inactivity.</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {["15", "30", "60", "120", "240", "480"].map((m) => (
            <button
              key={m}
              onClick={() => { setSessionTimeout(m); saveSetting("security.sessionTimeoutMinutes", m, "NUMBER"); }}
              className={`h-10 rounded-xl text-[13px] font-semibold transition-colors ${
                sessionTimeout === m ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              {parseInt(m) < 60 ? `${m}m` : `${parseInt(m) / 60}h`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveSetting("security.sessionTimeoutMinutes", sessionTimeout, "NUMBER"); }}
            className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-[13px] tabular-nums outline-none focus:border-foreground transition-colors"
          />
          <AdminButton variant="outline" size="md" onClick={() => saveSetting("security.sessionTimeoutMinutes", sessionTimeout, "NUMBER")}>
            Save
          </AdminButton>
        </div>
      </AdminCard>

      {/* 2FA enforcement */}
      <AdminCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} />
          <h3 className="text-[15px] font-bold tracking-tight">Two-Factor Enforcement</h3>
          {savingKey === "security.enforceTwoFactor" && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">Require all admins to enable 2FA before they can access the panel.</p>
        <div className={`rounded-xl p-4 transition-colors ${enforce2fa ? "bg-foreground text-background" : "bg-muted"}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold flex items-center gap-2">
                {enforce2fa ? <ShieldCheck size={15} /> : <Shield size={15} />}
                {enforce2fa ? "Enforced" : "Optional"}
              </p>
              <p className={`text-[12px] mt-0.5 ${enforce2fa ? "text-background/70" : "text-muted-foreground"}`}>
                {enforce2fa ? "All admins must have 2FA enabled" : "Admins can choose whether to enable 2FA"}
              </p>
            </div>
            <Toggle checked={enforce2fa} onChange={(v) => { setEnforce2fa(v); saveSetting("security.enforceTwoFactor", String(v), "BOOLEAN"); }} />
          </div>
        </div>
        {enforce2fa && (
          <div className="mt-3 rounded-xl border border-foreground/20 bg-foreground/5 p-3 text-[12px] leading-relaxed">
            <AlertTriangle size={12} className="inline mr-1.5" />
            Admins without 2FA will be required to set it up on their next login.
          </div>
        )}
      </AdminCard>
    </div>
  );
}

// ===== Sessions Modal (header action) =====
function SessionsModal({ open, onClose }: { open: boolean; onClose: () => void; }) {
  return (
    <AdminModal open={open} onClose={onClose} title="Active Sessions" size="md">
      {open && <SessionsContent />}
    </AdminModal>
  );
}

function SessionsContent() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiGet<AdminUser[]>("/api/admin/security/admins")
      .then((data) => { if (!cancelled) setAdmins(data); })
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const totalSessions = admins.reduce((sum, a) => sum + a._count.sessions, 0);

  return (
    <>
      {loading ? (
        <LoadingState label="Loading sessions…" />
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Sessions</p>
              <p className="text-[22px] font-bold tabular-nums mt-0.5">{totalSessions}</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Active Admins</p>
              <p className="text-[22px] font-bold tabular-nums mt-0.5">{admins.length}</p>
            </div>
          </div>
          <div className="space-y-1.5 max-h-80 overflow-y-auto thin-scrollbar">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/40">
                <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold shrink-0">
                  {initials(a.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{a.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-bold tabular-nums">{a._count.sessions}</p>
                  <p className="text-[10px] text-muted-foreground">session{a._count.sessions === 1 ? "" : "s"}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Session management (revoke individual sessions, force logout) requires the sessions API endpoint.
          </p>
        </div>
      )}
    </>
  );
}
