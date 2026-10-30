import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, logActivity, fetchProfiles, displayName } from "@/lib/groups/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/groups/[id]/respond  { invitationId, accept: boolean }
 * The invited user accepts or declines. Accepting creates/re-activates
 * their membership in the same transaction.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;

  try {
    const { invitationId, accept } = await req.json();
    const invitation = await db.groupInvitation.findUnique({ where: { id: String(invitationId) } });
    if (!invitation || invitation.groupId !== id) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    if (invitation.invitedUserId !== user.id) {
      return NextResponse.json({ error: "This invitation is not for you" }, { status: 403 });
    }
    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "This invitation was already " + invitation.status }, { status: 400 });
    }

    const profile = (await fetchProfiles([user.id]))[user.id];
    const name = displayName(profile);

    if (!accept) {
      await db.groupInvitation.update({
        where: { id: invitation.id },
        data: { status: "declined", respondedAt: new Date() },
      });
      await logActivity(id, user.id, "invite_declined", `${name} declined the invitation`);
      return NextResponse.json({ ok: true, declined: true });
    }

    // ACCEPT — activate membership atomically
    await db.$transaction(async (tx) => {
      const existing = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.id } },
      });
      if (existing) {
        // previously removed/left — re-activate as a regular member
        await tx.groupMember.update({
          where: { id: existing.id },
          data: { status: "active", role: "member", joinedAt: new Date() },
        });
      } else {
        await tx.groupMember.create({
          data: { groupId: id, userId: user.id, role: "member", status: "active" },
        });
      }
      await tx.groupInvitation.update({
        where: { id: invitation.id },
        data: { status: "accepted", respondedAt: new Date() },
      });
    });

    await logActivity(id, user.id, "member_joined", `${name} joined the group`);
    return NextResponse.json({ ok: true, accepted: true });
  } catch (e: any) {
    console.error("[/api/groups/[id]/respond]", e);
    return NextResponse.json({ error: "Failed to respond to invitation" }, { status: 500 });
  }
}
