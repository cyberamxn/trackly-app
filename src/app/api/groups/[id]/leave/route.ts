import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireActiveMember, logActivity, fetchProfiles, displayName } from "@/lib/groups/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/groups/[id]/leave
 * Member leaves the group. Admin must transfer ownership first.
 * Historical expense records and balances are preserved (status = left).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const membership = await requireActiveMember(id, user.id);
  if (!membership) return NextResponse.json({ error: "You are not an active member of this group" }, { status: 403 });

  try {
    if (membership.role === "admin") {
      const activeCount = await db.groupMember.count({ where: { groupId: id, status: "active" } });
      if (activeCount > 1) {
        return NextResponse.json(
          { error: "Transfer admin rights to another member before leaving" },
          { status: 400 }
        );
      }
      // sole member + admin → leaving archives the group effectively; allow leaving
    }

    const profile = (await fetchProfiles([user.id]))[user.id];
    const name = displayName(profile);

    await db.groupMember.update({ where: { id: membership.id }, data: { status: "left" } });
    await logActivity(id, user.id, "member_left", `${name} left the group`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/groups/[id]/leave]", e);
    return NextResponse.json({ error: "Failed to leave group" }, { status: 500 });
  }
}
