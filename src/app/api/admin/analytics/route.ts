import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { db } from "@/lib/db";

// GET /api/admin/analytics — aggregated analytics with optional date range
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "30");
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400000);

  // DAU/WAU/MAU
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // All queries fired in a single parallel batch.
  // (Pehle ~10 sequential await chains the — har chain cross-region RTT
  // khati thi, isliye endpoint 11-16s leta tha.)
  const [
    dau, wau, mau, events, eventTypeCounts, screenCounts,
    countryCounts, deviceCounts, versionCounts,
    totalUsers, premiumUsers, sentNotifications,
  ] = await Promise.all([
    db.appUser.count({ where: { lastActiveAt: { gte: todayStart } } }),
    db.appUser.count({ where: { lastActiveAt: { gte: weekStart } } }),
    db.appUser.count({ where: { lastActiveAt: { gte: monthStart } } }),
    db.activityEvent.findMany({
      where: { eventType: "APP_OPEN", createdAt: { gte: start } },
      select: { createdAt: true, userId: true },
    }),
    db.activityEvent.groupBy({
      by: ["eventType"],
      _count: { eventType: true },
      where: { createdAt: { gte: start } },
      orderBy: { _count: { eventType: "desc" } },
    }),
    db.activityEvent.groupBy({
      by: ["screen"],
      _count: { screen: true },
      where: { createdAt: { gte: start }, screen: { not: null } },
      orderBy: { _count: { screen: "desc" } },
    }),
    db.appUser.groupBy({
      by: ["country"],
      _count: { country: true },
      orderBy: { _count: { country: "desc" } },
    }),
    db.appUser.groupBy({
      by: ["deviceModel"],
      _count: { deviceModel: true },
      orderBy: { _count: { deviceModel: "desc" } },
    }),
    db.appUser.groupBy({
      by: ["appVersion"],
      _count: { appVersion: true },
      orderBy: { _count: { appVersion: "desc" } },
    }),
    db.appUser.count(),
    db.appUser.count({ where: { premium: true } }),
    db.pushNotification.aggregate({
      _sum: { sentCount: true, openedCount: true },
      where: { status: "SENT" },
    }).catch(() => ({ _sum: { sentCount: 0, openedCount: 0 } })),
  ]);

  // Group by day for DAU chart
  const dailyMap: Record<string, Set<string>> = {};
  for (const e of events) {
    const day = e.createdAt.toISOString().slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = new Set();
    dailyMap[day].add(e.userId ?? "anon");
  }
  const dauSeries = Object.entries(dailyMap)
    .map(([day, users]) => ({ day, count: users.size }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Subscription conversion
  const conversionRate = totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0;

  // Notification open rate
  const notifOpenRate = (sentNotifications._sum.sentCount ?? 0) > 0
    ? Math.round(((sentNotifications._sum.openedCount ?? 0) / (sentNotifications._sum.sentCount ?? 1)) * 100)
    : 0;

  // Retention buckets (simplified)
  const retention = [
    { day: "Day 1", pct: 100 },
    { day: "Day 3", pct: Math.round(dau / Math.max(1, mau) * 100) },
    { day: "Day 7", pct: Math.round((wau / Math.max(1, mau)) * 100) },
    { day: "Day 14", pct: Math.round((wau / Math.max(1, mau)) * 85) },
    { day: "Day 30", pct: Math.round((mau / Math.max(1, totalUsers)) * 100) },
  ];

  return NextResponse.json({
    dau,
    wau,
    mau,
    dauSeries,
    eventTypeCounts: eventTypeCounts.map((e) => ({ type: e.eventType, count: e._count.eventType })),
    screenCounts: screenCounts.map((s) => ({ screen: s.screen, count: s._count.screen })),
    countryCounts: countryCounts.map((c) => ({ country: c.country, count: c._count.country })),
    deviceCounts: deviceCounts.map((d) => ({ device: d.deviceModel, count: d._count.deviceModel })),
    versionCounts: versionCounts.map((v) => ({ version: v.appVersion, count: v._count.appVersion })),
    conversionRate,
    notifOpenRate,
    retention,
    totalUsers,
    premiumUsers,
  });
}
