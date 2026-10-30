// ===================================================================
// Groups — server-side helpers (API routes only, never client)
// - Verifies the app user's Supabase JWT on every request
// - Loads group membership / admin role from the project DB (Prisma)
// - Resolves Supabase profiles (username/email → user id, name, avatar)
//   server-side with the service key — clients never enumerate users.
// ===================================================================

import { NextRequest } from "next/server";
import { db } from "@/lib/db";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface AppUser {
  id: string; // supabase user id
  email: string | null;
  createdAt?: string | null; // account creation time (referral claim window check)
}

/**
 * Extract + verify the caller's Supabase session from the
 * `Authorization: Bearer <access_token>` header.
 * Verification is done BY Supabase itself (GET /auth/v1/user) —
 * authoritative and checks the user still exists.
 */
export async function getAppUser(req: NextRequest): Promise<AppUser | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (!user?.id) return null;
  return { id: user.id as string, email: (user.email as string) ?? null, createdAt: (user.created_at as string) ?? null };
}

// -------------------------------------------------------------------
// Membership / role checks (server-side, from trusted DB rows)
// -------------------------------------------------------------------

export async function getMembership(groupId: string, userId: string) {
  return db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

export async function requireActiveMember(groupId: string, userId: string) {
  const membership = await getMembership(groupId, userId);
  if (!membership || membership.status !== "active") return null;
  return membership;
}

export async function requireGroupAdmin(groupId: string, userId: string) {
  const membership = await getMembership(groupId, userId);
  if (!membership || membership.status !== "active" || membership.role !== "admin") return null;
  return membership;
}

export async function getGroupOr404(groupId: string) {
  const group = await db.group.findUnique({ where: { id: groupId } });
  return group;
}

// -------------------------------------------------------------------
// Supabase profiles lookup (service role, exact-match only)
// -------------------------------------------------------------------

export interface ProfileInfo {
  userId: string;
  username: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

/** Exact-match lookup by username OR email (used by the invite flow). */
export async function lookupProfile(identifier: string): Promise<ProfileInfo | null> {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;

  const isEmail = clean.includes("@");
  const filter = isEmail
    ? `email=eq.${encodeURIComponent(clean)}`
    : `username=eq.${encodeURIComponent(clean)}`;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${filter}&select=user_id,username,email,full_name,avatar_url&limit=1`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const row = rows?.[0];
  if (!row?.user_id) return null;
  return {
    userId: row.user_id,
    username: row.username ?? null,
    email: row.email ?? null,
    fullName: row.full_name ?? null,
    avatarUrl: row.avatar_url ?? null,
  };
}

/** Exact-match lookup by user id (used when inviting from a search result). */
export async function lookupProfileByUserId(userId: string): Promise<ProfileInfo | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=user_id,username,email,full_name,avatar_url&limit=1`,
    { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  const row = rows?.[0];
  if (!row?.user_id) return null;
  return {
    userId: row.user_id,
    username: row.username ?? null,
    email: row.email ?? null,
    fullName: row.full_name ?? null,
    avatarUrl: row.avatar_url ?? null,
  };
}

/** Batch profile info for a list of supabase user ids. */
export async function fetchProfiles(userIds: string[]): Promise<Record<string, ProfileInfo>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return {};
  const inFilter = `(${unique.map((id) => `"${id}"`).join(",")})`;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=in.${inFilter}&select=user_id,username,email,full_name,avatar_url`,
    { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
  );
  const out: Record<string, ProfileInfo> = {};
  if (!res.ok) return out;
  const rows = await res.json();
  for (const row of rows ?? []) {
    if (!row?.user_id) continue;
    out[row.user_id] = {
      userId: row.user_id,
      username: row.username ?? null,
      email: row.email ?? null,
      fullName: row.full_name ?? null,
      avatarUrl: row.avatar_url ?? null,
    };
  }
  return out;
}

// -------------------------------------------------------------------
// Activity log
// -------------------------------------------------------------------

export async function logActivity(groupId: string, userId: string, type: string, text: string) {
  await db.groupActivity.create({ data: { groupId, userId, type, text } });
}

/** Display name for activity lines (falls back to email/short id). */
export function displayName(profile: ProfileInfo | undefined): string {
  if (!profile) return "Someone";
  return profile.fullName || profile.username || (profile.email ? profile.email.split("@")[0] : "Someone");
}
