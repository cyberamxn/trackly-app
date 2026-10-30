import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireGroupAdmin, logActivity, fetchProfiles, displayName } from "@/lib/groups/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/groups/[id]/transfer  { userId }
 * Admin transfers admin ownership to an active member.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const admin = await requireGroupAdmin(id, user.id);
  if (!admin) return NextResponse.json({ error: "Only the group admin can transfer ownership" }, { status: 403 });

  try {
    const { userId } = await req.json();
    if (userId === user.id) {
      return NextResponse.json({ error: "You are already the admin" }, { status: 400 });
    }
    const target = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: String(userId) } },
    });
    if (!target || target.status !== "active") {
      return NextResponse.json({ error: "Target must be an active member" }, { status: 404 });
    }

    const profile = (await fetchProfiles([target.userId]))[target.userId];
    const name = displayName(profile);

    await db.$transaction(async (tx) => {
      await tx.groupMember.update({ where: { id: target.id }, data: { role: "admin" } });
      await tx.groupMember.update({ where: { id: admin.id }, data: { role: "member" } });
    });

    await logActivity(id, user.id, "admin_transferred", `${name} is now the group admin`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/groups/[id]/transfer]", e);
    return NextResponse.json({ error: "Failed to transfer admin" }, { status: 500 });
  }
}
