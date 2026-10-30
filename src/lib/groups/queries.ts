// ===================================================================
// Groups — shared query builders (server-side)
// Loads a group's full ledger and computes balances/suggestions with
// the pure calc engine. Balances are ALWAYS derived here from records,
// never trusted from the client.
// ===================================================================

import { db } from "@/lib/db";
import { computeMemberStats, suggestSettlements, type SettlementSuggestion, type MemberStats } from "./calc";
import { fetchProfiles, type ProfileInfo } from "./server";

export interface GroupSummaryEntry {
  id: string;
  name: string;
  icon: string;
  type: string;
  currency: string;
  description: string;
  archived: boolean;
  createdAt: string;
  myRole: string;
  memberCount: number; // active members
  totalSpentPaise: number; // non-deleted expenses
  myNetPaise: number;
}

/** GET /api/groups — list "my groups" with server-computed summary + my pending invitations. */
export async function listMyGroups(userId: string): Promise<{
  groups: GroupSummaryEntry[];
  invitations: {
    id: string;
    groupId: string;
    groupName: string;
    groupIcon: string;
    groupType: string;
    currency: string;
    invitedByUserId: string;
    inviterName: string;
    createdAt: string;
  }[];
}> {
  // Active memberships only — removed/left groups disappear from the hub
  const memberships = await db.groupMember.findMany({
    where: { userId, status: "active" },
    include: {
      group: {
        include: {
          members: { where: { status: "active" }, select: { userId: true } },
          expenses: { where: { deletedAt: null }, select: { amountPaise: true, paidBy: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const groups: GroupSummaryEntry[] = memberships.map((m) => {
    const totalSpentPaise = m.group.expenses.reduce((s, e) => s + e.amountPaise, 0);
    const myPaid = m.group.expenses.filter((e) => e.paidBy === userId).reduce((s, e) => s + e.amountPaise, 0);
    // myShare: splits of my user across non-deleted expenses — needs a splits query per group;
    // approximated here from full split load below (kept simple: load splits per group)
    return {
      id: m.group.id,
      name: m.group.name,
      icon: m.group.icon,
      type: m.group.type,
      currency: m.group.currency,
      description: m.group.description,
      archived: m.group.archived,
      createdAt: m.group.createdAt.toISOString(),
      myRole: m.role,
      memberCount: m.group.members.length,
      totalSpentPaise,
      myNetPaise: myPaid, // replaced with real net below
    };
  });

  // Load my splits per group for accurate net balances
  const groupIds = groups.map((g) => g.id);
  if (groupIds.length > 0) {
    const mySplits = await db.groupExpenseSplit.findMany({
      where: { expense: { groupId: { in: groupIds }, deletedAt: null }, userId },
      select: { amountPaise: true, expense: { select: { groupId: true } } },
    });
    const mySettlements = await db.groupSettlement.findMany({
      where: { groupId: { in: groupIds }, OR: [{ fromUserId: userId }, { toUserId: userId }], status: "confirmed" },
      select: { groupId: true, fromUserId: true, toUserId: true, amountPaise: true },
    });
    for (const g of groups) {
      const myShare = mySplits.filter((s) => s.expense.groupId === g.id).reduce((s, x) => s + x.amountPaise, 0);
      const myPaid = groups.find((x) => x.id === g.id)!.myNetPaise;
      // sending a confirmed repayment reduces debt (+), receiving one reduces credit (-)
      const settled = mySettlements
        .filter((s) => s.groupId === g.id)
        .reduce((sum, s) => sum + (s.fromUserId === userId ? s.amountPaise : -s.amountPaise), 0);
      g.myNetPaise = myPaid - myShare + settled;
    }
  }

  // Pending invitations addressed to me
  const invites = await db.groupInvitation.findMany({
    where: { invitedUserId: userId, status: "pending" },
    include: { group: true },
    orderBy: { createdAt: "desc" },
  });
  const inviterIds = [...new Set(invites.map((i) => i.invitedBy))];
  const profiles = await fetchProfiles(inviterIds);

  return {
    groups,
    invitations: invites.map((i) => ({
      id: i.id,
      groupId: i.groupId,
      groupName: i.group.name,
      groupIcon: i.group.icon,
      groupType: i.group.type,
      currency: i.group.currency,
      invitedByUserId: i.invitedBy,
      inviterName:
        profiles[i.invitedBy]?.fullName || profiles[i.invitedBy]?.username || "A group admin",
      createdAt: i.createdAt.toISOString(),
    })),
  };
}

/** Full group detail payload (GET /api/groups/[id]). Viewer must be an active member. */
export async function getGroupDetail(viewerId: string, groupId: string) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: true,
      expenses: { include: { splits: true }, orderBy: { expenseDate: "desc" } },
      settlements: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 200 },
      invitations: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!group) return null;

  const membership = group.members.find((m) => m.userId === viewerId && m.status === "active");
  if (!membership) return null;

  // ---- balances (server-computed) ----
  const splitUserIds = group.expenses.flatMap((e) => e.splits.map((s) => s.userId));
  const settlementUserIds = group.settlements.flatMap((s) => [s.fromUserId, s.toUserId]);
  const userIds = [...new Set([...group.members.map((m) => m.userId), ...splitUserIds, ...settlementUserIds])];

  const stats = computeMemberStats(
    userIds,
    group.expenses.map((e) => ({
      id: e.id,
      paidBy: e.paidBy,
      amountPaise: e.amountPaise,
      deletedAt: e.deletedAt,
    })),
    group.expenses.flatMap((e) => e.splits.map((s) => ({ expenseId: e.id, userId: s.userId, amountPaise: s.amountPaise }))),
    group.settlements
  );

  const adjustedNet = new Map<string, number>();
  for (const s of stats.values()) if (s.adjustedNetPaise !== 0) adjustedNet.set(s.userId, s.adjustedNetPaise);
  const suggestions: SettlementSuggestion[] = suggestSettlements(adjustedNet);

  const statsObj: Record<string, MemberStats> = {};
  for (const s of stats.values()) statsObj[s.userId] = s;

  // ---- profiles for every referenced user ----
  const profiles: Record<string, ProfileInfo> = await fetchProfiles([
    ...userIds,
    ...group.invitations.map((i) => i.invitedUserId),
    ...group.activities.map((a) => a.userId),
  ]);

  return {
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      icon: group.icon,
      type: group.type,
      currency: group.currency,
      archived: group.archived,
      createdBy: group.createdBy,
      createdAt: group.createdAt.toISOString(),
    },
    viewer: {
      userId: viewerId,
      role: membership.role,
      isAdmin: membership.role === "admin",
    },
    members: group.members
      .sort((a, b) => (a.role === "admin" ? -1 : b.role === "admin" ? 1 : a.joinedAt.getTime() - b.joinedAt.getTime()))
      .map((m) => ({
        userId: m.userId,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt.toISOString(),
        username: profiles[m.userId]?.username ?? null,
        fullName: profiles[m.userId]?.fullName ?? null,
        email: profiles[m.userId]?.email ?? null,
        avatarUrl: profiles[m.userId]?.avatarUrl ?? null,
      })),
    expenses: group.expenses.map((e) => ({
      id: e.id,
      title: e.title,
      amountPaise: e.amountPaise,
      category: e.category,
      paidBy: e.paidBy,
      expenseDate: e.expenseDate,
      notes: e.notes,
      splitMethod: e.splitMethod,
      createdBy: e.createdBy,
      deletedAt: e.deletedAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      splits: e.splits.map((s) => ({ userId: s.userId, amountPaise: s.amountPaise, shares: s.shares })),
    })),
    settlements: group.settlements.map((s) => ({
      id: s.id,
      fromUserId: s.fromUserId,
      toUserId: s.toUserId,
      amountPaise: s.amountPaise,
      status: s.status,
      note: s.note,
      createdBy: s.createdBy,
      confirmedBy: s.confirmedBy ?? null,
      confirmedAt: s.confirmedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
    activities: group.activities.map((a) => ({
      id: a.id,
      userId: a.userId,
      type: a.type,
      text: a.text,
      createdAt: a.createdAt.toISOString(),
    })),
    // Admins see all invitations (pending/accepted/declined/cancelled)
    invitations: membership.role === "admin"
      ? group.invitations.map((i) => ({
          id: i.id,
          invitedUserId: i.invitedUserId,
          invitedIdentifier: i.invitedIdentifier,
          invitedBy: i.invitedBy,
          status: i.status,
          createdAt: i.createdAt.toISOString(),
          respondedAt: i.respondedAt?.toISOString() ?? null,
          username: profiles[i.invitedUserId]?.username ?? null,
          fullName: profiles[i.invitedUserId]?.fullName ?? null,
        }))
      : [],
    stats: statsObj,
    suggestions,
    profiles: Object.fromEntries(
      Object.entries(profiles).map(([id, p]) => [
        id,
        { username: p.username, fullName: p.fullName, email: p.email, avatarUrl: p.avatarUrl },
      ])
    ),
  };
}
