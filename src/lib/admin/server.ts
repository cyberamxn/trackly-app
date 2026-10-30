import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export type Role = "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "MODERATOR";

export async function requireAdmin(allowedRoles?: Role[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role as Role)) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}

export async function logAction(
  adminId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, any>,
  req?: Request
) {
  try {
    await db.auditLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        metadata: JSON.stringify(metadata ?? {}),
        ipAddress: req?.headers?.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req?.headers?.get("user-agent") || undefined,
      },
    });
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}
