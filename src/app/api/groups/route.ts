import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, logActivity, fetchProfiles, displayName } from "@/lib/groups/server";
import { listMyGroups } from "@/lib/groups/queries";
import { GROUP_TYPES, CURRENCIES } from "@/lib/groups/calc";

export const dynamic = "force-dynamic";

/**
 * GET /api/groups
 * My groups (active memberships) with server-computed summary + my pending invitations.
 */
export async function GET(req: NextRequest) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const data = await listMyGroups(user.id);
    return NextResponse.json(data);
  } catch (e: any) {
    console.error("[/api/groups GET]", e);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}

/**
 * POST /api/groups
 * Create a group. Creator automatically becomes the group admin.
 */
export async function POST(req: NextRequest) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim().slice(0, 200);
    const icon = String(body.icon ?? "🏠").slice(0, 8);
    const type = GROUP_TYPES.some((t) => t.id === body.type) ? body.type : "friends";
    const currency = CURRENCIES[body.currency] ? body.currency : "INR";

    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: "Group name must be 2-60 characters" }, { status: 400 });
    }

    const profile = (await fetchProfiles([user.id]))[user.id];
    const creatorName = displayName(profile);

    const group = await db.$transaction(async (tx) => {
      const g = await tx.group.create({
        data: { name, description, icon, type, currency, createdBy: user.id },
      });
      await tx.groupMember.create({
        data: { groupId: g.id, userId: user.id, role: "admin", status: "active" },
      });
      await tx.groupActivity.create({
        data: { groupId: g.id, userId: user.id, type: "group_created", text: `${creatorName} created the group` },
      });
      return g;
    });

    return NextResponse.json({ group: { id: group.id, name: group.name } }, { status: 201 });
  } catch (e: any) {
    console.error("[/api/groups POST]", e);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
