import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireActiveMember } from "@/lib/groups/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/groups/users/search?q=aman[&groupId=xxx]
 *
 * Instagram-style live user search for the invite flow.
 * - type "a" → matching Trackly accounts start appearing instantly
 * - matches username (prefix > substring) and full name (prefix)
 * - exact email match only when q contains "@" (no email enumeration)
 * - results are ranked; viewer excluded; if groupId given (caller must be an
 *   active member) results are tagged: member / invited / available
 */
export async function GET(req: NextRequest) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const raw = (url.searchParams.get("q") || "").trim().toLowerCase();
    const groupId = url.searchParams.get("groupId") || "";

    // sanitize: allow letters, digits, underscore, space, dot, at, hyphen
    const q = raw.replace(/[^a-z0-9_@.\s-]/g, "").slice(0, 40);
    if (!q) return NextResponse.json({ results: [] });

    // If groupId provided, caller must be an active member of that group
    let memberIds = new Set<string>();
    let pendingInviteIds = new Set<string>();
    if (groupId) {
      const member = await requireActiveMember(groupId, user.id);
      if (!member) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
      const [members, invites] = await Promise.all([
        db.groupMember.findMany({ where: { groupId, status: "active" }, select: { userId: true } }),
        db.groupInvitation.findMany({ where: { groupId, status: "pending" }, select: { invitedUserId: true } }),
      ]);
      memberIds = new Set(members.map((m) => m.userId));
      pendingInviteIds = new Set(invites.map((i) => i.invitedUserId));
    }

    const isEmail = q.includes("@");

    // ---- fetch candidates from Supabase profiles (service role) ----
    let rows: any[] = [];
    if (isEmail) {
      // EXACT email match only — never partial-match emails (enumeration safety)
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(q)}&select=user_id,username,full_name,avatar_url&limit=1`,
        { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
      );
      if (res.ok) rows = await res.json();
    } else {
      // username prefix, full-name prefix, username substring
      const prefix = encodeURIComponent(`${q}*`);
      const substr = encodeURIComponent(`*${q}*`);
      const orFilter = `or=(username.ilike.${prefix},full_name.ilike.${prefix},username.ilike.${substr})`;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=user_id,username,full_name,avatar_url&${orFilter}&limit=25`,
        { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
      );
      if (res.ok) rows = await res.json();
    }

    // ---- rank: exact > username prefix > name prefix > substring ----
    const scored = rows
      .filter((r) => r?.user_id && r.user_id !== user.id)
      .map((r) => {
        const uname = (r.username || "").toLowerCase();
        const fname = (r.full_name || "").toLowerCase();
        let score = 99;
        if (uname === q || fname === q) score = 0;
        else if (uname.startsWith(q)) score = 1;
        else if (fname.startsWith(q)) score = 2;
        else if (uname.includes(q)) score = 3;
        else if (fname.includes(q)) score = 4;
        return { r, score };
      })
      .sort((a, b) => a.score - b.score || (a.r.username || "").localeCompare(b.r.username || ""))
      .slice(0, 10);

    const results = scored.map(({ r }) => ({
      userId: r.user_id as string,
      username: (r.username as string) ?? null,
      fullName: (r.full_name as string) ?? null,
      avatarUrl: (r.avatar_url as string) ?? null,
      status: memberIds.has(r.user_id) ? "member" : pendingInviteIds.has(r.user_id) ? "invited" : "available",
    }));

    return NextResponse.json({ results, query: q });
  } catch (e: any) {
    console.error("[/api/groups/users/search]", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
