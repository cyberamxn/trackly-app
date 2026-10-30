"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search, RefreshCw, Plus, Send, Sparkles, Inbox, Clock,
  CheckCircle2, AlertCircle, Loader2, User, Headphones,
  Bot, ChevronLeft, ChevronRight, Mail, Smartphone, X,
  MessageSquare, Tag, UserCog, StickyNote, ArrowLeft,
} from "lucide-react";
import {
  PageHeader, KpiCard, AdminCard, AdminButton, AdminInput,
  AdminTextarea, AdminSelect, AdminModal, StatusPill, Badge,
  EmptyState, LoadingState,
} from "../components/ui";
import { apiGet, apiPost, apiPut } from "@/lib/admin/api";

// ===== Types =====
interface TicketUser {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  deviceType?: string;
  deviceModel?: string | null;
  country?: string;
}
interface TicketAssignedTo {
  id: string;
  name: string;
  email?: string;
}
interface TicketListItem {
  id: string;
  ticketNumber: string;
  userEmail: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  user: TicketUser | null;
  assignedTo: TicketAssignedTo | null;
  _count: { replies: number };
}
interface TicketReply {
  id: string;
  authorType: string; // ADMIN | USER | AI
  body: string;
  createdAt: string;
  author: { id: string; name: string } | null;
}
interface TicketDetail extends TicketListItem {
  body: string;
  internalNotes: string | null;
  replies: TicketReply[];
}
interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ===== Constants =====
const STATUSES = [
  { value: "", label: "All Status" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];
const PRIORITIES = [
  { value: "", label: "All Priority" },
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];
const PRIORITY_OPTIONS = PRIORITIES.filter((p) => p.value);
const STATUS_OPTIONS = STATUSES.filter((s) => s.value);
const CATEGORIES = [
  "GENERAL", "BUG", "FEATURE_REQUEST", "BILLING", "ACCOUNT", "HOW_TO", "OTHER",
];

// ===== Helpers =====
function timeAgo(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(mins: number): string {
  if (mins <= 0) return "—";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// ===== Priority Badge =====
function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "URGENT")
    return (
      <Badge variant="danger">
        <AlertCircle size={10} /> URGENT
      </Badge>
    );
  if (priority === "HIGH") return <Badge variant="default">HIGH</Badge>;
  if (priority === "NORMAL") return <Badge variant="outline">NORMAL</Badge>;
  return <Badge variant="outline">LOW</Badge>;
}

// ===== Main Component =====
export function SupportScreen() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [admins, setAdmins] = useState<Admin[]>([]);

  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const [newTicketOpen, setNewTicketOpen] = useState(false);

  // KPIs
  const [kpis, setKpis] = useState({
    open: 0,
    inProgress: 0,
    resolvedToday: 0,
    avgResponseMins: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(true);

  // Thread scroll ref
  const threadRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset filters
  const resetFilters = () => {
    setStatusFilter("");
    setPriorityFilter("");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  // Load ticket list
  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);
      params.set("page", String(page));
      params.set("limit", "15");
      const data = await apiGet<{
        tickets: TicketListItem[];
        total: number;
        totalPages: number;
      }>(`/api/admin/tickets?${params.toString()}`);
      setTickets(data.tickets);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      setError(e.message);
      toast.error("Failed to load tickets: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, debouncedSearch, page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Load admins
  useEffect(() => {
    apiGet<Admin[]>("/api/admin/security/admins")
      .then(setAdmins)
      .catch(() => {
        // Role may not permit — silently ignore
      });
  }, []);

  // Load KPIs
  const loadKpis = useCallback(async () => {
    setKpiLoading(true);
    try {
      const [openRes, inProgRes, resolvedRes, recentRes] = await Promise.all([
        apiGet<{ total: number }>("/api/admin/tickets?status=OPEN&limit=1").catch(() => ({ total: 0 })),
        apiGet<{ total: number }>("/api/admin/tickets?status=IN_PROGRESS&limit=1").catch(() => ({ total: 0 })),
        apiGet<{ tickets: TicketListItem[] }>(
          "/api/admin/tickets?status=RESOLVED&limit=100"
        ).catch(() => ({ tickets: [] })),
        apiGet<{ tickets: TicketListItem[] }>(
          "/api/admin/tickets?limit=20"
        ).catch(() => ({ tickets: [] })),
      ]);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const resolvedToday = resolvedRes.tickets.filter(
        (t) => new Date(t.updatedAt) >= todayStart
      ).length;

      // Avg response time from recent tickets with replies
      let avgMins = 0;
      const withReplies = recentRes.tickets
        .filter((t) => t._count.replies > 0)
        .slice(0, 5);
      if (withReplies.length > 0) {
        const details = await Promise.all(
          withReplies.map((t) =>
            apiGet<TicketDetail>(`/api/admin/tickets/${t.id}`).catch(() => null)
          )
        );
        const times: number[] = [];
        details.forEach((d) => {
          if (d && d.replies.length > 0) {
            const firstReply = d.replies[0];
            const diffMs =
              new Date(firstReply.createdAt).getTime() -
              new Date(d.createdAt).getTime();
            if (diffMs > 0) times.push(diffMs / 60000);
          }
        });
        if (times.length > 0) {
          avgMins = Math.round(
            times.reduce((a, b) => a + b, 0) / times.length
          );
        }
      }

      setKpis({
        open: openRes.total,
        inProgress: inProgRes.total,
        resolvedToday,
        avgResponseMins: avgMins,
      });
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  // Load detail when selected
  const loadDetail = useCallback(async () => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const d = await apiGet<TicketDetail>(`/api/admin/tickets/${selectedId}`);
      setDetail(d);
      // Scroll thread to bottom
      setTimeout(() => {
        if (threadRef.current) {
          threadRef.current.scrollTop = threadRef.current.scrollHeight;
        }
      }, 100);
    } catch (e: any) {
      toast.error(e.message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // ===== Actions =====
  const sendReply = async () => {
    if (!detail || !reply.trim()) return;
    setSendingReply(true);
    try {
      await apiPost(`/api/admin/tickets/${detail.id}/replies`, {
        body: reply.trim(),
        authorType: "ADMIN",
      });
      toast.success("Reply sent");
      setReply("");
      await loadDetail();
      loadList();
      loadKpis();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingReply(false);
    }
  };

  const aiSuggest = async () => {
    if (!detail) return;
    setSuggesting(true);
    try {
      let aiConnected = false;
      try {
        const integrations = await apiGet<any[]>("/api/admin/integrations");
        aiConnected = integrations.some(
          (i: any) =>
            (i.key === "OPENAI" || i.key === "openai") && i.connected
        );
      } catch {}

      const userName = detail.user?.name || detail.userEmail.split("@")[0] || "there";
      const subject = detail.subject;
      const canned = `Hi ${userName},\n\nThanks for reaching out about "${subject}". I've reviewed your message and our team is looking into this right away.\n\nWe'll follow up with a detailed update shortly. In the meantime, if you have any additional context, screenshots, or steps to reproduce, please feel free to share them — it'll help us resolve this faster.\n\nBest regards,\nTrackly Support`;
      setReply(canned);
      if (aiConnected) {
        toast.success("AI suggestion generated");
      } else {
        toast("Canned suggestion inserted — connect OpenAI for AI-powered replies", {
          icon: "✨",
        });
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSuggesting(false);
    }
  };

  const updateField = async (field: string, value: string) => {
    if (!detail) return;
    try {
      await apiPut(`/api/admin/tickets/${detail.id}`, { [field]: value });
      toast.success("Ticket updated");
      setDetail((prev) =>
        prev ? { ...prev, [field]: value } : prev
      );
      loadList();
      loadKpis();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveNotes = async (notes: string) => {
    if (!detail) return;
    if (notes === (detail.internalNotes ?? "")) return;
    try {
      await apiPut(`/api/admin/tickets/${detail.id}`, {
        internalNotes: notes,
      });
      toast.success("Notes saved");
      setDetail((prev) =>
        prev ? { ...prev, internalNotes: notes } : prev
      );
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const refresh = () => {
    loadList();
    loadKpis();
    if (selectedId) loadDetail();
  };

  // ===== Render =====
  return (
    <div>
      <PageHeader
        title="Support Center"
        subtitle="Manage user tickets and inquiries"
        actions={
          <>
            <AdminButton variant="outline" size="md" onClick={refresh} loading={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </AdminButton>
            <AdminButton variant="primary" size="md" onClick={() => setNewTicketOpen(true)}>
              <Plus size={14} /> New Ticket
            </AdminButton>
          </>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard
          label="Open Tickets"
          value={kpis.open}
          delta="Awaiting response"
          trend="neutral"
          icon={<Inbox size={18} />}
          loading={kpiLoading}
        />
        <KpiCard
          label="In Progress"
          value={kpis.inProgress}
          delta="Being handled"
          trend="up"
          icon={<Clock size={18} />}
          loading={kpiLoading}
        />
        <KpiCard
          label="Resolved Today"
          value={kpis.resolvedToday}
          delta="Closed today"
          trend="up"
          icon={<CheckCircle2 size={18} />}
          loading={kpiLoading}
        />
        <KpiCard
          label="Avg Response Time"
          value={formatDuration(kpis.avgResponseMins)}
          delta="First reply"
          trend="neutral"
          icon={<Headphones size={18} />}
          loading={kpiLoading}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, ticket number, or email…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-card border border-border text-[14px] outline-none focus:border-foreground transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-xl bg-card border border-border text-[14px] outline-none focus:border-foreground transition-colors"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-xl bg-card border border-border text-[14px] outline-none focus:border-foreground transition-colors"
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {(statusFilter || priorityFilter || search) && (
          <button
            onClick={resetFilters}
            className="h-10 px-3 rounded-xl border border-border text-[14px] font-medium hover:bg-muted transition-colors inline-flex items-center gap-1.5"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT — Ticket List (40%) */}
        <div
          className={`lg:col-span-2 ${
            selectedId ? "hidden lg:block" : ""
          }`}
        >
          <AdminCard className="flex flex-col lg:h-[calc(100vh-360px)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-[13px] font-semibold">
                {total.toLocaleString()} {total === 1 ? "ticket" : "tickets"}
              </span>
              {loading && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
            </div>

            <div className="flex-1 overflow-y-auto thin-scrollbar">
              {loading ? (
                <LoadingState label="Loading tickets…" />
              ) : error ? (
                <EmptyState
                  icon={<AlertCircle size={20} />}
                  title="Failed to load"
                  description={error}
                  action={
                    <AdminButton variant="outline" size="sm" onClick={loadList}>
                      Retry
                    </AdminButton>
                  }
                />
              ) : tickets.length === 0 ? (
                <EmptyState
                  icon={<Inbox size={20} />}
                  title="No tickets found"
                  description={
                    search || statusFilter || priorityFilter
                      ? "Try adjusting your filters."
                      : "New tickets will appear here."
                  }
                />
              ) : (
                tickets.map((t) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    selected={t.id === selectedId}
                    onClick={() => setSelectedId(t.id)}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-[12px] text-muted-foreground tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </AdminCard>
        </div>

        {/* RIGHT — Detail Panel (60%) */}
        <div
          className={`lg:col-span-3 ${
            !selectedId ? "hidden lg:block" : ""
          }`}
        >
          {!selectedId ? (
            <AdminCard className="h-full min-h-[400px] lg:h-[calc(100vh-360px)]">
              <EmptyState
                icon={<MessageSquare size={20} />}
                title="No ticket selected"
                description="Select a ticket from the list to view the conversation and manage it."
              />
            </AdminCard>
          ) : (
            <AdminCard className="h-full lg:h-[calc(100vh-360px)] flex flex-col overflow-hidden">
              {detailLoading && !detail ? (
                <LoadingState label="Loading ticket…" />
              ) : detail ? (
                <TicketDetailPanel
                  key={detail.id}
                  detail={detail}
                  admins={admins}
                  threadRef={threadRef}
                  reply={reply}
                  setReply={setReply}
                  sendingReply={sendingReply}
                  suggesting={suggesting}
                  onSendReply={sendReply}
                  onAiSuggest={aiSuggest}
                  onUpdateField={updateField}
                  onSaveNotes={saveNotes}
                  onBack={() => setSelectedId(null)}
                />
              ) : (
                <EmptyState
                  icon={<AlertCircle size={20} />}
                  title="Ticket not found"
                  description="This ticket may have been deleted."
                  action={
                    <AdminButton
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedId(null)}
                    >
                      Back to list
                    </AdminButton>
                  }
                />
              )}
            </AdminCard>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      <NewTicketModal
        open={newTicketOpen}
        onClose={() => setNewTicketOpen(false)}
        onSaved={() => {
          setNewTicketOpen(false);
          loadList();
          loadKpis();
        }}
      />
    </div>
  );
}

// ===== Ticket Row =====
function TicketRow({
  ticket,
  selected,
  onClick,
}: {
  ticket: TicketListItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border transition-colors relative ${
        selected
          ? "bg-foreground/[0.04]"
          : "hover:bg-muted/50"
      }`}
    >
      {selected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-foreground" />
      )}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono text-muted-foreground shrink-0">
            {ticket.ticketNumber}
          </span>
          <PriorityBadge priority={ticket.priority} />
        </div>
        <StatusPill status={ticket.status} />
      </div>
      <p className="text-[14px] font-semibold truncate leading-tight">
        {ticket.subject}
      </p>
      <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-muted-foreground">
        <Mail size={11} className="shrink-0" />
        <span className="truncate">{ticket.userEmail}</span>
      </div>
      <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Tag size={10} />
            {ticket.category.replace(/_/g, " ")}
          </span>
          {ticket._count.replies > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare size={10} />
              {ticket._count.replies}
            </span>
          )}
        </div>
        <span>{timeAgo(ticket.createdAt)}</span>
      </div>
      {ticket.assignedTo && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
          <UserCog size={10} />
          <span>{ticket.assignedTo.name}</span>
        </div>
      )}
    </motion.button>
  );
}

// ===== Ticket Detail Panel =====
function TicketDetailPanel({
  detail,
  admins,
  threadRef,
  reply,
  setReply,
  sendingReply,
  suggesting,
  onSendReply,
  onAiSuggest,
  onUpdateField,
  onSaveNotes,
  onBack,
}: {
  detail: TicketDetail;
  admins: Admin[];
  threadRef: React.RefObject<HTMLDivElement | null>;
  reply: string;
  setReply: (v: string) => void;
  sendingReply: boolean;
  suggesting: boolean;
  onSendReply: () => void;
  onAiSuggest: () => void;
  onUpdateField: (field: string, value: string) => void;
  onSaveNotes: (notes: string) => void;
  onBack: () => void;
}) {
  const [notes, setNotes] = useState(detail.internalNotes ?? "");

  return (
    <>
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onBack}
            className="lg:hidden h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center"
          >
            <ArrowLeft size={15} />
          </button>
          <span className="text-[12px] font-mono text-muted-foreground">
            {detail.ticketNumber}
          </span>
          <StatusPill status={detail.status} />
          <PriorityBadge priority={detail.priority} />
        </div>
        <h2 className="text-[18px] font-bold tracking-tight leading-tight">
          {detail.subject}
        </h2>
      </div>

      {/* Controls bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-5 py-3 border-b border-border bg-muted/30">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Status
          </label>
          <select
            value={detail.status}
            onChange={(e) => onUpdateField("status", e.target.value)}
            className="w-full h-8 px-2 rounded-lg bg-background border border-border text-[12px] outline-none focus:border-foreground transition-colors"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Priority
          </label>
          <select
            value={detail.priority}
            onChange={(e) => onUpdateField("priority", e.target.value)}
            className="w-full h-8 px-2 rounded-lg bg-background border border-border text-[12px] outline-none focus:border-foreground transition-colors"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Assign To
          </label>
          <select
            value={detail.assignedTo?.id ?? ""}
            onChange={(e) => onUpdateField("assignedToId", e.target.value)}
            className="w-full h-8 px-2 rounded-lg bg-background border border-border text-[12px] outline-none focus:border-foreground transition-colors"
          >
            <option value="">Unassigned</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Category
          </label>
          <select
            value={detail.category}
            onChange={(e) => onUpdateField("category", e.target.value)}
            className="w-full h-8 px-2 rounded-lg bg-background border border-border text-[12px] outline-none focus:border-foreground transition-colors"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* User info bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <div className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-bold shrink-0">
          {detail.user?.avatar ? (
            <img
              src={detail.user.avatar}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            getInitials(detail.user?.name ?? null, detail.userEmail)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate">
            {detail.user?.name || detail.userEmail.split("@")[0]}
          </p>
          <p className="text-[12px] text-muted-foreground truncate">
            {detail.userEmail}
          </p>
        </div>
        {detail.user?.deviceModel && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
            <Smartphone size={12} />
            <span>{detail.user.deviceModel}</span>
          </div>
        )}
      </div>

      {/* Conversation thread */}
      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto thin-scrollbar px-5 py-4 space-y-4"
      >
        {/* Initial message (user) */}
        <MessageBubble
          type="USER"
          authorName={detail.user?.name || detail.userEmail.split("@")[0]}
          body={detail.body}
          timestamp={detail.createdAt}
        />

        {/* Replies */}
        {detail.replies.map((r) => (
          <MessageBubble
            key={r.id}
            type={r.authorType as "ADMIN" | "USER" | "AI"}
            authorName={
              r.author?.name ??
              (r.authorType === "AI"
                ? "AI Assistant"
                : r.authorType === "USER"
                ? detail.user?.name || "User"
                : "Support Agent")
            }
            body={r.body}
            timestamp={r.createdAt}
          />
        ))}
      </div>

      {/* Internal Notes */}
      <div className="px-5 py-3 border-t border-border">
        <div className="flex items-center gap-1.5 mb-1.5">
          <StickyNote size={12} className="text-muted-foreground" />
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Internal Notes
          </label>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => onSaveNotes(notes)}
          placeholder="Add private notes for your team (not visible to user)…"
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-[13px] outline-none focus:border-foreground transition-colors resize-none"
        />
      </div>

      {/* Reply box */}
      <div className="px-5 py-4 border-t border-border">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type your reply…"
          rows={3}
          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={onAiSuggest}
            loading={suggesting}
          >
            <Sparkles size={13} /> AI Suggest Reply
          </AdminButton>
          <AdminButton
            variant="primary"
            size="sm"
            onClick={onSendReply}
            loading={sendingReply}
            disabled={!reply.trim()}
          >
            <Send size={13} /> Send Reply
          </AdminButton>
        </div>
      </div>
    </>
  );
}

// ===== Message Bubble =====
function MessageBubble({
  type,
  authorName,
  body,
  timestamp,
}: {
  type: "ADMIN" | "USER" | "AI";
  authorName: string;
  body: string;
  timestamp: string;
}) {
  const isUser = type === "USER";
  const isAI = type === "AI";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className="flex items-center gap-1.5 mb-1">
          {!isUser && (
            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
              {isAI ? (
                <Bot size={11} />
              ) : (
                <Headphones size={11} />
              )}
            </div>
          )}
          <span className="text-[11px] font-medium text-muted-foreground">
            {isAI ? "AI Assistant" : authorName}
            {isAI && (
              <span className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] bg-muted font-semibold">
                AI
              </span>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(timestamp)}
          </span>
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-muted text-foreground rounded-tr-md"
              : "bg-foreground text-background rounded-tl-md"
          }`}
        >
          {body}
        </div>
      </div>
    </div>
  );
}

// ===== New Ticket Modal =====
function NewTicketModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [userEmail, setUserEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [category, setCategory] = useState("GENERAL");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUserEmail("");
    setSubject("");
    setBody("");
    setPriority("NORMAL");
    setCategory("GENERAL");
  }, [open]);

  const submit = async () => {
    if (!userEmail.trim() || !subject.trim() || !body.trim()) {
      toast.error("Email, subject, and body are required");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/admin/tickets", {
        userEmail: userEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        priority,
        category,
      });
      toast.success("Ticket created");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="New Support Ticket" size="md">
      <div className="space-y-4">
        <AdminInput
          label="User Email"
          value={userEmail}
          onChange={setUserEmail}
          placeholder="user@example.com"
          type="email"
          required
        />
        <AdminInput
          label="Subject"
          value={subject}
          onChange={setSubject}
          placeholder="Brief description of the issue"
          required
        />
        <AdminTextarea
          label="Body"
          value={body}
          onChange={setBody}
          placeholder="Full description of the user's issue or inquiry…"
          rows={5}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <AdminSelect
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={PRIORITY_OPTIONS.map((p) => ({
              value: p.value,
              label: p.label,
            }))}
          />
          <AdminSelect
            label="Category"
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map((c) => ({
              value: c,
              label: c.replace(/_/g, " "),
            }))}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <AdminButton variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={submit} loading={saving}>
            <Plus size={14} /> Create Ticket
          </AdminButton>
        </div>
      </div>
    </AdminModal>
  );
}
