import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireGroupAdmin, logActivity } from "@/lib/groups/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/groups/[id]/archive  { archived: boolean }
 * Admin archives or reopens the group. Archived groups are read-only
 * for expenses/invites, but settlements stay open so dues can be cleared.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const admin = await requireGroupAdmin(id, user.id);
  if (!admin) return NextResponse.json({ error: "Only the group admin can archive or reopen" }, { status: 403 });

  try {
    const { archived } = await req.json();
    const group = await db.group.findUnique({ where: { id } });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    if (Boolean(archived) === group.archived) {
      return NextResponse.json({ error: archived ? "Already archived" : "Already active" }, { status: 400 });
    }

    await db.group.update({ where: { id }, data: { archived: Boolean(archived) } });
    await logActivity(id, user.id, archived ? "group_archived" : "group_reopened", archived ? "Group was archived" : "Group was reopened");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/groups/[id]/archive]", e);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}
