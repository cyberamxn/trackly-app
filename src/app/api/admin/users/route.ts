import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { tryGetSupabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { getPremiumMap } from "@/lib/trackly/premium";

/**
 * GET /api/admin/users — list REAL users from Supabase auth
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();
  const status = (url.searchParams.get("status") || "").toUpperCase();
  const country = (url.searchParams.get("country") || "").toUpperCase().trim();
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const supabaseAdmin = tryGetSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({
      error: "SUPABASE_SERVICE_ROLE_KEY not configured.",
      users: [], total: 0, page, limit, totalPages: 0,
    }, { status: 503 });
  }

  const sb = supabaseAdmin as any;

  try {
    // Pagination-safe user fetch (perPage=1000 → follow nextPage up to 5 pages)
    const firstPage = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (firstPage.error) throw new Error(firstPage.error.message);
    let users: any[] = [...(firstPage.data?.users || [])];
    let nextPage = firstPage.data?.nextPage ?? null;
    let pg = 1;
    while (nextPage && pg < 5) {
      pg++;
      const nxt = await sb.auth.admin.listUsers({ page: pg, perPage: 1000 });
      if (nxt.error) break;
      users.push(...(nxt.data?.users || []));
      nextPage = nxt.data?.nextPage ?? null;
    }
    if (q) {
      users = users.filter((u: any) =>
        (u.email || "").toLowerCase().includes(q) ||
        (u.user_metadata?.full_name || "").toLowerCase().includes(q) ||
        (u.id || "").toLowerCase().includes(q)
      );
    }

    // Server-side status filter — SUSPENDED/BANNED = banned_at set, ACTIVE = not banned.
    // (Pehle ye param route me read hi nahi hota tha — filter silently ignore hota tha.)
    if (status === "ACTIVE") {
      users = users.filter((u: any) => !u.banned_at);
    } else if (status === "SUSPENDED" || status === "BANNED") {
      users = users.filter((u: any) => !!u.banned_at);
    }

    users.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Engine 29: real admin-granted premium (PremiumUser table) + optional
    // "Premium Only" / "Free Only" filters — applied BEFORE pagination.
    const premParam = url.searchParams.get("premium");
    const premMap = await getPremiumMap();
    if (premParam === "true") {
      users = users.filter((u: any) => premMap.has(u.id));
    } else if (premParam === "false") {
      users = users.filter((u: any) => !premMap.has(u.id));
    }

    // Country filter — user_settings.userCountry se (sab rows ek hi call me)
    if (country) {
      const { data: allSettings } = await sb.from("user_settings").select("user_id,settings");
      const byUser = new Map<string, any>((allSettings || []).map((r: any) => [r.user_id, r.settings || {}]));
      users = users.filter((u: any) => (byUser.get(u.id)?.userCountry || "IN").toUpperCase() === country);
    }

    const total = users.length;
    const startIdx = (page - 1) * limit;
    const paged = users.slice(startIdx, startIdx + limit);
    const userIds = paged.map((u: any) => u.id);

    const countsByUser: Record<string, any> = {};
    if (userIds.length > 0) {
      const [expRes, incRes, shopRes, habitRes, noteRes, calRes, settingsRes] = await Promise.all([
        sb.from("expenses").select("user_id").in("user_id", userIds),
        sb.from("incomes").select("user_id").in("user_id", userIds),
        sb.from("shopping").select("user_id").in("user_id", userIds),
        sb.from("habits").select("user_id").in("user_id", userIds),
        sb.from("notes").select("user_id").in("user_id", userIds),
        sb.from("calendar_events").select("user_id").in("user_id", userIds),
        sb.from("user_settings").select("user_id,settings").in("user_id", userIds),
      ]);
      const tally = (rows: any[] = []) => {
        const m: Record<string, number> = {};
        rows.forEach((r: any) => { m[r.user_id] = (m[r.user_id] || 0) + 1; });
        return m;
      };
      const exp = tally(expRes.data); const inc = tally(incRes.data);
      const shop = tally(shopRes.data); const hab = tally(habitRes.data);
      const note = tally(noteRes.data); const cal = tally(calRes.data);
      const settingsMap: Record<string, any> = {};
      (settingsRes.data || []).forEach((r: any) => { settingsMap[r.user_id] = r.settings || {}; });
      userIds.forEach((id: string) => {
        countsByUser[id] = {
          expenses: exp[id] || 0, incomes: inc[id] || 0, shopping: shop[id] || 0,
          habits: hab[id] || 0, notes: note[id] || 0, calendar: cal[id] || 0,
          settings: settingsMap[id] || null,
        };
      });
    }

    const formatted = paged.map((u: any) => {
      const counts = countsByUser[u.id] || {};
      const settings = counts.settings || {};
      return {
        id: u.id, email: u.email || "",
        name: settings.userName || u.user_metadata?.full_name || (u.email?.split("@")[0] || "User"),
        avatar: settings.userAvatar || (u.email?.charAt(0).toUpperCase() || "U"),
        country: settings.userCountry || "IN", deviceType: "Web",
        premium: premMap.has(u.id),
        premiumSince: premMap.get(u.id)?.since?.toISOString() ?? null,
        status: u.banned_at ? "SUSPENDED" : "ACTIVE",
        signupAt: u.created_at, lastActiveAt: settings.lastActiveAt || u.last_sign_in_at || u.created_at,
        appVersion: "2.4.1", osVersion: null, deviceModel: null,
        totalExpenses: counts.expenses || 0, totalHabits: counts.habits || 0,
        totalNotes: counts.notes || 0, storageUsedMb: 0,
        expenseCount: counts.expenses || 0, incomeCount: counts.incomes || 0,
        shoppingCount: counts.shopping || 0, habitCount: counts.habits || 0,
        noteCount: counts.notes || 0, calendarCount: counts.calendar || 0,
        studentMode: settings.studentMode || false, officeMode: settings.officeMode || false,
        tripMode: settings.tripMode || "none",
        provider: u.app_metadata?.provider || "email",
        emailConfirmed: u.email_confirmed_at ? true : false,
        lastSignInAt: u.last_sign_in_at, createdAt: u.created_at, subscriptions: [],
      };
    });

    return NextResponse.json({ users: formatted, total, page, limit, totalPages: Math.ceil(total / limit), source: "supabase_auth" });
  } catch (error: any) {
    console.error("[/api/admin/users] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const { email, name, country, premium, deviceType } = body;
  if (!email || !name) return NextResponse.json({ error: "Email and name required" }, { status: 400 });
  const existing = await db.appUser.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  const user = await db.appUser.create({
    data: { email, name, country: country || "IN", deviceType: deviceType || "iOS", premium: premium ?? false, premiumSince: premium ? new Date() : null },
  });
  await logAction(session!.user.id, "CREATE_USER", "APP_USER", user.id, { email });
  return NextResponse.json(user, { status: 201 });
}
