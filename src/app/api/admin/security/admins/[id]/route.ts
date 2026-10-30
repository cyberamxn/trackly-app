import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";

// PATCH /api/admin/security/admins/[id] — update role, status, or 2FA
//
// Body variants:
//   { role: "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "MODERATOR" }
//   { status: "ACTIVE" | "SUSPENDED" }
//   { twoFactorEnabled: boolean }
//   { twoFactorSecret: string | null }   // set to null to disable 2FA
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  // Prevent self-suspension / self-demotion (avoid locking yourself out)
  if (id === session!.user.id) {
    if (body.status === "SUSPENDED") {
      return NextResponse.json({ error: "You cannot suspend your own account" }, { status: 400 });
    }
    if (body.role && body.role !== session!.user.role) {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
    }
  }

  // Build update data — only allow whitelisted fields
  const data: any = {};
  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "MODERATOR"];
  if (body.role !== undefined) {
    if (!allowedRoles.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = body.role;
  }
  if (body.status !== undefined) {
    if (!["ACTIVE", "SUSPENDED"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.twoFactorEnabled !== undefined) {
    data.twoFactorEnabled = Boolean(body.twoFactorEnabled);
    // Disabling 2FA also clears the secret
    if (body.twoFactorEnabled === false) data.twoFactorSecret = null;
  }
  if (body.twoFactorSecret !== undefined) {
    data.twoFactorSecret = body.twoFactorSecret;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Verify target exists
  const existing = await db.adminUser.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  const updated = await db.adminUser.update({
    where: { id },
    data,
    select: {
      id: true, email: true, name: true, role: true, status: true,
      twoFactorEnabled: true, lastLoginAt: true, lastLoginIp: true, createdAt: true,
    },
  });

  await logAction(session!.user.id, "UPDATE_ADMIN", "ADMIN_USER", id, data);

  // If the admin was suspended, revoke all their active sessions so they can't
  // continue using the panel.
  if (body.status === "SUSPENDED") {
    await db.adminSession.deleteMany({ where: { adminId: id } });
  }

  return NextResponse.json(updated);
}

// DELETE /api/admin/security/admins/[id] — permanently delete an admin
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN"]);
  if (error) return error;

  const { id } = await params;

  if (id === session!.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const existing = await db.adminUser.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  await db.adminUser.delete({ where: { id } });
  await logAction(session!.user.id, "DELETE_ADMIN", "ADMIN_USER", id, { email: existing.email });

  return NextResponse.json({ success: true });
}
