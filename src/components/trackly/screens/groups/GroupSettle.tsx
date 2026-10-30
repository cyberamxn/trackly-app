"use client";

// Settle tab — "Who owes whom" suggestions, record repayment,
// pending confirmations, full history. Balances/suggestions come from
// the server; pending settlements are factored into suggestions.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Check, X, Loader2, Plus, Wallet } from "lucide-react";
import { useGroupsStore, type GroupDetail } from "@/lib/trackly/groupsStore";
import { formatMoney } from "@/lib/groups/calc";
import { Card, SheetModal, EmptyState } from "../../ui";
import { Avatar, memberName, profileName, relativeTime, TapButton } from "./parts";

export function GroupSettleTab({ detail }: { detail: GroupDetail }) {
  const { recordSettlement, settleAction } = useGroupsStore();
  const { group, viewer, members, suggestions, settlements, stats } = detail;
  const [showRecord, setShowRecord] = useState(false);
  const [prefill, setPrefill] = useState<{ fromUserId: string; toUserId: string; amountPaise: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const nameOf = (uid: string) => {
    const m = members.find((x) => x.userId === uid);
    return m ? memberName(m) : profileName(detail.profiles[uid]);
  };

  const pending = settlements.filter((s) => s.status === "pending");
  const history = settlements.filter((s) => s.status !== "pending");

  const act = async (id: string, action: "confirm" | "reject") => {
    setBusyId(id);
    const res = await settleAction(group.id, id, action);
    setBusyId(null);
    if (res.ok) toast.success(action === "confirm" ? "Repayment confirmed — balances updated" : "Repayment rejected");
    else toast.error(res.error ?? "Failed");
  };

  return (
    <div className="px-5 mt-4 space-y-4">
      {/* record button */}
      <TapButton
        className="w-full h-11 rounded-2xl bg-foreground text-background text-[14px] font-semibold flex items-center justify-center gap-2"
        onClick={() => {
          setPrefill(null);
          setShowRecord(true);
        }}
      >
        <Plus size={16} /> Record a repayment
      </TapButton>

      {/* who owes whom */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Who owes whom</p>
        {suggestions.length === 0 ? (
          <EmptyState
            icon={<Check size={22} />}
            title={settlements.some((s) => s.status === "pending") ? "Almost settled" : "Everyone is settled up"}
            description={
              settlements.some((s) => s.status === "pending")
                ? "Some repayments are awaiting confirmation above/below."
                : "No pending balances in this group. Add expenses to see settlements here."
            }
          />
        ) : (
          <>
            {/* Optimized plan summary — total money in motion & fewest transfers */}
            <Card className="border border-foreground/15 !p-3.5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-foreground/10 flex items-center justify-center shrink-0">
                  <ArrowRightLeft size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold leading-tight">
                    Settle everything in {suggestions.length} transfer{suggestions.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {formatMoney(
                      suggestions.reduce((s, x) => s + x.amountPaise, 0),
                      group.currency
                    )}{" "}
                    changes hands — optimized, fewest payments
                  </p>
                </div>
              </div>
            </Card>
            {suggestions.map((s, i) => (
              <Card key={i} className="border border-border !p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Avatar name={nameOf(s.fromUserId)} url={members.find((m) => m.userId === s.fromUserId)?.avatarUrl} size={30} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold truncate">{nameOf(s.fromUserId)}</p>
                      <p className="text-[10.5px] text-muted-foreground">
                        {s.fromUserId === viewer.userId ? "you pay" : "pays"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center px-1 shrink-0">
                    <span className="text-[13px] font-bold tabular-nums">{formatMoney(s.amountPaise, group.currency)}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-0.5">
                      <ArrowRightLeft size={9} /> pays to
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <div className="min-w-0 text-right">
                      <p className="text-[14px] font-semibold truncate">{nameOf(s.toUserId)}</p>
                      <p className="text-[10.5px] text-muted-foreground">
                        {s.toUserId === viewer.userId ? "you receive" : "receives"}
                      </p>
                    </div>
                    <Avatar name={nameOf(s.toUserId)} url={members.find((m) => m.userId === s.toUserId)?.avatarUrl} size={30} />
                  </div>
                </div>
                {s.fromUserId === viewer.userId && (
                  <TapButton
                    className="w-full h-8 mt-2.5 rounded-lg bg-muted text-[12px] font-semibold flex items-center justify-center gap-1.5"
                    onClick={() => {
                      setPrefill({ fromUserId: s.fromUserId, toUserId: s.toUserId, amountPaise: s.amountPaise });
                      setShowRecord(true);
                    }}
                  >
                    <Check size={13} /> I paid this
                  </TapButton>
                )}
              </Card>
            ))}
          </>
        )}
      </div>

      {/* pending confirmations */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
            Awaiting confirmation ({pending.length})
          </p>
          {pending.map((s) => {
            const canConfirm = s.toUserId === viewer.userId || viewer.isAdmin;
            return (
              <Card key={s.id} className="border border-foreground/15 !p-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Wallet size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate">
                      {nameOf(s.fromUserId)} → {nameOf(s.toUserId)}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {formatMoney(s.amountPaise, group.currency)} · {relativeTime(s.createdAt)}
                      {s.note ? ` · ${s.note}` : ""}
                    </p>
                  </div>
                </div>
                {canConfirm && (
                  <div className="flex gap-2 mt-2.5">
                    <TapButton
                      className="flex-1 h-9 rounded-lg bg-foreground text-background text-[13px] font-semibold flex items-center justify-center gap-1.5"
                      disabled={busyId === s.id}
                      onClick={() => act(s.id, "confirm")}
                    >
                      {busyId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm
                    </TapButton>
                    <TapButton
                      className="flex-1 h-9 rounded-lg bg-muted text-[13px] font-semibold flex items-center justify-center gap-1.5"
                      disabled={busyId === s.id}
                      onClick={() => act(s.id, "reject")}
                    >
                      <X size={14} /> Reject
                    </TapButton>
                  </div>
                )}
                {!canConfirm && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Waiting for {nameOf(s.toUserId)} to confirm.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* history */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">History</p>
          <Card className="border border-border !p-0 overflow-hidden">
            {history.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${i < history.length - 1 ? "border-b border-border" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium truncate">
                    {nameOf(s.fromUserId)} paid {nameOf(s.toUserId)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {relativeTime(s.createdAt)}
                    {s.confirmedAt ? ` · confirmed ${relativeTime(s.confirmedAt)}` : ""}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                <span className={`text-[13px] font-bold tabular-nums ${s.status === "confirmed" ? "text-green-600" : "text-muted-foreground line-through"}`}>
                  {formatMoney(s.amountPaise, group.currency)}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}

      <div className="h-10" />

      {/* record sheet */}
      <RecordSettlementSheet
        open={showRecord}
        onClose={() => setShowRecord(false)}
        detail={detail}
        prefill={prefill}
        onRecord={async (input) => {
          const res = await recordSettlement(group.id, input);
          if (res.ok) toast.success("Repayment recorded — waiting for confirmation");
          else toast.error(res.error ?? "Failed");
          return res.ok;
        }}
      />
    </div>
  );
}

function RecordSettlementSheet({
  open,
  onClose,
  detail,
  prefill,
  onRecord,
}: {
  open: boolean;
  onClose: () => void;
  detail: GroupDetail;
  prefill: { fromUserId: string; toUserId: string; amountPaise: number } | null;
  onRecord: (input: { fromUserId: string; toUserId: string; amountPaise: number; note?: string }) => Promise<boolean>;
}) {
  const { viewer, members } = detail;
  const isAdmin = viewer.isAdmin;
  const membersWithOptions = members.filter((m) => m.status === "active" || m.userId === prefill?.fromUserId || m.userId === prefill?.toUserId);

  const [fromUserId, setFromUserId] = useState(viewer.userId);
  const [toUserId, setToUserId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (prefill) {
      setFromUserId(prefill.fromUserId);
      setToUserId(prefill.toUserId);
      setAmountStr((prefill.amountPaise / 100).toString());
    } else {
      setFromUserId(viewer.userId);
      setToUserId("");
      setAmountStr("");
    }
    setNote("");
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  const amountPaise = Math.round((parseFloat(amountStr) || 0) * 100);

  const submit = async () => {
    if (!fromUserId || !toUserId || fromUserId === toUserId) return toast.error("Choose who paid whom");
    if (!(amountPaise > 0)) return toast.error("Enter a valid amount");
    if (fromUserId !== viewer.userId && !isAdmin) return toast.error("You can only record repayments you made");
    setSaving(true);
    const ok = await onRecord({ fromUserId, toUserId, amountPaise, note: note.trim() || undefined });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <SheetModal open={open} onClose={onClose} title="Record Repayment">
      <div className="space-y-4 pb-4">
        <p className="text-[13px] text-muted-foreground -mt-1">
          Record money that actually changed hands. The receiver confirms it before balances move.
        </p>

        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            From (who paid){isAdmin ? " — admin can record for anyone" : " — you"}
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {(isAdmin ? membersWithOptions : membersWithOptions.filter((m) => m.userId === viewer.userId)).map((m) => (
              <TapButton
                key={m.userId}
                onClick={() => setFromUserId(m.userId)}
                className={`shrink-0 h-9 px-3 rounded-full text-[13px] font-medium border flex items-center gap-1.5 ${
                  fromUserId === m.userId ? "border-foreground bg-foreground text-background" : "border-border"
                }`}
              >
                <Avatar name={memberName(m)} url={m.avatarUrl} size={18} /> {memberName(m)}
              </TapButton>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">To (who received)</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {membersWithOptions
              .filter((m) => m.userId !== fromUserId)
              .map((m) => (
                <TapButton
                  key={m.userId}
                  onClick={() => setToUserId(m.userId)}
                  className={`shrink-0 h-9 px-3 rounded-full text-[13px] font-medium border flex items-center gap-1.5 ${
                    toUserId === m.userId ? "border-foreground bg-foreground text-background" : "border-border"
                  }`}
                >
                  <Avatar name={memberName(m)} url={m.avatarUrl} size={18} /> {memberName(m)}
                </TapButton>
              ))}
          </div>
        </div>

        <div className="h-12 rounded-xl bg-muted px-4 flex items-center gap-1">
          <span className="text-[15px] text-muted-foreground font-semibold">
            {formatMoney(0, detail.group.currency).replace("0", "")}
          </span>
          <input
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            inputMode="decimal"
            className="w-full bg-transparent text-[15px] font-bold outline-none tabular-nums placeholder:text-muted-foreground/60"
          />
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional — e.g. UPI ref)"
          maxLength={200}
          className="w-full h-11 rounded-xl bg-muted px-4 text-[14px] outline-none focus:ring-2 ring-foreground/20 placeholder:text-muted-foreground/60"
        />

        <TapButton
          onClick={submit}
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-foreground text-background text-[15px] font-semibold flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} Record repayment
        </TapButton>
      </div>
    </SheetModal>
  );
}
