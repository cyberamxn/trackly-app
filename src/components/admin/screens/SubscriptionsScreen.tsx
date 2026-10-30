"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, RefreshCw, Pencil, Trash2, Crown, Tag, Receipt, RotateCcw,
  CreditCard, Percent, Search, ShieldAlert,
  ChevronLeft, ChevronRight, Loader2, CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  PageHeader, AdminButton, AdminCard, AdminInput, AdminSelect,
  AdminTextarea, Toggle, AdminModal, ConfirmDialog, StatusPill, Badge,
  EmptyState, LoadingState,
} from "../components/ui";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/admin/api";

// ===== Types =====
interface Plan {
  id: string;
  name: string;
  tier: string;
  billingPeriod: string;
  priceCents: number;
  currency: string;
  features: string;
  trialDays: number;
  active: boolean;
  sortOrder: number;
  _count?: { subscriptions: number };
}
interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  maxRedemptions: number;
  redemptions: number;
  expiresAt: string | null;
  active: boolean;
  notes: string | null;
  plan: { id: string; name: string } | null;
}
interface AppUserLite { id: string; name: string; email: string; }
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
  user: AppUserLite;
  plan: Plan;
}
interface Refund {
  id: string;
  amountCents: number;
  reason: string;
  status: string;
  userId: string | null;
  createdAt: string;
}

// ===== Helpers =====
const formatINR = (cents: number) => "₹" + (cents / 100).toLocaleString("en-IN");
const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
function parseFeatures(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

type Tab = "plans" | "coupons" | "subscriptions" | "refunds";

// ===== Component =====
export function SubscriptionsScreen() {
  const [tab, setTab] = useState<Tab>("plans");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "plans", label: "Plans", icon: <Crown size={14} /> },
    { id: "coupons", label: "Coupons", icon: <Tag size={14} /> },
    { id: "subscriptions", label: "Subscriptions", icon: <Receipt size={14} /> },
    { id: "refunds", label: "Refunds", icon: <RotateCcw size={14} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle="Plans, coupons, and payment history"
      />

      {/* Segmented Control */}
      <div className="inline-flex p-1 rounded-xl bg-muted mb-6 gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-4 h-9 rounded-lg text-[13px] font-semibold transition-colors ${
              tab === t.id ? "text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === t.id && (
              <motion.div
                layoutId="subs-tab-pill"
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
          {tab === "plans" && <PlansTab />}
          {tab === "coupons" && <CouponsTab />}
          {tab === "subscriptions" && <SubscriptionsTab />}
          {tab === "refunds" && <RefundsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ===== Plans Tab =====
function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet<Plan[]>("/api/admin/plans");
      setPlans(data);
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load plans: " + e.message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleActive = async (p: Plan) => {
    setTogglingId(p.id);
    try {
      await apiPut(`/api/admin/plans/${p.id}`, { active: !p.active });
      toast.success(`${p.name} ${!p.active ? "activated" : "deactivated"}`);
      setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !p.active } : x));
    } catch (e: any) { toast.error(e.message); }
    finally { setTogglingId(null); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/admin/plans/${deleteTarget.id}`);
      toast.success("Plan deleted");
      setDeleteTarget(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  if (loading) return <LoadingState label="Loading plans…" />;
  if (error) return (
    <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
      action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-muted-foreground">{plans.length} plan{plans.length === 1 ? "" : "s"} configured</p>
        <div className="flex items-center gap-2">
          <AdminButton variant="outline" size="sm" onClick={load}><RefreshCw size={13} /></AdminButton>
          <AdminButton variant="primary" size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Plan</AdminButton>
        </div>
      </div>

      {plans.length === 0 ? (
        <EmptyState icon={<Crown size={20} />} title="No plans yet" description="Create your first subscription plan to get started."
          action={<AdminButton variant="primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Plan</AdminButton>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((p) => {
            const features = parseFeatures(p.features);
            const isFree = p.priceCents === 0;
            return (
              <motion.div key={p.id} whileTap={{ scale: 0.99 }}>
                <AdminCard className={`p-5 h-full flex flex-col ${p.active ? "ring-1 ring-foreground" : ""}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{p.tier}</p>
                      <h3 className="text-[18px] font-bold tracking-tight mt-0.5">{p.name}</h3>
                    </div>
                    {p.active ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  </div>

                  <div className="mb-4">
                    <span className="text-[28px] font-bold tracking-tight tabular-nums">{formatINR(p.priceCents)}</span>
                    <span className="text-[12px] text-muted-foreground ml-1 capitalize">/ {p.billingPeriod.toLowerCase()}</span>
                  </div>

                  {features.length > 0 && (
                    <ul className="space-y-1.5 mb-4 flex-1">
                      {features.slice(0, 6).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px]">
                          <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                      {features.length > 6 && <li className="text-[11px] text-muted-foreground pl-5">+{features.length - 6} more</li>}
                    </ul>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
                    <div className="rounded-lg bg-muted px-2.5 py-2">
                      <p className="text-muted-foreground uppercase tracking-wide">Trial</p>
                      <p className="font-semibold text-[13px] mt-0.5">{p.trialDays}d</p>
                    </div>
                    <div className="rounded-lg bg-muted px-2.5 py-2">
                      <p className="text-muted-foreground uppercase tracking-wide">Subscribers</p>
                      <p className="font-semibold text-[13px] mt-0.5">{p._count?.subscriptions ?? 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      {togglingId === p.id ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : null}
                      <Toggle checked={p.active} onChange={() => toggleActive(p)} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditTarget(p)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteTarget(p)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </AdminCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <PlanFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); load(); }}
      />
      <PlanFormModal
        open={!!editTarget}
        plan={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); load(); }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete plan"
        message={`Delete “${deleteTarget?.name}”? Existing subscriptions will keep their records but this plan will no longer be selectable.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={doDelete}
      />
    </div>
  );
}

function PlanFormModal({
  open, onClose, onSaved, plan,
}: {
  open: boolean; onClose: () => void; onSaved: () => void; plan?: Plan | null;
}) {
  const [name, setName] = useState("");
  const [tier, setTier] = useState("PREMIUM");
  const [billingPeriod, setBillingPeriod] = useState("MONTHLY");
  const [priceCents, setPriceCents] = useState("");
  const [trialDays, setTrialDays] = useState("0");
  const [featuresText, setFeaturesText] = useState("");
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (plan) {
      setName(plan.name); setTier(plan.tier); setBillingPeriod(plan.billingPeriod);
      setPriceCents(String(plan.priceCents));
      setTrialDays(String(plan.trialDays));
      setFeaturesText(parseFeatures(plan.features).join("\n"));
      setActive(plan.active); setSortOrder(String(plan.sortOrder));
    } else {
      setName(""); setTier("PREMIUM"); setBillingPeriod("MONTHLY");
      setPriceCents(""); setTrialDays("0"); setFeaturesText("");
      setActive(true); setSortOrder("0");
    }
  }, [open, plan]);

  const submit = async () => {
    if (!name) { toast.error("Name is required"); return; }
    setSaving(true);
    const features = featuresText.split("\n").map((s) => s.trim()).filter(Boolean);
    const body = {
      name, tier, billingPeriod,
      priceCents: parseInt(priceCents || "0", 10) || 0,
      trialDays: parseInt(trialDays || "0", 10) || 0,
      features,
      active,
      sortOrder: parseInt(sortOrder || "0", 10) || 0,
    };
    try {
      if (plan) {
        await apiPut(`/api/admin/plans/${plan.id}`, body);
        toast.success("Plan updated");
      } else {
        await apiPost("/api/admin/plans", body);
        toast.success("Plan created");
      }
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <AdminModal open={open} onClose={onClose} title={plan ? "Edit plan" : "Add plan"} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AdminInput label="Plan name" value={name} onChange={setName} placeholder="Premium Monthly" required />
          <AdminInput label="Price (cents)" value={priceCents} onChange={setPriceCents} placeholder="9900" type="number" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AdminSelect label="Tier" value={tier} onChange={setTier}
            options={[{value:"FREE",label:"Free"},{value:"PREMIUM",label:"Premium"},{value:"LIFETIME",label:"Lifetime"}]} />
          <AdminSelect label="Billing period" value={billingPeriod} onChange={setBillingPeriod}
            options={[{value:"MONTHLY",label:"Monthly"},{value:"YEARLY",label:"Yearly"},{value:"LIFETIME",label:"Lifetime"}]} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AdminInput label="Trial days" value={trialDays} onChange={setTrialDays} type="number" />
          <AdminInput label="Sort order" value={sortOrder} onChange={setSortOrder} type="number" />
        </div>
        <AdminTextarea label="Features (one per line)" value={featuresText} onChange={setFeaturesText}
          placeholder={"Unlimited expenses\nCloud sync\nAI insights"} rows={5} />
        <div className="rounded-xl bg-muted p-3">
          <Toggle checked={active} onChange={setActive} label="Active" description="Inactive plans can't be selected by new subscribers" />
        </div>
        {priceCents && !isNaN(parseInt(priceCents)) && (
          <p className="text-[12px] text-muted-foreground">
            Preview: <span className="font-semibold text-foreground">{formatINR(parseInt(priceCents, 10))}</span> / {billingPeriod.toLowerCase()}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={submit} loading={saving}>{plan ? "Save changes" : "Create plan"}</AdminButton>
        </div>
      </div>
    </AdminModal>
  );
}

// ===== Coupons Tab =====
function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Coupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [data, p] = await Promise.all([apiGet<Coupon[]>("/api/admin/coupons"), apiGet<Plan[]>("/api/admin/plans").catch(() => [])]);
      setCoupons(data); setPlans(p);
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load coupons: " + e.message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleActive = async (c: Coupon) => {
    setTogglingId(c.id);
    try {
      await apiPut(`/api/admin/coupons/${c.id}`, { active: !c.active });
      toast.success(`${c.code} ${!c.active ? "activated" : "deactivated"}`);
      setCoupons((prev) => prev.map((x) => x.id === c.id ? { ...x, active: !c.active } : x));
    } catch (e: any) { toast.error(e.message); }
    finally { setTogglingId(null); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/admin/coupons/${deleteTarget.id}`);
      toast.success("Coupon deleted");
      setDeleteTarget(null); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  if (loading) return <LoadingState label="Loading coupons…" />;
  if (error) return (
    <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
      action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-muted-foreground">{coupons.length} coupon{coupons.length === 1 ? "" : "s"}</p>
        <div className="flex items-center gap-2">
          <AdminButton variant="outline" size="sm" onClick={load}><RefreshCw size={13} /></AdminButton>
          <AdminButton variant="primary" size="sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Coupon</AdminButton>
        </div>
      </div>

      {coupons.length === 0 ? (
        <EmptyState icon={<Tag size={20} />} title="No coupons yet" description="Create discount codes for promotional campaigns."
          action={<AdminButton variant="primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Coupon</AdminButton>} />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_0.8fr_1fr_1fr_0.8fr_1fr_80px] gap-3 px-5 py-3 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <span>Code</span><span>Discount</span><span>Redemptions</span><span>Expires</span><span>Status</span><span>Plan</span><span></span>
          </div>
          <div className="divide-y divide-border">
            {coupons.map((c) => (
              <div key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_0.8fr_1fr_1fr_0.8fr_1fr_80px] gap-3 px-5 py-3.5 items-center hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Tag size={13} /></div>
                  <span className="font-mono text-[13px] font-semibold truncate">{c.code}</span>
                </div>
                <div className="flex items-center gap-1 text-[13px] font-semibold"><Percent size={12} className="text-muted-foreground" />{c.discountPercent}%</div>
                <div className="text-[13px] tabular-nums">
                  <span className="font-semibold">{c.redemptions}</span>
                  <span className="text-muted-foreground"> / {c.maxRedemptions}</span>
                </div>
                <div className="text-[13px] text-muted-foreground">{formatDate(c.expiresAt)}</div>
                <div className="flex items-center">
                  {togglingId === c.id ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : <Toggle checked={c.active} onChange={() => toggleActive(c)} />}
                </div>
                <div className="text-[13px] truncate">{c.plan?.name ?? <span className="text-muted-foreground">Any plan</span>}</div>
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={() => setEditTarget(c)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTarget(c)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      <CouponFormModal open={addOpen} plans={plans} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); load(); }} />
      <CouponFormModal open={!!editTarget} coupon={editTarget} plans={plans} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete coupon"
        message={`Delete coupon “${deleteTarget?.code}”? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting} onConfirm={doDelete} />
    </div>
  );
}

function CouponFormModal({
  open, onClose, onSaved, coupon, plans,
}: {
  open: boolean; onClose: () => void; onSaved: () => void; coupon?: Coupon | null; plans: Plan[];
}) {
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [maxRedemptions, setMaxRedemptions] = useState("100");
  const [expiresAt, setExpiresAt] = useState("");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [planId, setPlanId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (coupon) {
      setCode(coupon.code);
      setDiscountPercent(String(coupon.discountPercent));
      setMaxRedemptions(String(coupon.maxRedemptions));
      setExpiresAt(coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : "");
      setActive(coupon.active);
      setNotes(coupon.notes ?? "");
      setPlanId(coupon.plan?.id ?? "");
    } else {
      setCode(""); setDiscountPercent("10"); setMaxRedemptions("100");
      setExpiresAt(""); setActive(true); setNotes(""); setPlanId("");
    }
  }, [open, coupon]);

  const submit = async () => {
    if (!code) { toast.error("Coupon code is required"); return; }
    setSaving(true);
    const body: any = {
      code: code.toUpperCase(),
      discountPercent: parseInt(discountPercent, 10) || 0,
      maxRedemptions: parseInt(maxRedemptions, 10) || 0,
      active,
      notes: notes || null,
      planId: planId || null,
    };
    if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();
    else body.expiresAt = null;
    try {
      if (coupon) { await apiPut(`/api/admin/coupons/${coupon.id}`, body); toast.success("Coupon updated"); }
      else { await apiPost("/api/admin/coupons", body); toast.success("Coupon created"); }
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <AdminModal open={open} onClose={onClose} title={coupon ? "Edit coupon" : "Add coupon"} size="md">
      <div className="space-y-4">
        <AdminInput label="Coupon code" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="SAVE20" required />
        <div className="grid grid-cols-2 gap-3">
          <AdminInput label="Discount %" value={discountPercent} onChange={setDiscountPercent} type="number" />
          <AdminInput label="Max redemptions" value={maxRedemptions} onChange={setMaxRedemptions} type="number" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AdminInput label="Expires on" value={expiresAt} onChange={setExpiresAt} type="date" />
          <AdminSelect label="Linked plan" value={planId} onChange={setPlanId}
            options={[{value:"",label:"Any plan"}, ...plans.map((p) => ({value:p.id,label:p.name}))]} />
        </div>
        <AdminTextarea label="Internal notes" value={notes} onChange={setNotes} rows={2} placeholder="Campaign reason…" />
        <div className="rounded-xl bg-muted p-3"><Toggle checked={active} onChange={setActive} label="Active" /></div>
        <div className="flex justify-end gap-2 pt-1">
          <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={submit} loading={saving}>{coupon ? "Save changes" : "Create coupon"}</AdminButton>
        </div>
      </div>
    </AdminModal>
  );
}

// ===== Subscriptions Tab =====
function SubscriptionsTab() {
  const [subs, setSubs] = useState<UserSubscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const limit = 15;

  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await apiGet<{subscriptions: UserSubscription[]; total: number; totalPages: number}>(`/api/admin/subscriptions?${params.toString()}`);
      setSubs(res.subscriptions); setTotal(res.total); setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message); toast.error("Failed to load subscriptions: " + e.message);
    } finally { setLoading(false); }
  }, [status, q, page]);
  useEffect(() => { load(); }, [load]);

  // Revenue chart (last 6 months from current page data — quick estimate from total page)
  const revenueData = buildRevenueData(subs);

  return (
    <div className="space-y-4">
      {/* Revenue chart */}
      <AdminCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-bold tracking-tight">Revenue (current page)</h3>
            <p className="text-[12px] text-muted-foreground">Sum of subscription amounts by month</p>
          </div>
          <CreditCard size={16} className="text-muted-foreground" />
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.3} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false}
              tickFormatter={(v) => "₹" + (v / 1000).toFixed(0) + "k"} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 13 }}
              formatter={(v: any) => [formatINR(v as number), "Revenue"]}
            />
            <Area type="monotone" dataKey="amount" stroke="currentColor" strokeWidth={2.5} fill="url(#revGrad)" className="text-foreground" />
          </AreaChart>
        </ResponsiveContainer>
      </AdminCard>

      {/* Filters */}
      <AdminCard className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by transaction ID or user…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors" />
          </div>
          <AdminSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              {value:"",label:"All Statuses"},
              {value:"ACTIVE",label:"Active"},
              {value:"TRIALING",label:"Trialing"},
              {value:"PAST_DUE",label:"Past due"},
              {value:"CANCELED",label:"Canceled"},
              {value:"EXPIRED",label:"Expired"},
            ]} />
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <p className="text-[12px] text-muted-foreground">{loading ? "Loading…" : `${total.toLocaleString()} subscriptions`}</p>
          <AdminButton variant="ghost" size="sm" onClick={load}><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></AdminButton>
        </div>
      </AdminCard>

      {/* Table */}
      <AdminCard className="overflow-hidden">
        {loading ? <LoadingState label="Loading subscriptions…" /> : error ? (
          <EmptyState icon={<ShieldAlert size={20} />} title="Something went wrong" description={error}
            action={<AdminButton variant="outline" onClick={load}>Try again</AdminButton>} />
        ) : subs.length === 0 ? (
          <EmptyState icon={<Receipt size={20} />} title="No subscriptions found" description="Try adjusting your filters." />
        ) : (
          <>
            <div className="hidden lg:grid grid-cols-[1.4fr_1fr_0.8fr_0.9fr_0.9fr_1.2fr_1fr] gap-3 px-5 py-3 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <span>User</span><span>Plan</span><span>Status</span><span>Amount</span><span>Method</span><span>Transaction</span><span>Period</span>
            </div>
            <div className="divide-y divide-border">
              {subs.map((s) => (
                <div key={s.id} className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_0.8fr_0.9fr_0.9fr_1.2fr_1fr] gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors items-center">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate">{s.user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.user.email}</p>
                  </div>
                  <div className="text-[13px]">{s.plan.name}</div>
                  <div><StatusPill status={s.status} /></div>
                  <div className="text-[13px] font-semibold tabular-nums">{formatINR(s.amountCents)}</div>
                  <div className="text-[12px] text-muted-foreground uppercase tracking-wide">{s.paymentMethod}</div>
                  <div className="text-[12px] font-mono truncate text-muted-foreground">{s.transactionId || "—"}</div>
                  <div className="text-[12px] text-muted-foreground">
                    <div>{formatDate(s.startedAt)}</div>
                    {s.currentPeriodEnd && <div className="text-[11px]">→ {formatDate(s.currentPeriodEnd)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </AdminCard>

      {/* Pagination */}
      {!loading && subs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">Page {page} of {Math.max(1, totalPages)}</p>
          <div className="flex items-center gap-2">
            <AdminButton variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /> Prev</AdminButton>
            <AdminButton variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next <ChevronRight size={14} /></AdminButton>
          </div>
        </div>
      )}
    </div>
  );
}

function buildRevenueData(subs: UserSubscription[]) {
  const months: { key: string; label: string; amount: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      amount: 0,
    });
  }
  for (const s of subs) {
    const d = new Date(s.startedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((x) => x.key === key);
    if (m) m.amount += s.amountCents;
  }
  return months;
}

// ===== Refunds Tab =====
function RefundsTab() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processOpen, setProcessOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet<Refund[]>("/api/admin/refunds");
      setRefunds(Array.isArray(data) ? data : (data as any)?.refunds ?? []);
    } catch (e: any) {
      setError(e.message);
      setRefunds([]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Loading refunds…" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-muted-foreground">
          {error ? "Refund service not configured" : `${refunds.length} refund${refunds.length === 1 ? "" : "s"}`}
        </p>
        <AdminButton variant="primary" size="sm" onClick={() => setProcessOpen(true)}><Plus size={14} /> Process Refund</AdminButton>
      </div>

      {refunds.length === 0 ? (
        <EmptyState
          icon={<RotateCcw size={20} />}
          title={error ? "Refund system unavailable" : "No refunds yet"}
          description={error ? "The refunds endpoint is not configured on this server. You can still raise a refund request below — it will be recorded if the backend supports it." : "When users request refunds, they will appear here."}
          action={<AdminButton variant="primary" onClick={() => setProcessOpen(true)}><Plus size={14} /> Process Refund</AdminButton>}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-3 px-5 py-3 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <span>Status</span><span>Amount</span><span>Reason</span><span>Date</span>
          </div>
          <div className="divide-y divide-border">
            {refunds.map((r) => (
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.5fr_1fr] gap-3 px-5 py-3.5 items-center hover:bg-muted/40 transition-colors">
                <div><StatusPill status={r.status} /></div>
                <div className="text-[13px] font-semibold tabular-nums">{formatINR(r.amountCents)}</div>
                <div className="text-[13px] truncate">{r.reason}</div>
                <div className="text-[12px] text-muted-foreground">{formatDate(r.createdAt)}</div>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      <ProcessRefundModal open={processOpen} onClose={() => setProcessOpen(false)} onSaved={() => { setProcessOpen(false); load(); }} />
    </div>
  );
}

function ProcessRefundModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [amountCents, setAmountCents] = useState("");
  const [reason, setReason] = useState("");
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setAmountCents(""); setReason(""); setUserId(""); } }, [open]);

  const submit = async () => {
    if (!amountCents || !reason) { toast.error("Amount and reason are required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/refunds", {
        amountCents: parseInt(amountCents, 10) || 0,
        reason,
        userId: userId || null,
      });
      toast.success("Refund request created");
      onSaved();
    } catch (e: any) {
      toast.error("Refund failed: " + e.message);
    } finally { setSaving(false); }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Process refund" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AdminInput label="Amount (cents)" value={amountCents} onChange={setAmountCents} type="number" placeholder="9900" required />
          <AdminInput label="User ID (optional)" value={userId} onChange={setUserId} placeholder="clxxxx…" />
        </div>
        <AdminTextarea label="Reason" value={reason} onChange={setReason} rows={3} placeholder="Customer reported double charge…" required />
        {amountCents && !isNaN(parseInt(amountCents)) && (
          <p className="text-[12px] text-muted-foreground">Refund amount: <span className="font-semibold text-foreground">{formatINR(parseInt(amountCents, 10))}</span></p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <AdminButton variant="outline" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={submit} loading={saving}><RotateCcw size={14} /> Process refund</AdminButton>
        </div>
      </div>
    </AdminModal>
  );
}
