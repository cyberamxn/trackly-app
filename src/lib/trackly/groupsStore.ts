"use client";

// ===================================================================
// Groups — client store (zustand)
// Thin wrapper over /api/groups. The server is the source of truth:
// every mutation re-fetches the affected data so balances shown are
// ALWAYS server-computed.
// ===================================================================

import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";
import type { MemberStats, SettlementSuggestion } from "@/lib/groups/calc";

// ---- DTOs (mirror of API responses) ----
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
  memberCount: number;
  totalSpentPaise: number;
  myNetPaise: number;
}

export interface HubInvitation {
  id: string;
  groupId: string;
  groupName: string;
  groupIcon: string;
  groupType: string;
  currency: string;
  invitedByUserId: string;
  inviterName: string;
  createdAt: string;
}

export interface GroupMemberDTO {
  userId: string;
  role: string;
  status: string;
  joinedAt: string;
  username: string | null;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface GroupExpenseDTO {
  id: string;
  title: string;
  amountPaise: number;
  category: string;
  paidBy: string;
  expenseDate: string;
  notes: string;
  splitMethod: string;
  createdBy: string;
  deletedAt: string | null;
  createdAt: string;
  splits: { userId: string; amountPaise: number; shares: number }[];
}

export interface GroupSettlementDTO {
  id: string;
  fromUserId: string;
  toUserId: string;
  amountPaise: number;
  status: string;
  note: string;
  createdBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface GroupActivityDTO {
  id: string;
  userId: string;
  type: string;
  text: string;
  createdAt: string;
}

export interface GroupInvitationDTO {
  id: string;
  invitedUserId: string;
  invitedIdentifier: string;
  invitedBy: string;
  status: string;
  createdAt: string;
  respondedAt: string | null;
  username: string | null;
  fullName: string | null;
}

export interface GroupDetail {
  group: {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: string;
    currency: string;
    archived: boolean;
    createdBy: string;
    createdAt: string;
  };
  viewer: { userId: string; role: string; isAdmin: boolean };
  members: GroupMemberDTO[];
  expenses: GroupExpenseDTO[];
  settlements: GroupSettlementDTO[];
  activities: GroupActivityDTO[];
  invitations: GroupInvitationDTO[];
  stats: Record<string, MemberStats>;
  suggestions: SettlementSuggestion[];
  profiles: Record<string, { username: string | null; fullName: string | null; email: string | null; avatarUrl: string | null }>;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  data?: any;
}

export interface UserSearchResult {
  userId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  status: "available" | "member" | "invited";
}

// ---- API helper: injects the Supabase session token ----
async function api(path: string, method: string, body?: any): Promise<ActionResult> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ok: false, error: "Not signed in" };

    const res = await fetch(`/api/groups${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.error || `Request failed (${res.status})` };
    return { ok: true, data: json };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

interface GroupsState {
  // Hub
  hubLoading: boolean;
  hubError: string | null;
  myGroups: GroupSummaryEntry[];
  invitations: HubInvitation[];

  // Group details (per group id)
  details: Record<string, GroupDetail>;
  detailLoading: Record<string, boolean>;

  refreshHub: () => Promise<void>;
  loadGroup: (id: string) => Promise<void>;
  clear: () => void;

  // Instagram-style live user search for the invite flow
  searchUsers: (q: string, groupId?: string) => Promise<{
    ok: boolean;
    error?: string;
    results?: UserSearchResult[];
  }>;

  // actions
  createGroup: (input: { name: string; icon: string; type: string; description: string; currency: string }) => Promise<ActionResult>;
  editGroup: (id: string, input: Partial<{ name: string; icon: string; type: string; description: string; currency: string }>) => Promise<ActionResult>;
  deleteGroup: (id: string) => Promise<ActionResult>;
  archiveGroup: (id: string, archived: boolean) => Promise<ActionResult>;

  inviteMember: (groupId: string, input: { identifier?: string; userId?: string }) => Promise<ActionResult>;
  respondInvitation: (groupId: string, invitationId: string, accept: boolean) => Promise<ActionResult>;
  cancelInvitation: (groupId: string, invitationId: string) => Promise<ActionResult>;
  resendInvitation: (groupId: string, invitationId: string) => Promise<ActionResult>;

  removeMember: (groupId: string, userId: string) => Promise<ActionResult>;
  transferAdmin: (groupId: string, userId: string) => Promise<ActionResult>;
  leaveGroup: (groupId: string) => Promise<ActionResult>;

  addExpense: (groupId: string, input: any) => Promise<ActionResult>;
  updateExpense: (groupId: string, expenseId: string, input: any) => Promise<ActionResult>;
  deleteExpense: (groupId: string, expenseId: string) => Promise<ActionResult>;

  recordSettlement: (groupId: string, input: { fromUserId: string; toUserId: string; amountPaise: number; note?: string }) => Promise<ActionResult>;
  settleAction: (groupId: string, settlementId: string, action: "confirm" | "reject") => Promise<ActionResult>;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  hubLoading: false,
  hubError: null,
  myGroups: [],
  invitations: [],
  details: {},
  detailLoading: {},

  refreshHub: async () => {
    set({ hubLoading: true, hubError: null });
    const res = await api("", "GET");
    if (res.ok) {
      set({ myGroups: res.data.groups ?? [], invitations: res.data.invitations ?? [], hubLoading: false });
    } else {
      set({ hubError: res.error ?? "Failed to load", hubLoading: false });
    }
  },

  loadGroup: async (id) => {
    set((s) => ({ detailLoading: { ...s.detailLoading, [id]: true } }));
    const res = await api(`/${id}`, "GET");
    set((s) => {
      const details = { ...s.details };
      if (res.ok) {
        details[id] = res.data;
      } else if (res.error === "Group not found") {
        delete details[id];
      }
      return { details, detailLoading: { ...s.detailLoading, [id]: false } };
    });
  },

  clear: () => set({ myGroups: [], invitations: [], details: {}, detailLoading: {}, hubError: null, hubLoading: false }),

  searchUsers: async (q, groupId) => {
    const res = await api(`/users/search?q=${encodeURIComponent(q)}${groupId ? `&groupId=${groupId}` : ""}`, "GET");
    if (!res.ok) return { ok: false, error: res.error ?? "Search failed" };
    return { ok: true, results: (res.data?.results ?? []) as UserSearchResult[] };
  },

  createGroup: async (input) => {
    const res = await api("", "POST", input);
    if (res.ok) await get().refreshHub();
    return res;
  },

  editGroup: async (id, input) => {
    const res = await api(`/${id}`, "PATCH", input);
    if (res.ok) await get().loadGroup(id);
    return res;
  },

  deleteGroup: async (id) => {
    const res = await api(`/${id}`, "DELETE", { confirm: "DELETE" });
    if (res.ok) {
      set((s) => {
        const details = { ...s.details };
        delete details[id];
        return { details };
      });
      await get().refreshHub();
    }
    return res;
  },

  archiveGroup: async (id, archived) => {
    const res = await api(`/${id}/archive`, "POST", { archived });
    if (res.ok) {
      await Promise.all([get().loadGroup(id), get().refreshHub()]);
    }
    return res;
  },

  inviteMember: async (groupId, input) => {
    const res = await api(`/${groupId}/invite`, "POST", input);
    if (res.ok) await get().loadGroup(groupId);
    return res;
  },

  respondInvitation: async (groupId, invitationId, accept) => {
    const res = await api(`/${groupId}/respond`, "POST", { invitationId, accept });
    if (res.ok) await get().refreshHub();
    return res;
  },

  cancelInvitation: async (groupId, invitationId) => {
    const res = await api(`/${groupId}/invitations/${invitationId}`, "POST", { action: "cancel" });
    if (res.ok) await get().loadGroup(groupId);
    return res;
  },

  resendInvitation: async (groupId, invitationId) => {
    const res = await api(`/${groupId}/invitations/${invitationId}`, "POST", { action: "resend" });
    if (res.ok) await get().loadGroup(groupId);
    return res;
  },

  removeMember: async (groupId, userId) => {
    const res = await api(`/${groupId}/remove`, "POST", { userId });
    if (res.ok) await get().loadGroup(groupId);
    return res;
  },

  transferAdmin: async (groupId, userId) => {
    const res = await api(`/${groupId}/transfer`, "POST", { userId });
    if (res.ok) await get().loadGroup(groupId);
    return res;
  },

  leaveGroup: async (groupId) => {
    const res = await api(`/${groupId}/leave`, "POST");
    if (res.ok) {
      set((s) => {
        const details = { ...s.details };
        delete details[groupId];
        return { details };
      });
      await get().refreshHub();
    }
    return res;
  },

  addExpense: async (groupId, input) => {
    const res = await api(`/${groupId}/expenses`, "POST", input);
    if (res.ok) await Promise.all([get().loadGroup(groupId), get().refreshHub()]);
    return res;
  },

  updateExpense: async (groupId, expenseId, input) => {
    const res = await api(`/${groupId}/expenses/${expenseId}`, "PATCH", input);
    if (res.ok) await Promise.all([get().loadGroup(groupId), get().refreshHub()]);
    return res;
  },

  deleteExpense: async (groupId, expenseId) => {
    const res = await api(`/${groupId}/expenses/${expenseId}`, "DELETE");
    if (res.ok) await Promise.all([get().loadGroup(groupId), get().refreshHub()]);
    return res;
  },

  recordSettlement: async (groupId, input) => {
    const res = await api(`/${groupId}/settlements`, "POST", input);
    if (res.ok) await get().loadGroup(groupId);
    return res;
  },

  settleAction: async (groupId, settlementId, action) => {
    const res = await api(`/${groupId}/settlements/${settlementId}`, "POST", { action });
    if (res.ok) await get().loadGroup(groupId);
    return res;
  },
}));
