import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireGroupAdmin, lookupProfile, lookupProfileByUserId, logActivity, displayName } from "@/lib/groups/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/groups/[id]/invite
 * Body: { userId }  — invite a user picked from the Instagram-style search
 *   OR  { identifier } — exact username / email (manual entry)
 * - blocks: unknown user, self-invite, existing member, duplicate pending invite
 * - declined/cancelled invites are re-armed to pending (resend)
 * - throttle: max 10 pending invites per group, max 20 invites/hour per admin
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const admin = await requireGroupAdmin(id, user.id);
  if (!admin) return NextResponse.json({ error: "Only the group admin can invite members" }, { status: 403 });

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const identifier = String(body.identifier ?? "").trim().toLowerCase();
    const userIdParam = String(body.userId ?? "").trim();
    if (!identifier && !userIdParam) {
      return NextResponse.json({ error: "Enter a username or email" }, { status: 400 });
    }

    const group = await db.group.findUnique({ where: { id } });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    if (group.archived) return NextResponse.json({ error: "This group is archived" }, { status: 400 });

    // Resolve the invitee — by userId (from search result) or exact identifier
    const profile = userIdParam ? await lookupProfileByUserId(userIdParam) : await lookupProfile(identifier);
    if (!profile) {
      return NextResponse.json(
        { error: "No Trackly account found with that username or email. Ask them to sign up first." },
        { status: 404 }
      );
    }
    if (profile.userId === user.id) {
      return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });
    }

    // Already an active member?
    const existingMember = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: profile.userId } },
    });
    if (existingMember && existingMember.status === "active") {
      return NextResponse.json({ error: `${displayName(profile)} is already a member of this group` }, { status: 400 });
    }

    // Throttles
    const pendingCount = await db.groupInvitation.count({ where: { groupId: id, status: "pending" } });
    if (pendingCount >= 10) {
      return NextResponse.json({ error: "Too many pending invitations (max 10). Wait for responses first." }, { status: 429 });
    }
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await db.groupInvitation.count({ where: { groupId: id, invitedBy: user.id, createdAt: { gte: hourAgo } } });
    if (recentCount >= 20) {
      return NextResponse.json({ error: "You're sending invites too fast. Try again in a while." }, { status: 429 });
    }

    // Create or re-arm the invitation
    const existingInvite = await db.groupInvitation.findUnique({
      where: { groupId_invitedUserId: { groupId: id, invitedUserId: profile.userId } },
    });

    if (existingInvite) {
      if (existingInvite.status === "pending") {
        return NextResponse.json({ error: `An invitation for ${displayName(profile)} is already pending` }, { status: 400 });
      }
      if (existingInvite.status === "accepted") {
        return NextResponse.json({ error: `${displayName(profile)} already accepted an invitation` }, { status: 400 });
      }
      await db.groupInvitation.update({
        where: { id: existingInvite.id },
        data: { status: "pending", invitedIdentifier: profile.username || profile.email || identifier, invitedBy: user.id, createdAt: new Date(), respondedAt: null },
      });
    } else {
      await db.groupInvitation.create({
        data: { groupId: id, invitedUserId: profile.userId, invitedIdentifier: profile.username || profile.email || identifier, invitedBy: user.id },
      });
    }

    await logActivity(id, user.id, "invited", `Invitation sent to ${displayName(profile)}`);
    return NextResponse.json({ ok: true, invited: { username: profile.username, fullName: profile.fullName } });
  } catch (e: any) {
    // Concurrent duplicate invite → unique(groupId, invitedUserId) fires P2002
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "An invitation for this user is already pending" }, { status: 400 });
    }
    console.error("[/api/groups/[id]/invite]", e);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
}
