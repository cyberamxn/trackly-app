import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireGroupAdmin, logActivity } from "@/lib/groups/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/groups/[id]/invitations/[invitationId]  { action: "cancel" | "resend" }
 * Admin manages their sent invitations.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id, invitationId } = await params;
  const admin = await requireGroupAdmin(id, user.id);
  if (!admin) return NextResponse.json({ error: "Only the group admin can manage invitations" }, { status: 403 });

  try {
    const { action } = await req.json();
    const invitation = await db.groupInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.groupId !== id) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (action === "cancel") {
      if (invitation.status !== "pending") {
        return NextResponse.json({ error: "Only pending invitations can be cancelled" }, { status: 400 });
      }
      await db.groupInvitation.update({ where: { id: invitationId }, data: { status: "cancelled", respondedAt: new Date() } });
      await logActivity(id, user.id, "invite_cancelled", "An invitation was cancelled");
      return NextResponse.json({ ok: true });
    }

    if (action === "resend") {
      if (invitation.status !== "declined" && invitation.status !== "cancelled") {
        return NextResponse.json({ error: "Only declined or cancelled invitations can be resent" }, { status: 400 });
      }
      await db.groupInvitation.update({
        where: { id: invitationId },
        data: { status: "pending", createdAt: new Date(), respondedAt: null },
      });
      await logActivity(id, user.id, "invited", "An invitation was resent");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("[/api/groups/[id]/invitations/[invitationId]]", e);
    return NextResponse.json({ error: "Failed to update invitation" }, { status: 500 });
  }
}
