import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/integrations
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const integrations = await db.integration.findMany({ orderBy: { name: "asc" } });
  // Mask API keys in config
  const masked = integrations.map((i) => {
    let config;
    try {
      config = JSON.parse(i.config);
      for (const k of Object.keys(config)) {
        if (/key|secret|password|token/i.test(k) && typeof config[k] === "string" && config[k].length > 4) {
          config[k] = config[k].slice(0, 3) + "•".repeat(Math.min(config[k].length - 3, 12));
        }
      }
    } catch {
      config = {};
    }
    return { ...i, config };
  });
  return NextResponse.json(masked);
}

// POST /api/admin/integrations — connect/update integration
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(["SUPER_ADMIN", "ADMIN"]);
  if (error) return error;
  const body = await req.json();

  // Find by key
  const existing = await db.integration.findUnique({ where: { key: body.key } });
  if (existing) {
    const updated = await db.integration.update({
      where: { id: existing.id },
      data: {
        connected: body.connected ?? existing.connected,
        config: JSON.stringify(body.config || {}),
        lastSyncedAt: body.connected ? new Date() : existing.lastSyncedAt,
      },
    });
    return NextResponse.json(updated);
  }

  // Create new
  const integration = await db.integration.create({
    data: {
      key: body.key,
      name: body.name || body.key,
      connected: body.connected ?? false,
      config: JSON.stringify(body.config || {}),
      lastSyncedAt: body.connected ? new Date() : null,
    },
  });
  return NextResponse.json(integration, { status: 201 });
}
