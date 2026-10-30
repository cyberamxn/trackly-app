"use client";

// Groups Hub — entry screen: pending invitations, my groups, create group.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ChevronLeft, Users, Plus, Check, X, Loader2 } from "lucide-react";
import { useTracklyStore } from "@/lib/trackly/store";
import { useGroupsStore } from "@/lib/trackly/groupsStore";
import { GROUP_TYPES, GROUP_ICONS, CURRENCIES, formatMoney, type GroupType } from "@/lib/groups/calc";
import { ScreenWrapper, Card, SheetModal, EmptyState, SegmentedControl } from "../../ui";
import { Avatar, NetAmount, relativeTime, TapButton } from "./parts";

export function GroupsHub() {
  const { setScreen, openGroup } = useTracklyStore();
  const {
    hubLoading, hubError, myGroups, invitations,
    refreshHub, respondInvitation, createGroup,
  } = useGroupsStore();
  const [showCreate, setShowCreate] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    refreshHub();
  }, [refreshHub]);

  const respond = async (invitationId: string, groupId: string, accept: boolean) => {
    setResponding(invitationId);
    const res = await respondInvitation(groupId, invitationId, accept);
    setResponding(null);
    if (res.ok) {
      toast.success(accept ? "Invitation accepted — you're in!" : "Invitation declined");
    } else {
      toast.error(res.error ?? "Failed");
    }
  };

  return (
    <ScreenWrapper>
      <div className="px-5 pt-2 pb-3 flex items-center justify-between min-h-[28px]">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setScreen("dashboard")} className="flex items-center text-foreground -ml-1">
          <ChevronLeft size={28} strokeWidth={2.2} />
        </motion.button>
        <p className="text-[13px] text-muted-foreground">
          {myGroups.length} {myGroups.length === 1 ? "group" : "groups"}
        </p>
      </div>
      <div className="px-5">
        <h1 className="text-[28px] font-bold tracking-tight leading-tight">Groups</h1>
        <p className="text-muted-foreground text-[15px] mt-1">
          Split shared expenses with roommates, friends & trips — see who owes whom instantly.
        </p>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {/* ===== Pending invitations ===== */}
        {invitations.length > 0 && (
          <div>
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Invitations ({invitations.length})
            </p>
            {invitations.map((inv) => (
              <Card key={inv.id} className="mb-2 border border-foreground/10">
                <div className="flex items-center gap-3">
                  <div className="text-[28px] leading-none">{inv.groupIcon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold truncate">{inv.groupName}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {inv.inviterName} invited you · {relativeTime(inv.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <TapButton
                    className="flex-1 h-10 rounded-xl bg-foreground text-background text-[14px] font-semibold flex items-center justify-center gap-1.5"
                    disabled={responding === inv.id}
                    onClick={() => respond(inv.id, inv.groupId, true)}
                  >
                    {responding === inv.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Accept
                  </TapButton>
                  <TapButton
                    className="flex-1 h-10 rounded-xl bg-muted text-foreground text-[14px] font-semibold flex items-center justify-center gap-1.5"
                    disabled={responding === inv.id}
                    onClick={() => respond(inv.id, inv.groupId, false)}
                  >
                    <X size={15} /> Decline
                  </TapButton>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ===== My groups ===== */}
        {hubLoading && myGroups.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={26} className="animate-spin text-muted-foreground" />
          </div>
        ) : hubError ? (
          <EmptyState
            icon={<Users size={22} />}
            title="Couldn't load groups"
            description={hubError}
          />
        ) : myGroups.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title="No groups yet"
            description="Create a group for your flat, trip or friends and start splitting expenses fairly."
            action={
              <TapButton
                className="h-10 px-5 rounded-xl bg-foreground text-background text-[14px] font-semibold flex items-center gap-2"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={16} /> Create Group
              </TapButton>
            }
          />
        ) : (
          <>
            {myGroups.map((g) => (
              <Card key={g.id} onClick={() => openGroup(g.id)} className="border border-border">
                <div className="flex items-center gap-3">
                  <div className="text-[30px] leading-none">{g.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[16px] font-semibold truncate">{g.name}</p>
                      {g.archived && (
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded-full font-bold">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {g.memberCount} {g.memberCount === 1 ? "member" : "members"} ·{" "}
                      {GROUP_TYPES.find((t) => t.id === g.type)?.label ?? "Group"}
                      {g.myRole === "admin" ? " · You're admin" : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[15px] font-bold tabular-nums">{formatMoney(g.totalSpentPaise, g.currency)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">total spend</p>
                    <NetAmount netPaise={g.myNetPaise} currency={g.currency} className="block" />
                  </div>
                </div>
              </Card>
            ))}

            <TapButton
              className="w-full h-12 rounded-2xl border-2 border-dashed border-border text-[14px] font-semibold text-muted-foreground flex items-center justify-center gap-2"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={16} /> New Group
            </TapButton>
          </>
        )}

        <div className="h-10" />
      </div>

      <CreateGroupSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={async (input) => {
          const res = await createGroup(input);
          if (res.ok) {
            toast.success(`Group "${input.name}" created`);
            setShowCreate(false);
            // open the fresh group
            await useGroupsStore.getState().refreshHub();
            const created = useGroupsStore.getState().myGroups.find((g) => g.name === input.name && g.myRole === "admin");
            if (created) openGroup(created.id);
          } else {
            toast.error(res.error ?? "Failed to create group");
            return false;
          }
        }}
      />
    </ScreenWrapper>
  );
}

// ===================================================================
// Create Group sheet
// ===================================================================
function CreateGroupSheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; icon: string; type: GroupType; description: string; currency: string }) => Promise<boolean | void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🏠");
  const [type, setType] = useState<GroupType>("roommates");
  const [currency, setCurrency] = useState("INR");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setIcon("🏠");
      setType("roommates");
      setCurrency("INR");
      setSaving(false);
    }
  }, [open]);

  const submit = async () => {
    if (name.trim().length < 2) {
      toast.error("Group name must be at least 2 characters");
      return;
    }
    setSaving(true);
    const ok = await onCreate({ name: name.trim(), icon, type, description: description.trim(), currency });
    if (ok === false) setSaving(false);
  };

  return (
    <SheetModal open={open} onClose={onClose} title="New Group">
      <div className="space-y-4 pb-4">
        {/* icon + name */}
        <div className="flex items-center gap-3">
          <div className="text-[34px] leading-none h-12 w-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">{icon}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name (e.g. Flat 4B)"
            maxLength={60}
            className="flex-1 h-12 rounded-xl bg-muted px-4 text-[15px] font-medium outline-none focus:ring-2 ring-foreground/20 placeholder:text-muted-foreground/60"
          />
        </div>

        {/* icon picker */}
        <div>
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Icon</p>
          <div className="grid grid-cols-8 gap-2">
            {GROUP_ICONS.map((ic) => (
              <TapButton
                key={ic}
                onClick={() => setIcon(ic)}
                className={`h-10 rounded-xl text-[20px] flex items-center justify-center border ${
                  icon === ic ? "border-foreground bg-muted" : "border-border"
                }`}
              >
                {ic}
              </TapButton>
            ))}
          </div>
        </div>

        {/* type */}
        <div>
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Type</p>
          <div className="flex flex-wrap gap-2">
            {GROUP_TYPES.map((t) => (
              <TapButton
                key={t.id}
                onClick={() => setType(t.id)}
                className={`px-3 py-2 rounded-xl text-[13px] font-medium border flex items-center gap-1.5 ${
                  type === t.id ? "border-foreground bg-foreground text-background" : "border-border"
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </TapButton>
            ))}
          </div>
        </div>

        {/* currency */}
        <div>
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Currency</p>
          <SegmentedControl
            options={Object.entries(CURRENCIES).map(([code, c]) => ({ label: `${c.symbol} ${code}`, value: code }))}
            value={currency}
            onChange={setCurrency}
          />
        </div>

        {/* description */}
        <div>
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Description <span className="normal-case font-normal">(optional)</span>
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group for?"
            maxLength={200}
            rows={2}
            className="w-full rounded-xl bg-muted px-4 py-3 text-[14px] outline-none focus:ring-2 ring-foreground/20 placeholder:text-muted-foreground/60 resize-none"
          />
        </div>

        <p className="text-[12px] text-muted-foreground">
          You'll be the group admin — you can invite people by their Trackly username or email right after.
        </p>

        <TapButton
          onClick={submit}
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-foreground text-background text-[15px] font-semibold flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />} Create Group
        </TapButton>
      </div>
    </SheetModal>
  );
}
