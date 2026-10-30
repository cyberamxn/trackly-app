"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, RefreshCw, Pencil, Trash2, ShieldAlert, Loader2, Search,
  Folder, Repeat, ShoppingBag, BellRing, HelpCircle, LifeBuoy, Sparkles, Scale,
  GripVertical, Image as ImageIcon, X,
} from "lucide-react";
import {
  PageHeader, AdminButton, AdminCard, AdminInput, AdminTextarea,
  AdminSelect, Toggle, AdminModal, ConfirmDialog, Badge, EmptyState, LoadingState,
} from "../components/ui";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/admin/api";

// ===== Types =====
interface ContentRecord {
  id: string;
  type: string;
  key: string | null;
  title: string;
  body: string;
  metadata: string; // JSON string
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MetaRecord { [k: string]: any; }

function parseMeta(raw: string): MetaRecord {
  try { return JSON.parse(raw) || {}; } catch { return {}; }
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

// ===== Tab config =====
type TabKey = "CATEGORY" | "HABIT_TEMPLATE" | "SHOPPING_TEMPLATE" | "REMINDER_TEMPLATE" | "FAQ" | "HELP_ARTICLE" | "ONBOARDING_PAGE" | "LEGAL";

interface TabDef {
  key: TabKey;
  label: string;
  icon: typeof Folder;
  types: string[]; // content types to fetch
}

const TABS: TabDef[] = [
  { key: "CATEGORY", label: "Categories", icon: Folder, types: ["CATEGORY"] },
  { key: "HABIT_TEMPLATE", label: "Habit Templates", icon: Repeat, types: ["HABIT_TEMPLATE"] },
  { key: "SHOPPING_TEMPLATE", label: "Shopping Templates", icon: ShoppingBag, types: ["SHOPPING_TEMPLATE"] },
  { key: "REMINDER_TEMPLATE", label: "Reminder Templates", icon: BellRing, types: ["REMINDER_TEMPLATE"] },
  { key: "FAQ", label: "FAQs", icon: HelpCircle, types: ["FAQ"] },
  { key: "HELP_ARTICLE", label: "Help Center", icon: LifeBuoy, types: ["HELP_ARTICLE"] },
  { key: "ONBOARDING_PAGE", label: "Onboarding", icon: Sparkles, types: ["ONBOARDING_PAGE"] },
  { key: "LEGAL", label: "Legal", icon: Scale, types: ["TERMS", "PRIVACY"] },
];

// ===== Component =====
export function ContentScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("CATEGORY");
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const tab = useMemo(() => TABS.find((t) => t.key === activeTab)!, [activeTab]);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setSearch("");
    try {
      // For multi-type tabs (Legal) fetch each type in parallel
      const results = await Promise.all(
        tab.types.map((t) => apiGet<ContentRecord[]>(`/api/admin/content?type=${t}`))
      );
      setItems(results.flat());
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load content: " + e.message);
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/admin/content/${deleteTarget.id}`);
      toast.success("Content deleted");
      setDeleteTarget(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  const toggleActive = async (item: ContentRecord, next: boolean) => {
    // Optimistic
    setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, active: next } : x));
    try {
      await apiPut(`/api/admin/content/${item.id}`, { active: next });
      toast.success(`${item.title} ${next ? "activated" : "deactivated"}`);
    } catch (e: any) {
      setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, active: item.active } : x));
      toast.error(e.message);
    }
  };

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      i.body.toLowerCase().includes(q) ||
      (i.key ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div>
      <PageHeader
        title="Content Management"
        subtitle="Categories, templates, FAQs, and legal pages"
        actions={
          <>
            <AdminButton variant="outline" size="md" onClick={load} loading={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </AdminButton>
            <AdminButton variant="primary" size="md" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add New
            </AdminButton>
          </>
        }
      />

      {/* Segmented tab control */}
      <div className="mb-5">
        <div className="flex items-center gap-1 overflow-x-auto thin-scrollbar -mx-1 px-1 pb-1">
          {TABS.map((t) => {
            const TabIcon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`relative h-9 px-3.5 rounded-xl text-[13px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors
                  ${active ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70"}`}
              >
                <TabIcon size={13} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      {!loading && !error && items.length > 0 && (
        <div className="relative mb-4 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab.label.toLowerCase()}…`}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center">
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <LoadingState label={`Loading ${tab.label.toLowerCase()}…`} />
      ) : error ? (
        <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
          action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={(() => { const Icon = tab.icon; return <Icon size={20} />; })()}
          title={items.length === 0 ? `No ${tab.label.toLowerCase()} yet` : "No matches"}
          description={items.length === 0
            ? `Create your first ${tab.label.toLowerCase().replace(/s$/, "")} to populate this section.`
            : "Try a different search query."}
          action={items.length === 0
            ? <AdminButton variant="primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Add New</AdminButton>
            : <AdminButton variant="outline" onClick={() => setSearch("")}>Clear search</AdminButton>}
        />
      ) : (
        <ContentList
          tabKey={activeTab}
          items={filtered}
          onToggle={toggleActive}
          onEdit={(item) => setEditTarget(item)}
          onDelete={(item) => setDeleteTarget(item)}
        />
      )}

      <ContentFormModal
        open={addOpen}
        tabKey={activeTab}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); load(); }}
      />
      <ContentFormModal
        open={!!editTarget}
        tabKey={activeTab}
        item={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); load(); }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete content"
        message={`Delete “${deleteTarget?.title}”? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={doDelete}
      />
    </div>
  );
}

// ===== Content List =====
function ContentList({
  tabKey, items, onToggle, onEdit, onDelete,
}: {
  tabKey: TabKey;
  items: ContentRecord[];
  onToggle: (item: ContentRecord, next: boolean) => void;
  onEdit: (item: ContentRecord) => void;
  onDelete: (item: ContentRecord) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <ContentRow
          key={item.id}
          tabKey={tabKey}
          item={item}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

// ===== Content Row =====
function ContentRow({
  tabKey, item, onToggle, onEdit, onDelete,
}: {
  tabKey: TabKey;
  item: ContentRecord;
  onToggle: (item: ContentRecord, next: boolean) => void;
  onEdit: (item: ContentRecord) => void;
  onDelete: (item: ContentRecord) => void;
}) {
  const meta = parseMeta(item.metadata);
  const [toggling, setToggling] = useState(false);

  const handleToggle = (next: boolean) => {
    setToggling(true);
    Promise.resolve(onToggle(item, next)).finally(() => setToggling(false));
  };

  return (
    <motion.div whileTap={{ scale: 0.995 }} layout>
      <AdminCard className="p-4 hover:border-foreground/30 transition-colors">
        <div className="flex items-start gap-3">
          {/* Active accent strip */}
          <div className={`w-1 self-stretch rounded-full ${item.active ? "bg-foreground" : "bg-transparent"}`} />

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-[15px] font-bold tracking-tight truncate">{item.title}</h3>
                  {tabKey === "LEGAL" && (
                    <Badge variant={item.type === "TERMS" ? "default" : "outline"}>
                      {item.type === "TERMS" ? "Terms" : "Privacy"}
                    </Badge>
                  )}
                  {!item.active && <Badge variant="outline">Inactive</Badge>}
                  {item.key && (
                    <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.key}</code>
                  )}
                </div>
                {item.body && (
                  <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">{item.body}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onEdit(item)} className="h-8 px-2 rounded-lg hover:bg-muted flex items-center gap-1.5 text-[12px] font-medium">
                  <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
                </button>
                <button onClick={() => onDelete(item)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center" aria-label="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Tab-specific metadata chips */}
            <div className="flex items-center gap-2 flex-wrap text-[12px] mt-2">
              <TabMetaChips tabKey={tabKey} item={item} meta={meta} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border">
              <p className="text-[11px] text-muted-foreground">Updated {timeAgo(item.updatedAt)}</p>
              <div className="flex items-center gap-2">
                {toggling && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
                <Toggle checked={item.active} onChange={handleToggle} />
              </div>
            </div>
          </div>
        </div>
      </AdminCard>
    </motion.div>
  );
}

// ===== Tab-specific metadata chips =====
function MetaChip({ label, value }: { label: string; value: any }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span className="font-medium text-foreground/80">{label}:</span> {String(value)}
    </span>
  );
}

function TabMetaChips({ tabKey, item, meta }: { tabKey: TabKey; item: ContentRecord; meta: MetaRecord }) {
  if (tabKey === "CATEGORY") {
    return (
      <>
        {meta.icon && <MetaChip label="Icon" value={meta.icon} />}
        {meta.sortOrder !== undefined && <MetaChip label="Sort" value={meta.sortOrder} />}
      </>
    );
  }
  if (tabKey === "HABIT_TEMPLATE") {
    return (
      <>
        {meta.icon && <MetaChip label="Icon" value={meta.icon} />}
        {meta.goal !== undefined && <MetaChip label="Goal" value={meta.goal} />}
        {meta.unit && <MetaChip label="Unit" value={meta.unit} />}
      </>
    );
  }
  if (tabKey === "SHOPPING_TEMPLATE") {
    return (
      <>
        {meta.defaultPrice !== undefined && <MetaChip label="Price" value={`₹${Number(meta.defaultPrice || 0).toLocaleString("en-IN")}`} />}
        {meta.store && <MetaChip label="Store" value={meta.store} />}
      </>
    );
  }
  if (tabKey === "REMINDER_TEMPLATE") {
    return (
      <>
        {meta.time && <MetaChip label="Time" value={meta.time} />}
      </>
    );
  }
  if (tabKey === "ONBOARDING_PAGE") {
    return (
      <>
        {meta.sortOrder !== undefined && <MetaChip label="Step" value={meta.sortOrder} />}
        {meta.imageUrl && <MetaChip label="Image" value="✓" />}
      </>
    );
  }
  if (tabKey === "FAQ" || tabKey === "HELP_ARTICLE" || tabKey === "LEGAL") {
    return (
      <span className="text-muted-foreground">
        {item.body.length} chars
      </span>
    );
  }
  return null;
}

// ===== Content Form Modal (dynamic per tab) =====
function ContentFormModal({
  open, onClose, onSaved, tabKey, item,
}: {
  open: boolean; onClose: () => void; onSaved: () => void; tabKey: TabKey; item?: ContentRecord | null;
}) {
  // Generic fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Per-tab metadata fields
  const [icon, setIcon] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [goal, setGoal] = useState("");
  const [unit, setUnit] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [store, setStore] = useState("");
  const [time, setTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [legalType, setLegalType] = useState<string>("TERMS");

  useEffect(() => {
    if (!open) return;
    if (item) {
      setTitle(item.title);
      setBody(item.body);
      setActive(item.active);
      const meta = parseMeta(item.metadata);
      setIcon(meta.icon ?? "");
      setSortOrder(String(meta.sortOrder ?? 0));
      setGoal(String(meta.goal ?? ""));
      setUnit(meta.unit ?? "");
      setDefaultPrice(String(meta.defaultPrice ?? ""));
      setStore(meta.store ?? "");
      setTime(meta.time ?? "");
      setImageUrl(meta.imageUrl ?? "");
      setLegalType(item.type === "PRIVACY" ? "PRIVACY" : "TERMS");
    } else {
      setTitle(""); setBody(""); setActive(true);
      setIcon(""); setSortOrder("0"); setGoal(""); setUnit("");
      setDefaultPrice(""); setStore(""); setTime(""); setImageUrl("");
      setLegalType("TERMS");
    }
  }, [open, item]);

  const submit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);

    // Determine type + metadata
    let type: string = tabKey;
    const meta: MetaRecord = {};
    if (tabKey === "LEGAL") type = legalType;
    if (tabKey === "CATEGORY") { if (icon) meta.icon = icon; meta.sortOrder = parseInt(sortOrder, 10) || 0; }
    if (tabKey === "HABIT_TEMPLATE") {
      if (icon) meta.icon = icon;
      if (goal) meta.goal = parseInt(goal, 10) || 0;
      if (unit) meta.unit = unit;
    }
    if (tabKey === "SHOPPING_TEMPLATE") {
      if (defaultPrice) meta.defaultPrice = parseFloat(defaultPrice) || 0;
      if (store) meta.store = store;
    }
    if (tabKey === "REMINDER_TEMPLATE") { if (time) meta.time = time; }
    if (tabKey === "ONBOARDING_PAGE") {
      meta.sortOrder = parseInt(sortOrder, 10) || 0;
      if (imageUrl) meta.imageUrl = imageUrl;
    }

    try {
      const payload: any = {
        type, title, body: body || "", metadata: meta, active,
      };
      if (item) {
        await apiPut(`/api/admin/content/${item.id}`, payload);
        toast.success("Content updated");
      } else {
        await apiPost("/api/admin/content", payload);
        toast.success("Content created");
      }
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const tabLabel = TABS.find((t) => t.key === tabKey)?.label ?? "Content";
  const bodyRows = tabKey === "LEGAL" ? 14 : tabKey === "HELP_ARTICLE" ? 10 : tabKey === "FAQ" ? 5 : 4;

  return (
    <AdminModal open={open} onClose={onClose} title={item ? `Edit ${tabLabel.toLowerCase().replace(/s$/, "")}` : `Add ${tabLabel.toLowerCase().replace(/s$/, "")}`} size="lg">
      <div className="space-y-4">
        {/* Legal type toggle */}
        {tabKey === "LEGAL" && (
          <AdminSelect
            label="Legal type"
            value={legalType}
            onChange={setLegalType}
            options={[
              { value: "TERMS", label: "Terms of Service" },
              { value: "PRIVACY", label: "Privacy Policy" },
            ]}
          />
        )}

        <AdminInput label="Title" value={title} onChange={setTitle} placeholder="Title" required />

        {/* Tab-specific fields */}
        {tabKey === "CATEGORY" && (
          <div className="grid grid-cols-2 gap-3">
            <AdminInput label="Icon name" value={icon} onChange={setIcon} placeholder="e.g. shopping-cart" />
            <AdminInput label="Sort order" value={sortOrder} onChange={setSortOrder} type="number" />
          </div>
        )}

        {tabKey === "HABIT_TEMPLATE" && (
          <div className="grid grid-cols-3 gap-3">
            <AdminInput label="Icon" value={icon} onChange={setIcon} placeholder="dumbbell" />
            <AdminInput label="Goal" value={goal} onChange={setGoal} type="number" placeholder="30" />
            <AdminInput label="Unit" value={unit} onChange={setUnit} placeholder="days" />
          </div>
        )}

        {tabKey === "SHOPPING_TEMPLATE" && (
          <div className="grid grid-cols-2 gap-3">
            <AdminInput label="Default price (₹)" value={defaultPrice} onChange={setDefaultPrice} type="number" placeholder="0" />
            <AdminInput label="Store" value={store} onChange={setStore} placeholder="Amazon" />
          </div>
        )}

        {tabKey === "REMINDER_TEMPLATE" && (
          <AdminInput label="Default time" value={time} onChange={setTime} placeholder="09:00" />
        )}

        {tabKey === "ONBOARDING_PAGE" && (
          <div className="grid grid-cols-2 gap-3">
            <AdminInput label="Sort order" value={sortOrder} onChange={setSortOrder} type="number" />
            <AdminInput label="Image URL" value={imageUrl} onChange={setImageUrl} placeholder="https://…" />
          </div>
        )}

        {/* Body */}
        {tabKey === "LEGAL" || tabKey === "HELP_ARTICLE" ? (
          <AdminTextarea
            label={tabKey === "LEGAL" ? "Legal text (supports paragraphs)" : "Article body"}
            value={body}
            onChange={setBody}
            rows={bodyRows}
            placeholder={tabKey === "LEGAL" ? "Full legal text…" : "Article content…"}
          />
        ) : tabKey === "FAQ" ? (
          <AdminTextarea label="Answer" value={body} onChange={setBody} rows={bodyRows} placeholder="Answer to the question…" />
        ) : tabKey === "REMINDER_TEMPLATE" ? (
          <AdminTextarea label="Body" value={body} onChange={setBody} rows={bodyRows} placeholder="Reminder text…" />
        ) : tabKey === "HABIT_TEMPLATE" ? (
          <AdminTextarea label="Description" value={body} onChange={setBody} rows={bodyRows} placeholder="Habit description…" />
        ) : tabKey === "SHOPPING_TEMPLATE" || tabKey === "CATEGORY" || tabKey === "ONBOARDING_PAGE" ? (
          <AdminTextarea label="Description" value={body} onChange={setBody} rows={bodyRows} placeholder="Optional description…" />
        ) : null}

        {/* Active toggle */}
        <div className="rounded-xl bg-muted p-3">
          <Toggle checked={active} onChange={setActive} label="Active" description="Show this content in the app" />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={submit} loading={saving}>{item ? "Save changes" : "Create"}</AdminButton>
        </div>
      </div>
    </AdminModal>
  );
}
