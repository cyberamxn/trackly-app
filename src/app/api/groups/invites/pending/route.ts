import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, fetchProfiles, displayName } from "@/lib/groups/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/groups/invites/pending
 *
 * Lightweight endpoint for the invite watcher banner: returns ONLY the
 * caller's pending group invitations (no groups/expenses/splits loading).
 * Polled by the client every ~20s + on focus so the receiver instantly
 * learns an invite arrived — nothing is hidden in the Groups hub.
 */
export async function GET(req: NextRequest) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const invites = await db.groupInvitation.findMany({
      where: { invitedUserId: user.id, status: "pending" },
      include: { group: { select: { id: true, name: true, icon: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const profiles = await fetchProfiles([...new Set(invites.map((i) => i.invitedBy))]);

    return NextResponse.json({
      invitations: invites.map((i) => ({
        id: i.id,
        groupId: i.groupId,
        groupName: i.group.name,
        groupIcon: i.group.icon,
        inviterName: displayName(profiles[i.invitedBy]),
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (e: any) {
    console.error("[/api/groups/invites/pending]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
