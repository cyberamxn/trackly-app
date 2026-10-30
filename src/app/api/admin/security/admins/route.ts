import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { db } from "@/lib/db";
import { randomBytes, scryptSync } from "crypto";

// GET /api/admin/security/admins — list all admin users
export async function GET() {
  const { error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const admins = await db.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, email: true, name: true, role: true, status: true,
      twoFactorEnabled: true, lastLoginAt: true, lastLoginIp: true,
      createdAt: true,
      _count: { select: { auditLogs: true, sessions: true } },
    },
  });
  return NextResponse.json(admins);
}

// POST /api/admin/security/admins — create a new admin user (invite)
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { email, name, role = "ADMIN" } = body;
  if (!email || !name) {
    return NextResponse.json({ error: "Email and name required" }, { status: 400 });
  }

  // Validate role
  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "MODERATOR"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Check for duplicates
  const existing = await db.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Admin with this email already exists" }, { status: 409 });
  }

  // Generate a random temporary password (16 bytes hex = 32 chars)
  const tempPassword = randomBytes(16).toString("hex");
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(tempPassword, salt, 64).toString("hex") + ":" + salt;

  const newAdmin = await db.adminUser.create({
    data: {
      email: email.toLowerCase(),
      name,
      role,
      passwordHash,
      status: "ACTIVE",
    },
    select: {
      id: true, email: true, name: true, role: true, status: true,
      twoFactorEnabled: true, createdAt: true,
    },
  });

  await logAction(session!.user.id, "CREATE_ADMIN", "ADMIN_USER", newAdmin.id, { email, role });

  // Return the temp password ONCE so the inviter can share it via a secure channel.
  // (In production this would be sent via a magic-link / invite email — but since
  // this admin panel doesn't have outbound email configured, we surface it here.)
  return NextResponse.json({ ...newAdmin, tempPassword }, { status: 201 });
}
