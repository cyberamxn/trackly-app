import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ===================================================================
// PWA Google Sign-In relay (device-pairing style)
// ===================================================================
// Flow: the installed PWA (own cookie jar → Google account picker missing)
// opens the OAuth flow in the real browser. The browser lands on
// /app/auth/bridge/<ticket> and POSTs the session tokens here. The PWA
// polls GET with the same ticket and completes supabase.auth.setSession().
//
// Storage: admin Prisma DB `SystemSetting` rows (key = pwaRelay:<ticket>)
// — serverless-safe (shared across lambda instances), no new table needed.
//
// Security: ticket is a 128-bit random hex value generated on the device;
// entries are single-use, expire after 3 minutes, and are deleted on read
// or on lazy cleanup of expired entries.
// ===================================================================

const TICKET_RE = /^[a-f0-9]{32,64}$/;
const TTL_MS = 3 * 60 * 1000; // 3 minutes
const KEY_PREFIX = "pwaRelay:";

function relayKey(ticket: string) {
  return `${KEY_PREFIX}${ticket}`;
}

async function cleanupExpired() {
  try {
    const cutoff = Date.now() - TTL_MS - 60_000;
    const stale = await db.systemSetting.findMany({
      where: { key: { startsWith: KEY_PREFIX } },
      select: { key: true, value: true },
      take: 200,
    });
    const deadKeys = stale
      .filter((row) => {
        try {
          return (JSON.parse(row.value)?.exp ?? 0) < cutoff;
        } catch {
          return true;
        }
      })
      .map((row) => row.key);
    if (deadKeys.length > 0) {
      await db.systemSetting.deleteMany({ where: { key: { in: deadKeys } } });
    }
  } catch {
    // cleanup is best-effort
  }
}

/** POST — bridge page (browser) deposits the session tokens for a ticket. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ticket = String(body?.ticket ?? "");
    const session = body?.session ?? {};
    const accessToken = String(session.access_token ?? "");
    const refreshToken = String(session.refresh_token ?? "");

    if (!TICKET_RE.test(ticket)) {
      return NextResponse.json({ error: "invalid ticket" }, { status: 400 });
    }
    // JWTs are 3 dot-separated base64url segments
    if (
      accessToken.split(".").length !== 3 ||
      refreshToken.split(".").length !== 3 ||
      accessToken.length > 4096 ||
      refreshToken.length > 4096
    ) {
      return NextResponse.json({ error: "invalid session" }, { status: 400 });
    }

    await cleanupExpired();

    const value = JSON.stringify({
      a: accessToken,
      r: refreshToken,
      exp: Date.now() + TTL_MS,
    });
    await db.systemSetting.upsert({
      where: { key: relayKey(ticket) },
      create: { key: relayKey(ticket), value, type: "STRING" },
      update: { value },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "relay error" },
      { status: 500 }
    );
  }
}

/** GET — the PWA polls this until the tokens appear (single-use). */
export async function GET(req: NextRequest) {
  try {
    const ticket = String(new URL(req.url).searchParams.get("ticket") ?? "");
    if (!TICKET_RE.test(ticket)) {
      return NextResponse.json({ error: "invalid ticket" }, { status: 400 });
    }

    const row = await db.systemSetting.findUnique({
      where: { key: relayKey(ticket) },
    });
    if (!row) {
      // Not ready yet — the PWA keeps polling
      return new NextResponse(null, { status: 204 });
    }

    // Single-use: delete immediately after read
    await db.systemSetting
      .delete({ where: { key: relayKey(ticket) } })
      .catch(() => {});

    let payload: { a?: string; r?: string; exp?: number } = {};
    try {
      payload = JSON.parse(row.value);
    } catch {
      return NextResponse.json({ error: "corrupt" }, { status: 410 });
    }
    if (!payload.a || !payload.r || (payload.exp ?? 0) < Date.now()) {
      return NextResponse.json({ error: "expired" }, { status: 410 });
    }

    return NextResponse.json({
      session: { access_token: payload.a, refresh_token: payload.r },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "relay error" },
      { status: 500 }
    );
  }
}
