import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/groups/server";

export const dynamic = "force-dynamic";

// ===================================================================
// POST /api/auth/delete-account  —  full account deletion (DPDP s.12(2))
// Requires: Authorization Bearer + { confirm: "DELETE", password? }
// - Password accounts: current password MUST be re-verified.
// - Google-only accounts: password not applicable (server detects).
// Wipes: Supabase personal data (9 tables) + profile + auth user,
//        groups footprint (sole-member groups deleted, shared groups
//        mark membership "removed" so others' ledger stays intact).
// ===================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Supabase tables holding the user's personal rows (keyed by user_id)
const PERSONAL_TABLES = [
  "expenses",
  "incomes",
  "shopping",
  "borrow_lend",
  "habits",
  "notes",
  "calendar_events",
  "user_settings",
  "office_data",
  "student_data",
];

async function supa(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(method === "DELETE" ? { Prefer: "return=minimal" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty body (e.g. 204) is fine */
  }
  return { status: res.status, data };
}

export async function POST(req: NextRequest) {
  const user = await getAppUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // ---- parse + confirm guard ----
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (body?.confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type "DELETE" to confirm account deletion' }, { status: 400 });
  }

  try {
    // ---- does this account have a password identity? ----
    const adminUser = await supa(`/auth/v1/admin/users/${user.id}`);
    const providers: string[] = (adminUser.data?.identities ?? []).map((i: any) => i?.provider).filter(Boolean);
    const hasPassword = providers.includes("email");

    // ---- re-verify password for password-based accounts (anti stolen-token) ----
    if (hasPassword) {
      const password = String(body?.password ?? "");
      if (!password) {
        return NextResponse.json({ error: "Password is required to delete your account" }, { status: 400 });
      }
      if (!user.email) {
        return NextResponse.json({ error: "Account email missing — contact support" }, { status: 400 });
      }
      const verify = await supa("/auth/v1/token?grant_type=password", "POST", {
        email: user.email,
        password,
      });
      if (!verify.data?.access_token || verify.data?.user?.id !== user.id) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
      }
    }

    // ---- 1) groups footprint (project DB) ----
    await db.$transaction(async (tx) => {
      const memberships = await tx.groupMember.findMany({ where: { userId: user.id } });
      const groupIds = [...new Set(memberships.map((m) => m.groupId))];

      for (const groupId of groupIds) {
        const otherActive = await tx.groupMember.count({
          where: { groupId, userId: { not: user.id }, status: "active" },
        });
        if (otherActive === 0) {
          // Sole/last member → delete the entire group (cascade: members,
          // invitations, expenses, splits, settlements, activities).
          await tx.group.delete({ where: { id: groupId } });
        } else {
          // Shared group → mark removed so remaining members' balances
          // and history stay intact (same as admin-removal flow).
          await tx.groupMember.updateMany({
            where: { groupId, userId: user.id },
            data: { status: "removed" },
          });
          // Cancel pending settlements involving this user so others
          // don't wait forever on a ghost confirmation.
          await tx.groupSettlement.updateMany({
            where: {
              groupId,
              status: "pending",
              OR: [{ fromUserId: user.id }, { toUserId: user.id }],
            },
            data: { status: "rejected" },
          });
          await tx.groupActivity.create({
            data: {
              groupId,
              userId: user.id,
              type: "member_removed",
              text: "A member deleted their account",
            },
          });
        }
      }

      // Any pending invitations to/from this user → cancelled
      await tx.groupInvitation.updateMany({
        where: { invitedUserId: user.id, status: "pending" },
        data: { status: "cancelled", respondedAt: new Date() },
      });
      await tx.groupInvitation.updateMany({
        where: { invitedBy: user.id, status: "pending" },
        data: { status: "cancelled", respondedAt: new Date() },
      });
    });

    // ---- 2) personal data rows in Supabase ----
    for (const table of PERSONAL_TABLES) {
      await supa(`/rest/v1/${table}?user_id=eq.${encodeURIComponent(user.id)}`, "DELETE");
    }

    // ---- 3) profile row ----
    await supa(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(user.id)}`, "DELETE");

    // ---- 4) auth user (last — session dies with it) ----
    const delAuth = await supa(`/auth/v1/admin/users/${user.id}`, "DELETE");
    if (delAuth.status >= 400) {
      console.error("[delete-account] auth user delete failed:", delAuth.status, delAuth.data);
      return NextResponse.json(
        { error: "Your data was deleted but the login record could not be removed. Please contact support@trackly.app" },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    console.error("[/api/auth/delete-account]", e);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
