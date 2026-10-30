import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireGroupAdmin, logActivity, fetchProfiles, displayName } from "@/lib/groups/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/groups/[id]/remove  { userId }
 * Admin removes a member. Historical expense records and balances are
 * PRESERVED (membership status = removed, rows never deleted).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const admin = await requireGroupAdmin(id, user.id);
  if (!admin) return NextResponse.json({ error: "Only the group admin can remove members" }, { status: 403 });

  try {
    const { userId } = await req.json();
    if (userId === user.id) {
      return NextResponse.json({ error: "You can't remove yourself — transfer admin or leave the group" }, { status: 400 });
    }
    const target = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: String(userId) } },
    });
    if (!target || target.status !== "active") {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const profile = (await fetchProfiles([target.userId]))[target.userId];
    const name = displayName(profile);

    await db.$transaction(async (tx) => {
      await tx.groupMember.update({ where: { id: target.id }, data: { status: "removed" } });
      // Cancel any pending invitation rows pointing at this user (hygiene)
      await tx.groupInvitation.updateMany({
        where: { groupId: id, invitedUserId: target.userId, status: "pending" },
        data: { status: "cancelled", respondedAt: new Date() },
      });
    });

    await logActivity(id, user.id, "member_removed", `${name} was removed from the group`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/groups/[id]/remove]", e);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
