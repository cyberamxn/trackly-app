import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/sync — returns all admin-controlled data for the live app
// No auth required — this is the public sync endpoint
// force-dynamic: Vercel par build-time prerender/prisma-query kabhi na ho
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [featureFlags, remoteConfigs, content, notifications, systemSettings, plans, coupons] = await Promise.all([
      db.featureFlag.findMany(),
      db.remoteConfig.findMany(),
      db.content.findMany({ where: { active: true } }),
      db.pushNotification.findMany({ where: { status: "SENT" }, orderBy: { sentAt: "desc" }, take: 10 }),
      db.systemSetting.findMany(),
      db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
      db.coupon.findMany({ where: { active: true } }),
    ]);

    const config: Record<string, any> = {};
    remoteConfigs.forEach((c) => {
      config[c.key] = c.type === "BOOLEAN" ? c.value === "true" : c.type === "NUMBER" ? Number(c.value) : c.type === "JSON" ? JSON.parse(c.value) : c.value;
    });

    const settings: Record<string, string> = {};
    systemSettings.forEach((s) => { settings[s.key] = s.value; });

    const contentByType: Record<string, any[]> = {};
    content.forEach((c) => {
      if (!contentByType[c.type]) contentByType[c.type] = [];
      contentByType[c.type].push({
        id: c.id, key: c.key, title: c.title, body: c.body,
        metadata: (() => { try { return JSON.parse(c.metadata); } catch { return {}; } })(),
      });
    });

    return NextResponse.json({
      syncedAt: new Date().toISOString(),
      featureFlags: featureFlags.map((f) => ({ key: f.key, name: f.name, enabled: f.enabled, rolloutPercent: f.rolloutPercent })),
      config,
      settings,
      content: contentByType,
      notifications: notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, sentAt: n.sentAt, target: n.target })),
      plans: plans.map((p) => ({
        id: p.id, name: p.name, tier: p.tier, billingPeriod: p.billingPeriod, priceCents: p.priceCents,
        currency: p.currency, features: (() => { try { return JSON.parse(p.features); } catch { return []; } })(), trialDays: p.trialDays,
      })),
      coupons: coupons.map((c) => ({ code: c.code, discountPercent: c.discountPercent, expiresAt: c.expiresAt })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
