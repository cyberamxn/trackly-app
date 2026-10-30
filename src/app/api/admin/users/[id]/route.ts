import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAction } from "@/lib/admin/server";
import { tryGetSupabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { getPremiumInfo, grantPremium, revokePremium } from "@/lib/trackly/premium";

/**
 * GET /api/admin/users/[id]
 *
 * Returns a single user's full detail, pulled from Supabase (real user data).
 * Includes: profile, lifetime counts (expenses/incomes/habits/notes/shopping/
 * calendar/borrow_lend), settings, recent activity feed, and recent
 * notifications sent to this user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const supabaseAdmin = tryGetSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured." },
      { status: 503 }
    );
  }
  const sb = supabaseAdmin as any;

  try {
    // 0) Admin-granted premium (engine 29) — real PremiumUser row
    const prem = await getPremiumInfo(id);

    // 1) Auth user record (email, created_at, last_sign_in_at, banned_at, provider)
    const { data: authUser, error: authErr } = await sb.auth.admin.getUserById(id);
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 404 });
    }
    const u = authUser?.user;
    if (!u) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2) Profile row (if exists)
    const { data: profileRow } = await sb
      .from("profiles")
      .select("*")
      .eq("user_id", id)
      .maybeSingle();

    // 3) Settings row (if exists)
    const { data: settingsRow } = await sb
      .from("user_settings")
      .select("settings,updated_at")
      .eq("user_id", id)
      .maybeSingle();
    const settings = (settingsRow?.settings as any) || {};

    // 4) Lifetime counts + recent items per data type (all in parallel)
    const [
      expRes, expRecentRes,
      incRes,
      shopRes,
      habitRes, habitRecentRes,
      noteRes, noteRecentRes,
      calRes, calRecentRes,
      borrowRes,
    ] = await Promise.all([
      sb.from("expenses").select("id,amount,date").eq("user_id", id).order("created_at", { ascending: false }),
      sb.from("expenses").select("id,title,merchant,amount,category,date,time").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
      sb.from("incomes").select("id,amount,date").eq("user_id", id).order("created_at", { ascending: false }),
      sb.from("shopping").select("id,name,price,status").eq("user_id", id).order("created_at", { ascending: false }),
      sb.from("habits").select("id,name,done,goal,streak").eq("user_id", id).order("created_at", { ascending: false }),
      sb.from("habits").select("id,name,done,goal,streak,unit").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
      sb.from("notes").select("id,title,preview,pinned").eq("user_id", id).order("created_at", { ascending: false }),
      sb.from("notes").select("id,title,preview,pinned,tags").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
      sb.from("calendar_events").select("id,title,date,type").eq("user_id", id).order("created_at", { ascending: false }),
      sb.from("calendar_events").select("id,title,date,type").eq("user_id", id).order("date", { ascending: true }).limit(10),
      sb.from("borrow_lend").select("id,person,type,amount,paid,due_date").eq("user_id", id).order("created_at", { ascending: false }),
    ]);

    const expenses = expRes.data || [];
    const incomes = incRes.data || [];
    const shopping = shopRes.data || [];
    const habits = habitRes.data || [];
    const notes = noteRes.data || [];
    const calendar = calRes.data || [];
    const borrowLend = borrowRes.data || [];

    const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const totalIncome = incomes.reduce((s: number, i: any) => s + (i.amount || 0), 0);
    const totalLentOut = borrowLend
      .filter((b: any) => b.type === "lent")
      .reduce((s: number, b: any) => s + ((b.amount || 0) - (b.paid || 0)), 0);

    // 5) Recent notifications sent to this user (last 20)
    const { data: notifReads } = await sb
      .from("user_notification_reads")
      .select("notification_id,read_at")
      .eq("user_id", id)
      .order("read_at", { ascending: false })
      .limit(20);
    const readNotifIds = (notifReads || []).map((r: any) => r.notification_id);
    let recentNotifications: any[] = [];
    if (readNotifIds.length > 0) {
      const { data: notifs } = await sb
        .from("notifications")
        .select("id,title,body,sent_at,status")
        .in("id", readNotifIds)
        .order("sent_at", { ascending: false })
        .limit(20);
      recentNotifications = (notifs || []).map((n: any) => {
        const read = (notifReads || []).find((r: any) => r.notification_id === n.id);
        return { ...n, readAt: read?.read_at || null };
      });
    }

    // 6) Build a synthetic "activity feed" from recent data items
    const now = Date.now();
    const activity: any[] = [];
    (expRecentRes.data || []).forEach((e: any) => {
      activity.push({
        id: `exp-${e.id}`,
        eventType: "EXPENSE_LOGGED",
        screen: "expenses",
        title: e.title || e.merchant || "Expense",
        subtitle: `₹${(e.amount || 0).toLocaleString("en-IN")} · ${e.category || "other"}`,
        createdAt: e.date ? `${e.date}T${e.time || "00:00"}` : new Date().toISOString(),
      });
    });
    (habitRecentRes.data || []).forEach((h: any) => {
      activity.push({
        id: `hab-${h.id}`,
        eventType: "HABIT_ACTIVITY",
        screen: "habits",
        title: h.name,
        subtitle: `${h.done}/${h.goal} ${h.unit || "x"} · streak ${h.streak}`,
        createdAt: new Date(now - Math.random() * 86400000 * 7).toISOString(),
      });
    });
    (noteRecentRes.data || []).forEach((n: any) => {
      activity.push({
        id: `note-${n.id}`,
        eventType: "NOTE_CREATED",
        screen: "notes",
        title: n.title || "Untitled note",
        subtitle: n.pinned ? "📌 Pinned" : (n.preview || "").slice(0, 60),
        createdAt: new Date(now - Math.random() * 86400000 * 14).toISOString(),
      });
    });
    activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 7) Assemble the response — match the shape UsersScreen.tsx expects
    const detail = {
      id: u.id,
      email: u.email || "",
      name: settings.userName || u.user_metadata?.full_name || profileRow?.full_name || (u.email?.split("@")[0] || "User"),
      avatar: settings.userAvatar || (u.email?.charAt(0).toUpperCase() || "U"),
      country: settings.userCountry || "IN",
      deviceType: "Web",
      appVersion: "2.4.1",
      osVersion: null,
      deviceModel: null,
      status: u.banned_at ? "BANNED" : "ACTIVE",
      premium: !!prem,
      premiumSince: prem?.since?.toISOString() ?? null,
      premiumNote: prem?.note ?? null,
      premiumExpires: null,
      storageUsedMb: 0,
      storageLimitMb: 500,
      totalExpenses: expenses.length,
      totalHabits: habits.length,
      totalNotes: notes.length,
      lastActiveAt: settings.lastActiveAt || u.last_sign_in_at || u.created_at,
      signupAt: u.created_at,
      // Extended detail fields:
      subscriptions: [],
      loginHistory: [
        {
          id: `login-${u.id}-last`,
          ipAddress: "—",
          device: u.app_metadata?.provider || "email",
          location: null,
          success: true,
          createdAt: u.last_sign_in_at || u.created_at,
        },
      ],
      tickets: [],
      activities: activity.slice(0, 20),
      // Trackly-specific extras (used by Overview tab):
      trackly: {
        expenses: (expRecentRes.data || []).map((e: any) => ({
          id: e.id, title: e.title || e.merchant, merchant: e.merchant,
          amount: e.amount, category: e.category, date: e.date, time: e.time,
        })),
        habits: (habitRecentRes.data || []).map((h: any) => ({
          id: h.id, name: h.name, done: h.done, goal: h.goal, streak: h.streak, unit: h.unit,
        })),
        notes: (noteRecentRes.data || []).map((n: any) => ({
          id: n.id, title: n.title, preview: n.preview, pinned: n.pinned, tags: n.tags,
        })),
        calendar: (calRecentRes.data || []).map((c: any) => ({
          id: c.id, title: c.title, date: c.date, type: c.type,
        })),
        shopping: (shopping || []).slice(0, 10).map((s: any) => ({
          id: s.id, name: s.name, price: s.price, status: s.status,
        })),
        borrowLend: (borrowLend || []).slice(0, 10).map((b: any) => ({
          id: b.id, person: b.person, type: b.type, amount: b.amount, paid: b.paid, dueDate: b.due_date,
        })),
        recentNotifications,
        totals: {
          expenseCount: expenses.length,
          incomeCount: incomes.length,
          shoppingCount: shopping.length,
          habitCount: habits.length,
          noteCount: notes.length,
          calendarCount: calendar.length,
          borrowLendCount: borrowLend.length,
          totalExpensesAmount: totalExpenses,
          totalIncomeAmount: totalIncome,
          totalLentOut: totalLentOut,
        },
        modes: {
          studentMode: settings.studentMode || false,
          studentPaused: settings.studentPaused || false,
          officeMode: settings.officeMode || false,
          officePaused: settings.officePaused || false,
          tripMode: settings.tripMode || "none",
          tripDestination: settings.tripDestination || "",
        },
        settings: {
          currency: settings.currency || "INR",
          language: settings.language || "en",
          theme: settings.theme || "system",
          userName: settings.userName || "",
          userEmail: settings.userEmail || "",
          userPhone: settings.userPhone || "",
          userBio: settings.userBio || "",
          userCountry: settings.userCountry || "IN",
          userMemberSince: settings.userMemberSince || "",
        },
      },
      // Auth metadata
      auth: {
        provider: u.app_metadata?.provider || "email",
        emailConfirmed: u.email_confirmed_at ? true : false,
        lastSignInAt: u.last_sign_in_at,
        createdAt: u.created_at,
        bannedAt: u.banned_at,
      },
    };

    return NextResponse.json(detail);
  } catch (error: any) {
    console.error("[/api/admin/users/[id]] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] — update
// NOTE: For Supabase-backed users, most fields can't be updated from here
// (email/name are managed by Supabase Auth). We update settings via the
// user_settings table instead.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const supabaseAdmin = tryGetSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured." },
      { status: 503 }
    );
  }
  const sb = supabaseAdmin as any;

  // Update settings fields that the admin is allowed to touch
  const allowedSettings = ["userName", "userEmail", "userCountry", "userPhone"];
  const settingsUpdate: any = {};
  for (const k of allowedSettings) {
    if (body[k] !== undefined) settingsUpdate[k] = body[k];
  }

  if (Object.keys(settingsUpdate).length > 0) {
    // Fetch existing settings, merge, and upsert
    const { data: existing } = await sb
      .from("user_settings")
      .select("settings")
      .eq("user_id", id)
      .maybeSingle();
    const merged = { ...(existing?.settings || {}), ...settingsUpdate };
    const { error: upsertErr } = await sb
      .from("user_settings")
      .upsert({ user_id: id, settings: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
  }

  // Update auth email if provided (rare, but supported)
  if (body.email && body.email !== body.originalEmail) {
    const { error: emailErr } = await sb.auth.admin.updateUserById(id, { email: body.email });
    if (emailErr) {
      return NextResponse.json({ error: emailErr.message }, { status: 500 });
    }
  }

  await logAction(session!.user.id, "UPDATE_USER", "APP_USER", id, body);
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/users/[id] — soft (ban) or hard (delete + full data wipe)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const supabaseAdmin = tryGetSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured." },
      { status: 503 }
    );
  }
  const sb = supabaseAdmin as any;

  if (body.hard) {
    // Hard delete: wipe ALL app data for the user first (parallel, idempotent —
    // FK cascades may already remove some rows), then remove the auth user.
    const supaTables = [
      "expenses", "incomes", "shopping", "borrow_lend", "habits", "notes",
      "calendar_events", "user_settings", "profiles", "office_data",
      "student_data", "trip_history", "student_history", "office_history",
      "user_notification_reads",
    ];
    const cleanups = supaTables.map((t) => sb.from(t).delete().eq("user_id", id));
    cleanups.push(
      // Prisma-side rows tied to this user (premium, AI quota, referral graph)
      db.premiumUser.deleteMany({ where: { userId: id } }).catch(() => null),
      db.aiUsage.deleteMany({ where: { userId: id } }).catch(() => null),
      db.referralCode.deleteMany({ where: { userId: id } }).catch(() => null),
      db.referral.deleteMany({ where: { OR: [{ referrerId: id }, { refereeId: id }] } }).catch(() => null),
    );
    await Promise.allSettled(cleanups);

    const { error: delErr } = await sb.auth.admin.deleteUser(id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    await logAction(session!.user.id, "DELETE_USER", "APP_USER", id, { hard: true });
  } else {
    // Soft delete: ban the user
    const { error: banErr } = await sb.auth.admin.updateUserById(id, { ban_duration: "87600h" });
    if (banErr) {
      return NextResponse.json({ error: banErr.message }, { status: 500 });
    }
    await logAction(session!.user.id, "DELETE_USER", "APP_USER", id, { soft: true });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/admin/users/[id] — status changes (suspend/ban/restore/resetPassword)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const action = body.action; // suspend | ban | restore | resetPassword
  const supabaseAdmin = tryGetSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured." },
      { status: 503 }
    );
  }
  const sb = supabaseAdmin as any;

  // Engine 29: premium grant/revoke — admin-panel "Grant premium" button.
  // Premium = NO limits on the account (daily AI quota fully bypassed;
  // that's the only enforced user-facing limit today).
  if (body.action === "grantPremium" || body.action === "revokePremium") {
    const granting = body.action === "grantPremium";
    const ok = granting ? await grantPremium(id, typeof body.note === "string" ? body.note.slice(0, 200) : null) : await revokePremium(id);
    if (!ok) {
      return NextResponse.json({ error: `Failed to ${granting ? "grant" : "revoke"} premium (DB error)` }, { status: 500 });
    }
    await logAction(session!.user.id, granting ? "GRANT_PREMIUM" : "REVOKE_PREMIUM", "APP_USER", id, { note: body.note ?? null });
    return NextResponse.json({ success: true, premium: granting });
  }

  if (action === "resetPassword") {
    // Generate a DIRECT password reset link via Supabase admin API.
    // This bypasses email delivery entirely (built-in SMTP is rate-limited
    // and often lands in spam) — the admin gets a copyable link instead.
    const { data: userData } = await sb.auth.admin.getUserById(id);
    const email = userData?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "User has no email" }, { status: 400 });
    }

    // Build redirect target from the request origin (works on localhost,
    // preview URLs, and production domains without extra config)
    const origin =
      req.headers.get("origin") ||
      `${req.nextUrl.protocol}//${req.nextUrl.host}` ||
      "";
    const redirectTo = origin ? `${origin}/reset-password` : undefined;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/auth/v1/admin/generate_link`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({
          type: "recovery",
          email,
          ...(redirectTo ? { redirect_to: redirectTo } : {}),
        }),
      }
    );

    const linkData = await res.json().catch(() => null);
    if (!res.ok || !linkData?.action_link) {
      return NextResponse.json(
        { error: linkData?.msg || linkData?.error_description || "Failed to generate reset link" },
        { status: 502 }
      );
    }

    await logAction(session!.user.id, "RESET_USER_PASSWORD", "APP_USER", id, { method: "direct-link" });
    return NextResponse.json({
      success: true,
      link: linkData.action_link,
      email,
      message: "Reset link generated — copy and share it with the user",
    });
  }

  try {
    if (action === "suspend" || action === "ban") {
      // Ban for 100 years (effectively permanent)
      const { error: banErr } = await sb.auth.admin.updateUserById(id, { ban_duration: "87600h" });
      if (banErr) throw new Error(banErr.message);
    } else if (action === "restore") {
      // Unban — set ban_duration to null
      const { error: unbanErr } = await sb.auth.admin.updateUserById(id, { ban_duration: "none" });
      if (unbanErr) throw new Error(unbanErr.message);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await logAction(session!.user.id, `${action.toUpperCase()}_USER`, "APP_USER", id, { action });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
