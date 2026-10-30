import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, requireGroupAdmin, logActivity } from "@/lib/groups/server";
import { getGroupDetail } from "@/lib/groups/queries";
import { GROUP_TYPES, CURRENCIES } from "@/lib/groups/calc";

export const dynamic = "force-dynamic";

/** GET /api/groups/[id] — full group detail. Active members only. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  try {
    const detail = await getGroupDetail(user.id, id);
    if (!detail) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e: any) {
    console.error("[/api/groups/[id] GET]", e);
    return NextResponse.json({ error: "Failed to load group" }, { status: 500 });
  }
}

/** PATCH /api/groups/[id] — edit group info (admin). Currency locked once expenses exist. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const admin = await requireGroupAdmin(id, user.id);
  if (!admin) return NextResponse.json({ error: "Only the group admin can do this" }, { status: 403 });

  try {
    const body = await req.json();
    const data: Record<string, string> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2 || name.length > 60) {
        return NextResponse.json({ error: "Group name must be 2-60 characters" }, { status: 400 });
      }
      data.name = name;
    }
    if (body.description !== undefined) data.description = String(body.description).trim().slice(0, 200);
    if (body.icon !== undefined) data.icon = String(body.icon).slice(0, 8);
    if (body.type !== undefined) {
      if (!GROUP_TYPES.some((t) => t.id === body.type)) {
        return NextResponse.json({ error: "Invalid group type" }, { status: 400 });
      }
      data.type = body.type;
    }
    if (body.currency !== undefined && body.currency !== undefined) {
      if (!CURRENCIES[body.currency]) return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
      const expenseCount = await db.groupExpense.count({ where: { groupId: id } });
      if (expenseCount > 0 && body.currency !== (await db.group.findUnique({ where: { id } }))?.currency) {
        return NextResponse.json(
          { error: "Currency can't be changed after expenses have been added" },
          { status: 400 }
        );
      }
      data.currency = body.currency;
    }

    await db.group.update({ where: { id }, data });
    await logActivity(id, user.id, "group_edited", "Group details were updated");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/groups/[id] PATCH]", e);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

/** DELETE /api/groups/[id] — permanently delete group + all data (admin only). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const admin = await requireGroupAdmin(id, user.id);
  if (!admin) return NextResponse.json({ error: "Only the group admin can delete the group" }, { status: 403 });

  try {
    // Real safeguard: explicit confirm string from the client
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== "DELETE") {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    }
    await db.group.delete({ where: { id } }); // cascades members/expenses/splits/settlements/activities
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/groups/[id] DELETE]", e);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
