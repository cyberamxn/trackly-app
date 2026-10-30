"use client";

// Members & Balances tab + Invite sheet + member action sheets.

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, Send, Ban, RotateCcw, Check, X, Crown, UserMinus, LogOut, Search, ArrowRightLeft } from "lucide-react";
import { useGroupsStore, type GroupDetail, type GroupMemberDTO, type UserSearchResult } from "@/lib/trackly/groupsStore";
import { formatMoney } from "@/lib/groups/calc";
import { Card, SheetModal, EmptyState } from "../../ui";
import { Avatar, memberName, RoleChip, StatusChip, NetAmount, relativeTime, TapButton } from "./parts";

export function GroupMembersTab({ detail }: { detail: GroupDetail }) {
  const { inviteMember, cancelInvitation, resendInvitation, removeMember, transferAdmin, leaveGroup } = useGroupsStore();
  const { group, viewer, members, stats } = detail;
  const isAdmin = viewer.isAdmin;
  const [showInvite, setShowInvite] = useState(false);
  const [selected, setSelected] = useState<GroupMemberDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const activeMembers = members.filter((m) => m.status === "active");
  const formerMembers = members.filter((m) => m.status !== "active");
  const pendingInvites = detail.invitations.filter((i) => i.status === "pending");
  const pastInvites = detail.invitations.filter((i) => i.status !== "pending");

  const myStats = stats[viewer.userId];
  const memberDetail = selected ? stats[selected.userId] : null;

  const doAction = async (fn: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      toast.success(successMsg);
      setSelected(null);
    } else toast.error(res.error ?? "Failed");
  };

  return (
    <div className="px-5 mt-4 space-y-4">
      {/* invite button */}
      {isAdmin && !group.archived && (
        <TapButton
          className="w-full h-11 rounded-2xl bg-foreground text-background text-[14px] font-semibold flex items-center justify-center gap-2"
          onClick={() => setShowInvite(true)}
        >
          <UserPlus size={16} /> Invite people
        </TapButton>
      )}

      {/* pending invitations (admin view) */}
      {isAdmin && detail.invitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
            Invitations ({pendingInvites.length} pending)
          </p>
          {detail.invitations.map((inv) => (
            <Card key={inv.id} className="border border-border !p-3.5">
              <div className="flex items-center gap-3">
                <Avatar name={inv.fullName || inv.username || inv.invitedIdentifier} size={34} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate">
                    {inv.fullName || inv.username || inv.invitedIdentifier}
                  </p>
                  <p className="text-[12px] text-muted-foreground truncate">@{inv.username ?? inv.invitedIdentifier}</p>
                </div>
                <StatusChip status={inv.status} />
              </div>
              {inv.status === "pending" && (
                <div className="flex gap-2 mt-2.5">
                  <TapButton
                    className="flex-1 h-8 rounded-lg bg-muted text-[12px] font-semibold flex items-center justify-center gap-1"
                    disabled={busy}
                    onClick={() => doAction(() => cancelInvitation(group.id, inv.id), "Invitation cancelled")}
                  >
                    <Ban size={12} /> Cancel
                  </TapButton>
                </div>
              )}
              {(inv.status === "declined" || inv.status === "cancelled") && (
                <div className="flex gap-2 mt-2.5">
                  <TapButton
                    className="flex-1 h-8 rounded-lg bg-muted text-[12px] font-semibold flex items-center justify-center gap-1"
                    disabled={busy}
                    onClick={() => doAction(() => resendInvitation(group.id, inv.id), "Invitation resent")}
                  >
                    <RotateCcw size={12} /> Resend
                  </TapButton>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* active members */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
          Members ({activeMembers.length})
        </p>
        {activeMembers.map((m) => {
          const s = stats[m.userId];
          const isMe = m.userId === viewer.userId;
          return (
            <Card key={m.userId} onClick={() => setSelected(m)} className="border border-border !p-3.5">
              <div className="flex items-center gap-3">
                <Avatar name={memberName(m)} url={m.avatarUrl} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-semibold truncate">
                      {memberName(m)} {isMe && <span className="text-muted-foreground font-normal">(you)</span>}
                    </p>
                    <RoleChip role={m.role} />
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    paid {formatMoney(s?.paidPaise ?? 0, group.currency)} · share {formatMoney(s?.sharePaise ?? 0, group.currency)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <NetAmount netPaise={s?.netPaise ?? 0} currency={group.currency} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* former members — history preserved */}
      {formerMembers.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
            Former members ({formerMembers.length})
          </p>
          {formerMembers.map((m) => {
            const s = stats[m.userId];
            return (
              <Card key={m.userId} onClick={() => setSelected(m)} className="border border-border !p-3.5 opacity-70">
                <div className="flex items-center gap-3">
                  <Avatar name={memberName(m)} url={m.avatarUrl} size={34} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate">{memberName(m)}</p>
                    <p className="text-[11px] text-muted-foreground">{m.status === "removed" ? "removed" : "left"} · {relativeTime(m.joinedAt)} joined</p>
                  </div>
                  <NetAmount netPaise={s?.netPaise ?? 0} currency={group.currency} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="h-10" />

      {/* ===== Invite sheet ===== */}
      <InviteSheet open={showInvite} onClose={() => setShowInvite(false)} detail={detail} onInvite={inviteMember} />

      {/* ===== Member detail / actions sheet ===== */}
      <SheetModal open={!!selected} onClose={() => setSelected(null)} title={selected ? memberName(selected) : ""}>
        {selected && (
          <div className="space-y-4 pb-4">
            <div className="flex items-center gap-3">
              <Avatar name={memberName(selected)} url={selected.avatarUrl} size={54} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[17px] font-bold">{memberName(selected)}</p>
                  <RoleChip role={selected.role} />
                  {selected.status !== "active" && <StatusChip status={selected.status} />}
                </div>
                <p className="text-[13px] text-muted-foreground">@{selected.username ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground">joined {relativeTime(selected.joinedAt)}</p>
              </div>
            </div>

            {memberDetail && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="border border-border">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Paid</p>
                  <p className="text-[17px] font-bold tabular-nums mt-0.5">{formatMoney(memberDetail.paidPaise, group.currency)}</p>
                  <p className="text-[11px] text-muted-foreground">{memberDetail.expenseCount} expenses</p>
                </Card>
                <Card className="border border-border">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Share</p>
                  <p className="text-[17px] font-bold tabular-nums mt-0.5">{formatMoney(memberDetail.sharePaise, group.currency)}</p>
                  <p className="text-[11px] text-muted-foreground">responsibility</p>
                </Card>
                <Card className="border border-border col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Net balance</p>
                  <div className="mt-1 flex items-center justify-between">
                    <NetAmount netPaise={memberDetail.netPaise} currency={group.currency} className="!text-[19px] font-bold" />
                    {memberDetail.pendingSentPaise > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{formatMoney(memberDetail.pendingSentPaise, group.currency)} pending
                      </span>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Personal settlement plan — who this member pays / receives from */}
            {(() => {
              const pays = detail.suggestions.filter((s) => s.fromUserId === selected.userId);
              const receives = detail.suggestions.filter((s) => s.toUserId === selected.userId);
              if (pays.length === 0 && receives.length === 0) return null;
              const nm = (uid: string) => {
                const m = detail.members.find((x) => x.userId === uid);
                return m ? memberName(m) : (detail.profiles[uid]?.fullName || detail.profiles[uid]?.username || "Member");
              };
              return (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    To settle up
                  </p>
                  <Card className="border border-border !p-0 overflow-hidden">
                    {pays.map((s, i) => (
                      <div
                        key={`p-${i}`}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < pays.length - 1 || receives.length > 0 ? "border-b border-border" : ""}`}
                      >
                        <ArrowRightLeft size={13} className="text-muted-foreground shrink-0" />
                        <p className="flex-1 min-w-0 text-[13.5px] leading-snug">
                          Pays <b>{nm(s.toUserId)}</b>
                        </p>
                        <span className="text-[13px] font-bold tabular-nums text-red-500 shrink-0">
                          {formatMoney(s.amountPaise, group.currency)}
                        </span>
                      </div>
                    ))}
                    {receives.map((s, i) => (
                      <div
                        key={`r-${i}`}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < receives.length - 1 ? "border-b border-border" : ""}`}
                      >
                        <ArrowRightLeft size={13} className="text-muted-foreground shrink-0" />
                        <p className="flex-1 min-w-0 text-[13.5px] leading-snug">
                          Gets paid by <b>{nm(s.fromUserId)}</b>
                        </p>
                        <span className="text-[13px] font-bold tabular-nums text-green-600 shrink-0">
                          {formatMoney(s.amountPaise, group.currency)}
                        </span>
                      </div>
                    ))}
                  </Card>
                </div>
              );
            })()}

            {/* actions */}
            {selected.userId === viewer.userId ? (
              <TapButton
                className="w-full h-11 rounded-xl bg-muted text-[14px] font-semibold flex items-center justify-center gap-2"
                disabled={busy}
                onClick={() => {
                  const net = myStats?.netPaise ?? 0;
                  const warn = net !== 0 ? `\n\nYour balance is ${formatMoney(net, group.currency)} — history is kept.` : "";
                  if (!window.confirm(`Leave "${group.name}"?${warn}`)) return;
                  doAction(async () => {
                    const res = await leaveGroup(group.id);
                    return res;
                  }, "You left the group");
                }}
              >
                <LogOut size={15} /> Leave group
              </TapButton>
            ) : (
              isAdmin && selected.status === "active" && (
                <div className="space-y-2">
                  <TapButton
                    className="w-full h-11 rounded-xl bg-muted text-[14px] font-semibold flex items-center justify-center gap-2"
                    disabled={busy}
                    onClick={() => {
                      const s = stats[selected.userId];
                      const net = s?.netPaise ?? 0;
                      const warn = net !== 0 ? `\n\n⚠ ${memberName(selected)} has an outstanding balance of ${formatMoney(net, group.currency)} — it stays in the ledger.` : "";
                      if (!window.confirm(`Remove ${memberName(selected)} from the group?${warn}`)) return;
                      doAction(() => removeMember(group.id, selected.userId), "Member removed");
                    }}
                  >
                    <UserMinus size={15} /> Remove from group
                  </TapButton>
                  <TapButton
                    className="w-full h-11 rounded-xl bg-muted text-[14px] font-semibold flex items-center justify-center gap-2"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`Make ${memberName(selected)} the group admin? You'll become a regular member.`)) return;
                      doAction(() => transferAdmin(group.id, selected.userId), "Admin transferred");
                    }}
                  >
                    <Crown size={15} /> Make admin
                  </TapButton>
                </div>
              )
            )}
          </div>
        )}
      </SheetModal>
    </div>
  );
}

// ===================================================================
// Invite sheet — Instagram-style live user search
// Type "a" → matching accounts (aman, anna…) start appearing instantly.
// Tap a result to invite; manual email entry still works (exact match).
// ===================================================================
function InviteSheet({
  open,
  onClose,
  detail,
  onInvite,
}: {
  open: boolean;
  onClose: () => void;
  detail: GroupDetail;
  onInvite: (groupId: string, input: { identifier?: string; userId?: string }) => Promise<{ ok: boolean; error?: string; data?: any }>;
}) {
  const { searchUsers } = useGroupsStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false); // has a search completed
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set()); // invited this session
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSearching(false);
      setSearched(false);
      setInvitingId(null);
      setDoneIds(new Set());
      setError(null);
    }
  }, [open]);

  // Debounced live search — 250ms after typing stops
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!open || !q) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      setError(null);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchUsers(q, detail.group.id);
      if (!res.ok) {
        setSearching(false);
        setResults([]);
        setError(res.error ?? "Search failed");
        return;
      }
      setResults(res.results ?? []);
      setSearched(true);
      setSearching(false);
      setError(null);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, detail.group.id, searchUsers]);

  const inviteUser = async (r: UserSearchResult) => {
    if (r.status !== "available" || invitingId) return;
    setInvitingId(r.userId);
    const res = await onInvite(detail.group.id, { userId: r.userId });
    setInvitingId(null);
    if (res.ok) {
      const who = r.fullName || r.username || "user";
      const handle = r.username ? ` (@${r.username})` : "";
      toast.success(`Invitation sent to ${who}${handle}`);
      setDoneIds((prev) => new Set(prev).add(r.userId));
      setResults((prev) => prev.map((x) => (x.userId === r.userId ? { ...x, status: "invited" } : x)));
    } else {
      toast.error(res.error ?? "Failed to send invitation");
    }
  };

  const inviteEmail = async () => {
    const q = query.trim();
    if (!q || invitingId) return;
    setInvitingId("email");
    const res = await onInvite(detail.group.id, { identifier: q });
    setInvitingId(null);
    if (res.ok) {
      const invited = res.data?.invited;
      toast.success(`Invitation sent to ${invited?.fullName || invited?.username || q}`);
      setQuery("");
      setResults([]);
      setSearched(false);
    } else {
      toast.error(res.error ?? "Failed to send invitation");
    }
  };

  const showEmailRow = searched && query.trim().includes("@") && results.length === 0 && !searching;

  return (
    <SheetModal open={open} onClose={onClose} title="Invite People">
      <div className="pb-4">
        {/* search bar */}
        <div className="h-12 rounded-xl bg-muted px-4 flex items-center gap-2">
          <Search size={17} className="text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const first = results.find((r) => r.status === "available");
              if (first) inviteUser(first);
              else if (query.trim().includes("@")) inviteEmail();
            }}
            placeholder="Search name or @username…"
            autoFocus
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/60"
          />
          {searching ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground shrink-0" />
          ) : query ? (
            <button onClick={() => setQuery("")} className="text-muted-foreground shrink-0" aria-label="Clear">
              <X size={16} />
            </button>
          ) : null}
        </div>

        {/* live results */}
        <div className="mt-3">
          {searching && results.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-[13px]">
              <Loader2 size={15} className="animate-spin" /> Searching accounts…
            </div>
          )}

          {results.map((r) => (
            <div key={r.userId} className="flex items-center gap-3 py-2.5 border-b border-border/60 last:border-0">
              <Avatar name={r.fullName || r.username || "?"} url={r.avatarUrl} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-[14.5px] font-semibold truncate leading-tight">{r.fullName || r.username || "User"}</p>
                {r.username && (
                  <p className="text-[12.5px] text-muted-foreground truncate">@{r.username}</p>
                )}
              </div>
              {r.status === "available" ? (
                doneIds.has(r.userId) ? (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-green-600 shrink-0">
                    <Check size={14} /> Invited
                  </span>
                ) : (
                  <TapButton
                    onClick={() => inviteUser(r)}
                    disabled={!!invitingId}
                    className="h-8 px-4 rounded-full bg-foreground text-background text-[12.5px] font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    {invitingId === r.userId ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Invite
                  </TapButton>
                )
              ) : r.status === "member" ? (
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground border border-border px-2 py-1 rounded-full shrink-0">
                  Member
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider font-bold text-foreground/70 border border-foreground/25 px-2 py-1 rounded-full shrink-0">
                  Invited
                </span>
              )}
            </div>
          ))}

          {/* no results */}
          {searched && !searching && results.length === 0 && !error && (
            <div className="py-4">
              {showEmailRow ? (
                <>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    No account matched the email <b className="text-foreground">{query.trim()}</b> in search. Send the invite to this exact email anyway?
                  </p>
                  <TapButton
                    onClick={inviteEmail}
                    disabled={!!invitingId}
                    className="mt-3 w-full h-11 rounded-xl bg-foreground text-background text-[14px] font-semibold flex items-center justify-center gap-2"
                  >
                    {invitingId === "email" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send invite to this email
                  </TapButton>
                </>
              ) : (
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  No Trackly accounts found for <b className="text-foreground">“{query.trim()}”</b>. They need to sign up on
                  Trackly first — or invite by their full email.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-[13px] text-red-500 py-3">{error}</p>}

          {/* idle hint */}
          {!query && (
            <div className="pt-1">
              {detail.members.filter((m) => m.status === "active").length === 1 ? (
                <EmptyState
                  icon={<UserPlus size={20} />}
                  title="Just you so far"
                  description="Start typing a name or @username — matching accounts appear instantly, like Instagram. They'll get it in their Groups inbox."
                />
              ) : (
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Start typing a name or @username — matching accounts appear instantly. You can also paste their full email.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </SheetModal>
  );
}
