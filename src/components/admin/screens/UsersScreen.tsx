"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search, RefreshCw, UserPlus, MoreVertical, Eye, Ban, PauseCircle,
  PlayCircle, KeyRound, Trash2, Download, Send, X, Crown, Smartphone,
  Tablet, Monitor, ChevronLeft, ChevronRight, MapPin, HardDrive,
  FileText, Heart, StickyNote, Calendar, Activity as ActivityIcon,
  History, CreditCard, ShieldAlert, Loader2, ShoppingBag, Copy, ExternalLink, Check,
  Pin, PinOff,
} from "lucide-react";
import {
  PageHeader, AdminButton, AdminCard, AdminInput, AdminSelect,
  AdminTextarea, Toggle, AdminModal, StatusPill, Badge, EmptyState,
  LoadingState,
} from "../components/ui";
import { apiGet, apiPost, apiFetch } from "@/lib/admin/api";

// ===== Types =====
interface Plan {
  id: string;
  name: string;
  tier: string;
  billingPeriod: string;
  priceCents: number;
}
interface UserSubscription {
  id: string;
  status: string;
  startedAt: string;
  currentPeriodEnd: string | null;
  amountCents: number;
  currency: string;
  paymentMethod: string;
  transactionId: string | null;
  couponCode: string | null;
  plan: Plan;
}
interface LoginHistoryItem {
  id: string;
  ipAddress: string;
  device: string;
  location: string | null;
  success: boolean;
  createdAt: string;
}
interface ActivityItem {
  id: string;
  eventType: string;
  screen: string | null;
  metadata: string;
  createdAt: string;
}
interface AppUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  country: string;
  deviceType: string;
  appVersion: string;
  osVersion: string | null;
  deviceModel: string | null;
  status: string;
  premium: boolean;
  premiumSince: string | null;
  premiumExpires: string | null;
  premiumNote?: string | null;
  storageUsedMb: number;
  storageLimitMb: number;
  totalExpenses: number;
  totalHabits: number;
  totalNotes: number;
  lastActiveAt: string | null;
  signupAt: string;
  subscriptions?: UserSubscription[];
}
interface UserDetail extends AppUser {
  subscriptions: UserSubscription[];
  loginHistory: LoginHistoryItem[];
  tickets: any[];
  activities: ActivityItem[];
}
interface ListResponse {
  users: AppUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===== Helpers =====
const formatINR = (cents: number) => "₹" + (cents / 100).toLocaleString("en-IN");
const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const formatTime = (d: string | null) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
const formatDateTime = (d: string | null) =>
  d ? `${formatDate(d)} · ${formatTime(d)}` : "—";
function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return formatDate(iso);
}
function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}
function deviceIcon(t: string) {
  const d = (t || "").toUpperCase();
  if (d === "ANDROID") return <Smartphone size={13} />;
  if (d === "IPAD" || d === "TABLET") return <Tablet size={13} />;
  if (d === "WEB") return <Monitor size={13} />;
  return <Smartphone size={13} />;
}

// ===== Pinned users (localStorage persistence) =====
interface PinnedUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  status: string;
  lastActiveAt: string | null;
  pinnedAt: number;
}
const PINNED_KEY = "trackly_admin_pinned_users_v1";
function loadPinned(): PinnedUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PINNED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((p: any) => p && typeof p.id === "string") : [];
  } catch {
    return [];
  }
}
function savePinned(list: PinnedUser[]) {
  try {
    window.localStorage.setItem(PINNED_KEY, JSON.stringify(list));
  } catch {
    /* storage full / private mode — ignore */
  }
}

// ===== Component =====
export function UsersScreen() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [premium, setPremium] = useState("");
  const [country, setCountry] = useState("");
  const limit = 20;

  // Modals / drawer
  const [addOpen, setAddOpen] = useState(false);
  // Delete modal: one or many users. null = closed.
  const [deleteTargets, setDeleteTargets] = useState<AppUser[] | null>(null);
  const [deleteMode, setDeleteMode] = useState<"ban" | "hard">("hard");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  // Bulk selection (checkboxes) — ids for quick membership + objects so
  // cross-page selections still carry full user data into the delete modal.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedObjs, setSelectedObjs] = useState<Map<string, AppUser>>(new Map());
  const [resetLink, setResetLink] = useState<{ email: string; link: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Pinned users
  const [pinned, setPinned] = useState<PinnedUser[]>([]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadUsers = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (premium) params.set("premium", premium);
      if (country) params.set("country", country.toUpperCase());
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await apiGet<ListResponse>(`/api/admin/users?${params.toString()}`);
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      // Drop selections that no longer exist after a refresh
      setSelected((prev) => {
        if (prev.size === 0) return prev;
        const alive = new Set(res.users.map((u) => u.id));
        const next = new Set([...prev].filter((id) => alive.has(id)));
        return next.size === prev.size ? prev : next;
      });
    } catch (e: any) {
      setError(e.message);
      if (!silent) toast.error("Failed to load users: " + e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [q, status, premium, country, page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Pinned: initial load from localStorage
  useEffect(() => {
    setPinned(loadPinned());
  }, []);

  // Pinned: fresh data sync — jab page load ho, pinned entries ko live data se refresh karo
  useEffect(() => {
    if (!users.length) return;
    setPinned((prev) => {
      if (!prev.length) return prev;
      let changed = false;
      const next = prev.map((p) => {
        const fresh = users.find((u) => u.id === p.id);
        if (
          fresh &&
          (fresh.name !== p.name ||
            fresh.email !== p.email ||
            fresh.status !== p.status ||
            fresh.lastActiveAt !== p.lastActiveAt ||
            fresh.avatar !== p.avatar)
        ) {
          changed = true;
          return {
            ...p,
            name: fresh.name,
            email: fresh.email,
            avatar: fresh.avatar,
            status: fresh.status,
            lastActiveAt: fresh.lastActiveAt,
          };
        }
        return p;
      });
      if (changed) savePinned(next);
      return changed ? next : prev;
    });
  }, [users]);

  const togglePin = useCallback((u: AppUser) => {
    setPinned((prev) => {
      let next: PinnedUser[];
      if (prev.some((p) => p.id === u.id)) {
        next = prev.filter((p) => p.id !== u.id);
        toast.success(`${u.name} unpinned`);
      } else {
        next = [
          ...prev,
          {
            id: u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
            status: u.status,
            lastActiveAt: u.lastActiveAt,
            pinnedAt: Date.now(),
          },
        ];
        toast.success(`${u.name} pinned to top`);
      }
      savePinned(next);
      return next;
    });
  }, []);

  const unpinById = useCallback((id: string) => {
    setPinned((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePinned(next);
      return next;
    });
  }, []);

  const clearPins = useCallback(() => {
    savePinned([]);
    setPinned([]);
    toast.success("All pins cleared");
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openMenuId]);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setOpenMenuId(null);
  };

  // ===== Bulk selection helpers =====
  const toggleSelected = useCallback((u: AppUser) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(u.id)) next.delete(u.id); else next.add(u.id);
      return next;
    });
    setSelectedObjs((prev) => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id); else next.set(u.id, u);
      return next;
    });
  }, []);

  const allOnPageSelected = users.length > 0 && users.every((u) => selected.has(u.id));
  const toggleSelectAllOnPage = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (users.every((u) => next.has(u.id))) {
        users.forEach((u) => next.delete(u.id));
      } else {
        users.forEach((u) => next.add(u.id));
      }
      return next;
    });
    setSelectedObjs((prev) => {
      const next = new Map(prev);
      if (users.every((u) => next.has(u.id))) {
        users.forEach((u) => next.delete(u.id));
      } else {
        users.forEach((u) => next.set(u.id, u));
      }
      return next;
    });
  }, [users]);

  const openDeleteModal = useCallback((targets: AppUser[]) => {
    if (targets.length === 0) return;
    setDeleteTargets(targets);
    setDeleteMode("hard");
    setConfirmText("");
    setOpenMenuId(null);
  }, []);

  // Execute delete (single or bulk) — optimistic: remove/ban instantly in local
  // state, then refresh silently in the background (no full-screen loading flash).
  const executeDelete = useCallback(async () => {
    if (!deleteTargets || deleteTargets.length === 0) return;
    const isBulk = deleteTargets.length > 1;
    const hard = deleteMode === "hard";
    // Safety gate: bulk permanent delete requires typing DELETE
    if (isBulk && hard && confirmText.trim().toUpperCase() !== "DELETE") {
      toast.error('Type DELETE to confirm permanent removal of ' + deleteTargets.length + ' users');
      return;
    }
    setDeleting(true);
    const startedAt = Date.now();
    try {
      const res = isBulk
        ? await apiFetch(`/api/admin/users/bulk`, {
            method: "POST",
            body: JSON.stringify({ action: "delete", ids: deleteTargets.map((u) => u.id), hard }),
          })
        : await apiFetch(`/api/admin/users/${deleteTargets[0].id}`, {
            method: "DELETE",
            body: JSON.stringify({ hard }),
          });

      const succeededCount = isBulk ? (res?.succeeded ?? 0) : 1;
      const failedCount = isBulk ? (res?.failed ?? 0) : 0;
      const secs = ((Date.now() - startedAt) / 1000).toFixed(1);

      if (hard) {
        // Optimistic: remove deleted users from the list + selections + pins
        const gone = new Set(deleteTargets.map((u) => u.id));
        setUsers((prev) => prev.filter((u) => !gone.has(u.id)));
        setSelected((prev) => new Set([...prev].filter((id) => !gone.has(id))));
        setSelectedObjs((prev) => {
          const next = new Map(prev);
          gone.forEach((id) => next.delete(id));
          return next;
        });
        setPinned((prev) => {
          const next = prev.filter((p) => !gone.has(p.id));
          savePinned(next);
          return next;
        });
        setTotal((t) => Math.max(0, t - succeededCount));
        toast.success(
          failedCount > 0
            ? `Deleted ${succeededCount}/${deleteTargets.length} users · ${failedCount} failed (${secs}s)`
            : `Deleted ${succeededCount} user${succeededCount === 1 ? "" : "s"} permanently (${secs}s)`
        );
      } else {
        // Ban: update status in place (users stay in the list as Suspended)
        const banned = new Set(deleteTargets.map((u) => u.id));
        setUsers((prev) => prev.map((u) => (banned.has(u.id) ? { ...u, status: "SUSPENDED" } : u)));
        toast.success(`Banned ${succeededCount} user${succeededCount === 1 ? "" : "s"} — they can no longer sign in (${secs}s)`);
      }
      setDeleteTargets(null);
      setConfirmText("");
      loadUsers({ silent: true }); // background sync — no loading flash
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }, [deleteTargets, deleteMode, confirmText, loadUsers]);

  return (
    <div className="relative">
      <PageHeader
        title="User Management"
        subtitle="View, search and manage all Trackly users"
        actions={
          <>
            <AdminButton variant="outline" size="md" onClick={loadUsers} loading={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </AdminButton>
            <AdminButton variant="primary" size="md" onClick={() => setAddOpen(true)}>
              <UserPlus size={14} /> Add User
            </AdminButton>
          </>
        }
      />

      {/* Filters */}
      <AdminCard className="p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors"
            />
          </div>
          <AdminSelect
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { value: "", label: "All Statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "SUSPENDED", label: "Suspended / Banned" },
            ]}
          />
          <AdminSelect
            value={premium}
            onChange={(v) => { setPremium(v); setPage(1); }}
            options={[
              { value: "", label: "All Plans" },
              { value: "true", label: "Premium Only" },
              { value: "false", label: "Free Only" },
            ]}
          />
          <AdminInput
            value={country}
            onChange={(v) => { setCountry(v); setPage(1); }}
            placeholder="Country code (e.g. IN)"
          />
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <p className="text-[12px] text-muted-foreground">
            {loading ? "Loading…" : `${total.toLocaleString()} user${total === 1 ? "" : "s"} found`}
          </p>
          {(q || status || premium || country) && (
            <button
              onClick={() => { setSearchInput(""); setQ(""); setStatus(""); setPremium(""); setCountry(""); setPage(1); }}
              className="text-[12px] font-medium text-foreground hover:opacity-70"
            >
              Clear filters
            </button>
          )}
        </div>
      </AdminCard>

      {/* Pinned users */}
      {pinned.length > 0 && (
        <AdminCard className="p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-foreground text-background flex items-center justify-center">
                <Pin size={12} className="rotate-45" fill="currentColor" />
              </div>
              <span className="text-[14px] font-semibold">Pinned users</span>
              <Badge variant="outline">{pinned.length}</Badge>
            </div>
            <button
              onClick={clearPins}
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {[...pinned]
              .sort((a, b) => a.pinnedAt - b.pinnedAt)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-bold shrink-0">
                    {p.avatar ? (
                      <img src={p.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      initials(p.name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openDetail(p.id)}>
                    <p className="text-[13px] font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Active {timeAgo(p.lastActiveAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openDetail(p.id)}
                      className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="View details"
                      title="View details"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => unpinById(p.id)}
                      className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Unpin"
                      title="Unpin"
                    >
                      <PinOff size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </AdminCard>
      )}

      {/* Bulk selection action bar */}
      {selected.size > 0 && (
        <AdminCard className="p-3 mb-4 border-2 border-foreground/15">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-foreground text-background flex items-center justify-center">
                <Check size={14} />
              </div>
              <span className="text-[14px] font-semibold">
                {selected.size} user{selected.size === 1 ? "" : "s"} selected
              </span>
              <span className="text-[12px] text-muted-foreground hidden sm:inline">
                across pages — selection is kept while you browse
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AdminButton variant="outline" size="sm" onClick={() => { setSelected(new Set()); setSelectedObjs(new Map()); }}>
                <X size={14} /> Clear
              </AdminButton>
              <AdminButton
                variant="danger"
                size="sm"
                onClick={() => openDeleteModal([...selectedObjs.values()])}
              >
                <Trash2 size={14} /> Delete selected
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Table */}
      <AdminCard className="overflow-hidden">
        {loading ? (
          <LoadingState label="Loading users…" />
        ) : error ? (
          <EmptyState
            icon={<ShieldAlert size={20} />}
            title="Something went wrong"
            description={error}
            action={<AdminButton variant="outline" onClick={loadUsers}>Try again</AdminButton>}
          />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Search size={20} />}
            title="No users found"
            description="Try adjusting your filters or add a new user."
            action={<AdminButton variant="primary" onClick={() => setAddOpen(true)}><UserPlus size={14} /> Add User</AdminButton>}
          />
        ) : (
          <>
            {/* Desktop header */}
            <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_1fr_76px] gap-3 px-5 py-3 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                  className="h-4 w-4 accent-foreground cursor-pointer"
                  aria-label="Select all users on this page"
                />
                User
              </span>
              <span>Status</span>
              <span>Plan</span>
              <span>Country</span>
              <span>Device</span>
              <span>Last Active</span>
              <span></span>
            </div>
            <div className="divide-y divide-border">
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  menuOpen={openMenuId === u.id}
                  pinned={pinned.some((p) => p.id === u.id)}
                  checked={selected.has(u.id)}
                  onToggleCheck={() => toggleSelected(u)}
                  onTogglePin={() => togglePin(u)}
                  onToggleMenu={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                  onView={() => openDetail(u.id)}
                  onAction={async (action) => {
                    setOpenMenuId(null);
                    await handleAction(u, action);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </AdminCard>

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[12px] text-muted-foreground">
            Page {page} of {Math.max(1, totalPages)} · Showing {users.length} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <AdminButton
              variant="outline" size="sm" disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} /> Prev
            </AdminButton>
            <AdminButton
              variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={14} />
            </AdminButton>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => { setAddOpen(false); toast.success("User created"); loadUsers(); }}
      />

      {/* Delete Confirm — single or bulk, with explicit Ban vs Delete-permanently choice */}
      <AdminModal
        open={!!deleteTargets}
        onClose={() => { setDeleteTargets(null); setConfirmText(""); }}
        title={deleteTargets && deleteTargets.length > 1 ? `Delete ${deleteTargets.length} users` : "Delete user"}
        size="sm"
      >
        {deleteTargets && (
          <div>
            {/* Who */}
            <div className="rounded-xl bg-muted p-3 max-h-32 overflow-y-auto thin-scrollbar">
              {deleteTargets.slice(0, 5).map((u) => (
                <div key={u.id} className="flex items-center justify-between text-[13px] py-1">
                  <span className="font-semibold truncate">{u.name}</span>
                  <span className="text-muted-foreground truncate ml-2">{u.email}</span>
                </div>
              ))}
              {deleteTargets.length > 5 && (
                <p className="text-[12px] text-muted-foreground mt-1">+ {deleteTargets.length - 5} more…</p>
              )}
            </div>

            {/* Data impact summary */}
            {(() => {
              const exp = deleteTargets.reduce((s, u) => s + (u.totalExpenses || 0), 0);
              const hab = deleteTargets.reduce((s, u) => s + (u.totalHabits || 0), 0);
              const not = deleteTargets.reduce((s, u) => s + (u.totalNotes || 0), 0);
              const hasData = exp + hab + not > 0;
              return (
                <p className="text-[12px] text-muted-foreground mt-2">
                  {hasData
                    ? `Linked data: ${exp} expenses · ${hab} habits · ${not} notes — permanently deleted data is not recoverable.`
                    : "These users have little or no app data."}
                </p>
              );
            })()}

            {/* Action choice */}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setDeleteMode("ban")}
                className={`w-full text-left rounded-xl border-2 p-3 transition-colors ${deleteMode === "ban" ? "border-foreground bg-muted/60" : "border-border hover:border-foreground/30"}`}
              >
                <div className="flex items-center gap-2">
                  <Ban size={15} />
                  <span className="text-[14px] font-semibold">Ban {deleteTargets.length > 1 ? `all ${deleteTargets.length} users` : "user"}</span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Blocks sign-in immediately. Account and data are kept — reversible anytime via Restore.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setDeleteMode("hard")}
                className={`w-full text-left rounded-xl border-2 p-3 transition-colors ${deleteMode === "hard" ? "border-foreground bg-muted/60" : "border-border hover:border-foreground/30"}`}
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={15} />
                  <span className="text-[14px] font-semibold">Delete permanently</span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Removes the account and ALL its data (expenses, habits, notes, referrals). This cannot be undone.
                </p>
              </button>
            </div>

            {/* Bulk permanent safety gate */}
            {deleteTargets.length > 1 && deleteMode === "hard" && (
              <div className="mt-3">

                <AdminInput
                  label={`Type DELETE to remove ${deleteTargets.length} users permanently`}
                  value={confirmText}
                  onChange={setConfirmText}
                  placeholder="DELETE"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <AdminButton variant="outline" onClick={() => { setDeleteTargets(null); setConfirmText(""); }} disabled={deleting}>
                Cancel
              </AdminButton>
              <AdminButton
                variant={deleteMode === "hard" ? "danger" : "primary"}
                loading={deleting}
                disabled={deleteMode === "hard" && deleteTargets.length > 1 && confirmText.trim().toUpperCase() !== "DELETE"}
                onClick={executeDelete}
              >
                {deleteMode === "hard"
                  ? `Delete ${deleteTargets.length > 1 ? `${deleteTargets.length} users` : "user"} permanently`
                  : `Ban ${deleteTargets.length > 1 ? `${deleteTargets.length} users` : "user"}`}
              </AdminButton>
            </div>
          </div>
        )}
      </AdminModal>

      {/* Password Reset Link Modal */}
      <AdminModal
        open={!!resetLink}
        onClose={() => { setResetLink(null); setCopied(false); }}
        title="Password reset link"
        size="sm"
      >
        {resetLink && (
          <div>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              A one-time reset link has been generated for{" "}
              <span className="font-semibold text-foreground">{resetLink.email}</span>.
              Email delivery can be slow or land in spam — share this link directly
              instead (WhatsApp, SMS, etc).
            </p>
            <div className="mt-4 rounded-xl bg-muted p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Reset link (valid 1 hour)</p>
              <div className="flex items-start gap-2">
                <code className="text-[11px] leading-relaxed break-all text-foreground flex-1 max-h-24 overflow-y-auto">
                  {resetLink.link}
                </code>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <AdminButton
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(resetLink.link).then(() => {
                    setCopied(true);
                    toast.success("Link copied to clipboard");
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                {copied ? <><Check size={16} className="mr-1.5" /> Copied</> : <><Copy size={16} className="mr-1.5" /> Copy link</>}
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={() => window.open(resetLink.link, "_blank")}
              >
                <ExternalLink size={16} className="mr-1.5" /> Open link
              </AdminButton>
            </div>
          </div>
        )}
      </AdminModal>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedId && (
          <UserDetailDrawer
            userId={selectedId}
            onClose={() => setSelectedId(null)}
            onMutated={() => loadUsers()}
          />
        )}
      </AnimatePresence>
    </div>
  );

  async function handleAction(u: AppUser, action: string) {
    try {
      if (action === "view") {
        openDetail(u.id);
      } else if (action === "delete") {
        openDeleteModal([u]);
      } else if (action === "resetPassword") {
        setResetLoading(true);
        try {
          const data = await apiFetch(`/api/admin/users/${u.id}`, {
            method: "PATCH",
            body: JSON.stringify({ action: "resetPassword" }),
          });
          if (data?.link) {
            setResetLink({ email: data.email || u.email, link: data.link });
            toast.success("Password reset link generated");
          } else {
            toast.success(data?.message || "Password reset email sent");
          }
        } finally {
          setResetLoading(false);
        }
      } else if (action === "suspend" || action === "ban" || action === "restore") {
        await apiFetch(`/api/admin/users/${u.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action }),
        });
        toast.success(`User ${action}${action === "suspend" ? "ed" : action === "ban" ? "ned" : "d"}`);
        // Optimistic status update + silent background refresh
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: action === "restore" ? "ACTIVE" : "SUSPENDED" } : x)));
        loadUsers({ silent: true });
      } else if (action === "grantPremium" || action === "revokePremium") {
        // Engine 29: admin-granted premium — NO limits on the account.
        await apiFetch(`/api/admin/users/${u.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action }),
        });
        toast.success(
          action === "grantPremium"
            ? "Premium granted — no limits for this user (unlimited AI)"
            : "Premium revoked — normal daily limits apply again"
        );
        loadUsers({ silent: true });
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }
}

// ===== User Row =====
function UserRow({
  user, menuOpen, onToggleMenu, onView, onAction, pinned, onTogglePin, checked, onToggleCheck,
}: {
  user: AppUser;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onView: () => void;
  onAction: (action: string) => void;
  pinned: boolean;
  onTogglePin: () => void;
  checked: boolean;
  onToggleCheck: () => void;
}) {
  const activeSub = user.subscriptions?.find((s) => s.status === "ACTIVE");
  const status = user.status;
  return (
    <motion.div
      whileTap={{ scale: 0.998 }}
      onClick={onView}
      className={`grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_1fr_76px] gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors items-center ${checked ? "bg-muted/50" : ""}`}
    >
      {/* User */}
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleCheck}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 shrink-0 accent-foreground cursor-pointer"
          aria-label={`Select ${user.name}`}
        />
        <div className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-bold shrink-0">
          {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : initials(user.name)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[14px] font-semibold truncate">{user.name}</p>
            {pinned && <Pin size={11} className="rotate-45 shrink-0 text-muted-foreground" aria-label="Pinned" />}
          </div>
          <p className="text-[12px] text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
      {/* Status */}
      <div><StatusPill status={status} /></div>
      {/* Plan */}
      <div>
        {user.premium ? (
          <Badge variant="default"><Crown size={10} /> Premium</Badge>
        ) : activeSub ? (
          <Badge variant="outline">{activeSub.plan.name}</Badge>
        ) : (
          <span className="text-[12px] text-muted-foreground">Free</span>
        )}
      </div>
      {/* Country */}
      <div className="flex items-center gap-1.5 text-[13px]">
        <MapPin size={12} className="text-muted-foreground" /> {user.country}
      </div>
      {/* Device */}
      <div className="flex items-center gap-1.5 text-[13px] capitalize">
        {deviceIcon(user.deviceType)} <span className="hidden xl:inline">{user.deviceType}</span>
      </div>
      {/* Last active */}
      <div className="text-[13px] text-muted-foreground">{timeAgo(user.lastActiveAt)}</div>
      {/* Actions */}
      <div className="relative flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onTogglePin}
          className={`h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors ${pinned ? "text-foreground" : "text-muted-foreground"}`}
          aria-label={pinned ? "Unpin user" : "Pin user"}
          title={pinned ? "Unpin user" : "Pin user"}
        >
          <Pin size={15} className={pinned ? "rotate-45" : ""} fill={pinned ? "currentColor" : "none"} />
        </button>
        <button
          onClick={onToggleMenu}
          className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
          aria-label="Actions"
        >
          <MoreVertical size={16} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-10 z-50 w-52 bg-popover border border-border rounded-xl shadow-float p-1.5"
            >
              <MenuItem icon={<Eye size={14} />} label="View details" onClick={onAction.bind(null, "view")} />
              {status === "ACTIVE" && (
                <MenuItem icon={<PauseCircle size={14} />} label="Suspend" onClick={onAction.bind(null, "suspend")} />
              )}
              {status !== "BANNED" && status !== "DELETED" && (
                <MenuItem icon={<Ban size={14} />} label="Ban" onClick={onAction.bind(null, "ban")} />
              )}
              {(status === "SUSPENDED" || status === "BANNED") && (
                <MenuItem icon={<PlayCircle size={14} />} label="Restore" onClick={onAction.bind(null, "restore")} />
              )}
              {user.premium ? (
                <MenuItem icon={<Crown size={14} />} label="Revoke premium" onClick={onAction.bind(null, "revokePremium")} />
              ) : (
                <MenuItem icon={<Crown size={14} />} label="Grant premium" onClick={onAction.bind(null, "grantPremium")} />
              )}
              <MenuItem icon={<KeyRound size={14} />} label="Reset password" onClick={onAction.bind(null, "resetPassword")} />
              <div className="my-1 h-px bg-border" />
              <MenuItem icon={<Trash2 size={14} />} label="Delete" danger onClick={onAction.bind(null, "delete")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MenuItem({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-muted text-left ${danger ? "text-foreground" : "text-foreground"}`}
    >
      {icon} {label}
    </button>
  );
}

// ===== Add User Modal =====
function AddUserModal({
  open, onClose, onCreated,
}: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("IN");
  const [deviceType, setDeviceType] = useState("iOS");
  const [premium, setPremium] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(""); setName(""); setCountry("IN"); setDeviceType("iOS"); setPremium(false);
    }
  }, [open]);

  const submit = async () => {
    if (!email || !name) { toast.error("Email and name are required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/users", { email, name, country, deviceType, premium });
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Add new user" size="md">
      <div className="space-y-4">
        <AdminInput label="Email" value={email} onChange={setEmail} placeholder="user@example.com" type="email" required />
        <AdminInput label="Full name" value={name} onChange={setName} placeholder="Jane Doe" required />
        <div className="grid grid-cols-2 gap-3">
          <AdminInput label="Country" value={country} onChange={setCountry} placeholder="IN" />
          <AdminSelect
            label="Device type"
            value={deviceType}
            onChange={setDeviceType}
            options={[
              { value: "iOS", label: "iOS" },
              { value: "Android", label: "Android" },
              { value: "iPad", label: "iPad" },
              { value: "Web", label: "Web" },
            ]}
          />
        </div>
        <div className="rounded-xl bg-muted p-3">
          <Toggle checked={premium} onChange={setPremium} label="Premium subscriber" description="Grant immediate premium access" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={submit} loading={saving}>Create user</AdminButton>
        </div>
      </div>
    </AdminModal>
  );
}

// ===== User Detail Drawer =====
function UserDetailDrawer({
  userId, onClose, onMutated,
}: {
  userId: string; onClose: () => void; onMutated: () => void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "activity" | "logins" | "subs">("overview");
  const [notifOpen, setNotifOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiGet<UserDetail>(`/api/admin/users/${userId}`);
      setDetail(d);
    } catch (e: any) {
      toast.error("Failed to load user: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const runAction = async (action: string) => {
    setActionLoading(action);
    try {
      if (action === "resetPassword") {
        await apiFetch(`/api/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify({ action }) });
        toast.success("Password reset email sent");
      } else if (action === "grantPremium" || action === "revokePremium") {
        // Engine 29: premium grant/revoke — reload detail + list both.
        await apiFetch(`/api/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify({ action }) });
        toast.success(
          action === "grantPremium"
            ? "Premium granted — this user now has NO limits (unlimited AI)"
            : "Premium revoked — normal daily limits apply again"
        );
        await load();
        onMutated();
      } else {
        await apiFetch(`/api/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify({ action }) });
        toast.success(`User ${action}${action === "suspend" ? "ed" : action === "ban" ? "ned" : "d"}`);
        await load();
        onMutated();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const exportData = () => {
    if (!detail) return;
    const blob = new Blob([JSON.stringify(detail, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trackly-user-${detail.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported user data");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 36 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] bg-background border-l border-border flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <X size={16} />
            </button>
            <div className="flex items-center gap-1.5">
              <AdminButton variant="ghost" size="sm" onClick={exportData}><Download size={13} /> Export</AdminButton>
              <AdminButton variant="outline" size="sm" onClick={() => setNotifOpen(true)}><Send size={13} /> Notify</AdminButton>
            </div>
          </div>
          {loading || !detail ? (
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                <div className="h-3 w-56 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-foreground text-background flex items-center justify-center text-[18px] font-bold shrink-0">
                {detail.avatar ? <img src={detail.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : initials(detail.name)}
              </div>
              <div className="min-w-0">
                <h2 className="text-[20px] font-bold tracking-tight truncate">{detail.name}</h2>
                <p className="text-[13px] text-muted-foreground truncate">{detail.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusPill status={detail.status} />
                  {detail.premium && <Badge variant="default"><Crown size={10} /> Premium</Badge>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {[
            { id: "overview", label: "Overview", icon: null },
            { id: "activity", label: "Activity", icon: <ActivityIcon size={12} /> },
            { id: "logins", label: "Logins", icon: <History size={12} /> },
            { id: "subs", label: "Subscriptions", icon: <CreditCard size={12} /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-3 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
                tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto thin-scrollbar p-5">
          {loading || !detail ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : tab === "overview" ? (
            <OverviewTab detail={detail} />
          ) : tab === "activity" ? (
            <ActivityTab activities={detail.activities} />
          ) : tab === "logins" ? (
            <LoginsTab items={detail.loginHistory} />
          ) : (
            <SubsTab subs={detail.subscriptions} />
          )}
        </div>

        {/* Action footer */}
        {!loading && detail && (
          <div className="p-4 border-t border-border bg-background">
            <div className="grid grid-cols-2 gap-2">
              {detail.status === "ACTIVE" ? (
                <AdminButton variant="outline" size="sm" loading={actionLoading === "suspend"} onClick={() => runAction("suspend")}>
                  <PauseCircle size={13} /> Suspend
                </AdminButton>
              ) : (
                <AdminButton variant="outline" size="sm" loading={actionLoading === "restore"} onClick={() => runAction("restore")}>
                  <PlayCircle size={13} /> Restore
                </AdminButton>
              )}
              {detail.status !== "BANNED" && detail.status !== "DELETED" ? (
                <AdminButton variant="outline" size="sm" loading={actionLoading === "ban"} onClick={() => runAction("ban")}>
                  <Ban size={13} /> Ban
                </AdminButton>
              ) : (
                <AdminButton variant="outline" size="sm" loading={actionLoading === "restore"} onClick={() => runAction("restore")}>
                  <PlayCircle size={13} /> Restore
                </AdminButton>
              )}
              <AdminButton variant="outline" size="sm" loading={actionLoading === "resetPassword"} onClick={() => runAction("resetPassword")}>
                <KeyRound size={13} /> Reset password
              </AdminButton>
              <AdminButton variant="primary" size="sm" onClick={exportData}>
                <Download size={13} /> Export data
              </AdminButton>
              {detail.premium ? (
                <AdminButton variant="outline" size="sm" className="col-span-2" loading={actionLoading === "revokePremium"} onClick={() => runAction("revokePremium")}>
                  <Crown size={13} /> Revoke premium
                </AdminButton>
              ) : (
                <AdminButton variant="primary" size="sm" className="col-span-2" loading={actionLoading === "grantPremium"} onClick={() => runAction("grantPremium")}>
                  <Crown size={13} /> Grant premium — no limits (unlimited AI)
                </AdminButton>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Send Notification Modal */}
      <SendNotificationModal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        userId={userId}
        userName={detail?.name}
      />
    </>
  );
}

// ===== Drawer Tabs =====
function OverviewTab({ detail }: { detail: UserDetail }) {
  const t = (detail as any).trackly;
  const totals = t?.totals || {};
  const settings = t?.settings || {};
  const modes = t?.modes || {};
  const auth = (detail as any).auth || {};

  const stats = [
    { label: "Expenses", value: totals.expenseCount ?? detail.totalExpenses, icon: <FileText size={13} /> },
    { label: "Habits", value: totals.habitCount ?? detail.totalHabits, icon: <Heart size={13} /> },
    { label: "Notes", value: totals.noteCount ?? detail.totalNotes, icon: <StickyNote size={13} /> },
    { label: "Incomes", value: totals.incomeCount ?? 0, icon: <CreditCard size={13} /> },
    { label: "Shopping", value: totals.shoppingCount ?? 0, icon: <ShoppingBag size={13} /> },
    { label: "Calendar", value: totals.calendarCount ?? 0, icon: <Calendar size={13} /> },
  ];

  return (
    <div className="space-y-5">
      <Section title="Account">
        <Row label="User ID" value={<span className="font-mono text-[11px]">{detail.id}</span>} />
        <Row label="Signup date" value={formatDate(detail.signupAt)} icon={<Calendar size={12} />} />
        <Row label="Last active" value={timeAgo(detail.lastActiveAt)} />
        <Row label="Auth provider" value={<span className="capitalize">{auth.provider || "email"}</span>} />
        <Row label="Email confirmed" value={auth.emailConfirmed ? "Yes" : "No"} />
        <Row
          label="Plan"
          value={detail.premium ? <Badge variant="default"><Crown size={10} /> Premium (admin-granted) — no limits</Badge> : <Badge variant="outline">Free</Badge>}
        />
        {detail.premium && detail.premiumSince && (
          <Row label="Premium since" value={formatDate(detail.premiumSince)} icon={<Crown size={12} />} />
        )}
        {auth.bannedAt && <Row label="Banned at" value={formatDateTime(auth.bannedAt)} />}
      </Section>

      <Section title="Lifetime totals">
        <div className="grid grid-cols-3 gap-2 p-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-muted p-3 text-center">
              <div className="flex items-center justify-center text-muted-foreground mb-1">{s.icon}</div>
              <p className="text-[18px] font-bold tabular-nums">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {totals.totalExpensesAmount !== undefined && (
        <Section title="Money summary">
          <Row label="Total spent" value={`₹${(totals.totalExpensesAmount || 0).toLocaleString("en-IN")}`} />
          <Row label="Total income" value={`₹${(totals.totalIncomeAmount || 0).toLocaleString("en-IN")}`} />
          <Row label="Lent out (active)" value={`₹${(totals.totalLentOut || 0).toLocaleString("en-IN")}`} />
          <Row label="Borrow/Lend entries" value={totals.borrowLendCount ?? 0} />
        </Section>
      )}

      <Section title="Profile & settings">
        <Row label="Display name" value={settings.userName || detail.name} />
        <Row label="Phone" value={settings.userPhone || "—"} />
        <Row label="Country" value={settings.userCountry || detail.country} />
        <Row label="Currency" value={settings.currency || "INR"} />
        <Row label="Language" value={settings.language || "en"} />
        <Row label="Theme" value={<span className="capitalize">{settings.theme || "system"}</span>} />
      </Section>

      <Section title="Life Modes">
        <Row
          label="Student mode"
          value={
            <span className="flex items-center gap-1.5">
              {modes.studentMode ? <Badge variant="success">ON</Badge> : <Badge>OFF</Badge>}
              {modes.studentPaused && <Badge variant="warning">Paused</Badge>}
            </span>
          }
        />
        <Row
          label="Office mode"
          value={
            <span className="flex items-center gap-1.5">
              {modes.officeMode ? <Badge variant="success">ON</Badge> : <Badge>OFF</Badge>}
              {modes.officePaused && <Badge variant="warning">Paused</Badge>}
            </span>
          }
        />
        <Row
          label="Trip mode"
          value={
            modes.tripMode && modes.tripMode !== "none"
              ? <span>{modes.tripMode === "international" ? "International" : "National"} · {modes.tripDestination || "—"}</span>
              : <Badge>OFF</Badge>
          }
        />
      </Section>

      {t?.expenses && t.expenses.length > 0 && (
        <Section title={`Recent expenses (${t.expenses.length})`}>
          <div className="divide-y divide-border">
            {t.expenses.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate">{e.title || e.merchant}</p>
                  <p className="text-[11px] text-muted-foreground">{e.category} · {e.date}</p>
                </div>
                <span className="text-[13px] font-semibold tabular-nums">₹{(e.amount || 0).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {t?.habits && t.habits.length > 0 && (
        <Section title={`Active habits (${t.habits.length})`}>
          <div className="divide-y divide-border">
            {t.habits.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-[13px] font-medium">{h.name}</p>
                  <p className="text-[11px] text-muted-foreground">{h.done}/{h.goal} {h.unit}</p>
                </div>
                <Badge>🔥 {h.streak}</Badge>
              </div>
            ))}
          </div>
        </Section>
      )}

      {t?.notes && t.notes.length > 0 && (
        <Section title={`Recent notes (${t.notes.length})`}>
          <div className="divide-y divide-border">
            {t.notes.map((n: any) => (
              <div key={n.id} className="px-3 py-2">
                <p className="text-[13px] font-medium flex items-center gap-1.5">
                  {n.pinned && <span>📌</span>}
                  {n.title || "Untitled"}
                </p>
                {n.preview && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.preview}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {t?.recentNotifications && t.recentNotifications.length > 0 && (
        <Section title={`Notifications received (${t.recentNotifications.length})`}>
          <div className="divide-y divide-border">
            {t.recentNotifications.map((n: any) => (
              <div key={n.id} className="px-3 py-2">
                <p className="text-[13px] font-medium">{n.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(n.sent_at)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function ActivityTab({ activities }: { activities: ActivityItem[] }) {
  if (!activities || activities.length === 0) return <EmptyState icon={<ActivityIcon size={20} />} title="No activity yet" description="This user has not performed any tracked actions." />;
  return (
    <div className="relative pl-4">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
      <div className="space-y-4">
        {activities.map((a: any) => (
          <div key={a.id} className="relative">
            <div className="absolute -left-4 top-1.5 h-3 w-3 rounded-full bg-foreground ring-4 ring-background" />
            <p className="text-[13px] font-semibold">
              {a.title || (a.eventType || "").replace(/_/g, " ").toLowerCase()}
            </p>
            {a.subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{a.subtitle}</p>}
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {a.screen ? <span className="font-mono">{a.screen}</span> : null}
              {a.screen ? " · " : ""}{formatDateTime(a.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginsTab({ items }: { items: LoginHistoryItem[] }) {
  if (items.length === 0) return <EmptyState icon={<History size={20} />} title="No login history" />;
  return (
    <div className="space-y-2">
      {items.map((l) => (
        <div key={l.id} className="rounded-xl border border-border p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-mono">{l.ipAddress}</span>
            {l.success ? <Badge variant="success">Success</Badge> : <Badge variant="danger">Failed</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-1 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1">{deviceIcon(l.device)} <span className="truncate">{l.device}</span></span>
            <span className="flex items-center gap-1"><MapPin size={11} /> {l.location || "Unknown"}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{formatDateTime(l.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

function SubsTab({ subs }: { subs: UserSubscription[] }) {
  if (subs.length === 0) return <EmptyState icon={<CreditCard size={20} />} title="No subscriptions" description="This user has never subscribed to a paid plan." />;
  return (
    <div className="space-y-2">
      {subs.map((s) => (
        <div key={s.id} className="rounded-xl border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[14px] font-semibold">{s.plan.name}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{s.plan.billingPeriod}</p>
            </div>
            <StatusPill status={s.status} />
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-[12px]">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-right font-semibold">{formatINR(s.amountCents)}</span>
            <span className="text-muted-foreground">Started</span>
            <span className="text-right">{formatDate(s.startedAt)}</span>
            <span className="text-muted-foreground">Period end</span>
            <span className="text-right">{formatDate(s.currentPeriodEnd)}</span>
            {s.transactionId && (
              <>
                <span className="text-muted-foreground">Transaction</span>
                <span className="text-right font-mono text-[11px] truncate">{s.transactionId}</span>
              </>
            )}
            {s.couponCode && (
              <>
                <span className="text-muted-foreground">Coupon</span>
                <span className="text-right font-mono">{s.couponCode}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">{title}</p>
      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}
function Row({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      <span className="text-[13px] font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

// ===== Send Notification Modal =====
function SendNotificationModal({
  open, onClose, userId, userName,
}: {
  open: boolean; onClose: () => void; userId: string; userName?: string;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setTitle(""); setBody(""); } }, [open]);

  const send = async () => {
    if (!title || !body) { toast.error("Title and body required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/notifications", {
        title, body,
        target: "SELECTED",
        targetValue: JSON.stringify([userId]),
        sendNow: true,
      });
      toast.success(`Notification sent to ${userName || "user"}`);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal open={open} onClose={onClose} title={`Send notification${userName ? ` · ${userName}` : ""}`} size="md">
      <div className="space-y-4">
        <p className="text-[12px] text-muted-foreground">
          This push notification will be delivered to this single user only.
        </p>
        <AdminInput label="Title" value={title} onChange={setTitle} placeholder="Check out our new feature!" required />
        <AdminTextarea label="Message" value={body} onChange={setBody} placeholder="Write your message…" rows={3} required />
        <div className="flex justify-end gap-2 pt-1">
          <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={send} loading={saving}><Send size={14} /> Send now</AdminButton>
        </div>
      </div>
    </AdminModal>
  );
}
