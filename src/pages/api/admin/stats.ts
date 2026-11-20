import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { authSession } from "@/lib/auth";
import { isAdmin } from "@/lib/session";

/**
 * Aggregated dashboard stats.
 * Returns: totals, 14-day traffic series, top parts, top series, recent users,
 * reaction breakdown and download-attempt counters.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const session = await authSession(req, res);
  if (!session?.user) return res.status(401).json({ error: "Sign in required" });
  const me = { id: (session.user as { id: string }).id, role: (session.user as { role: string }).role };
  if (!isAdmin({ id: me.id, role: me.role as never, name: null, email: null })) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const days = 14;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const [
    totalSeries,
    totalParts,
    publishedParts,
    totalUsers,
    totalViews,
    totalComments,
    totalReactions,
    downloadAttempts,
    dailyViews,
    dailySignups,
    topParts,
    topSeries,
    recentUsers,
    reactionBreakdown,
    recentEvents,
  ] = await Promise.all([
    prisma.series.count(),
    prisma.part.count(),
    prisma.part.count({ where: { published: true } }),
    prisma.user.count(),
    prisma.partView.count(),
    prisma.comment.count({ where: { status: "VISIBLE" } }),
    prisma.reaction.count(),
    prisma.analyticsEvent.count({ where: { type: { in: ["DOWNLOAD_ATTEMPT", "DOWNLOAD_BLOCKED"] } } }),
    prisma.partView.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.partView.groupBy({
      by: ["partId"],
      _count: { _all: true },
      orderBy: { _count: { partId: "desc" } },
      take: 8,
    }),
    prisma.partView.groupBy({
      by: ["partId"],
      _count: { _all: true },
      orderBy: { partId: "asc" },
      take: 200,
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.reaction.groupBy({ by: ["kind"], _count: { _all: true } }),
    prisma.analyticsEvent.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { user: { select: { name: true, email: true } } } }),
  ]);

  // fill daily buckets
  const viewBuckets = new Array(days).fill(0);
  for (const v of dailyViews) {
    const d = Math.floor((v.createdAt.getTime() - since.getTime()) / 86400000);
    if (d >= 0 && d < days) viewBuckets[d]++;
  }
  const signupBuckets = new Array(days).fill(0);
  for (const u of dailySignups) {
    const d = Math.floor((u.createdAt.getTime() - since.getTime()) / 86400000);
    if (d >= 0 && d < days) signupBuckets[d]++;
  }
  const dayLabels = Array.from({ length: days }, (_, i) => {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const partIds = [...new Set(topParts.map((t) => t.partId).concat(topSeries.map((t) => t.partId)))];
  const parts = await prisma.part.findMany({
    where: { id: { in: partIds } },
    select: { id: true, title: true, order: true, series: { select: { id: true, title: true, slug: true } } },
  });
  const partMap = new Map(parts.map((p) => [p.id, p]));

  // aggregate views per series
  const seriesAgg = new Map<string, { title: string; slug: string; views: number }>();
  for (const row of topSeries) {
    const p = partMap.get(row.partId);
    if (!p) continue;
    const cur = seriesAgg.get(p.series.id) ?? { title: p.series.title, slug: p.series.slug, views: 0 };
    cur.views += row._count._all;
    seriesAgg.set(p.series.id, cur);
  }

  return res.status(200).json({
    totals: {
      series: totalSeries,
      parts: totalParts,
      publishedParts,
      users: totalUsers,
      views: totalViews,
      comments: totalComments,
      reactions: totalReactions,
      downloadAttempts,
    },
    traffic: { days: dayLabels, views: viewBuckets, signups: signupBuckets },
    topParts: topParts.map((t) => {
      const p = partMap.get(t.partId);
      return {
        id: t.partId,
        title: p ? `Part ${p.order}: ${p.title}` : t.partId,
        seriesTitle: p?.series.title ?? "—",
        views: t._count._all,
      };
    }),
    topSeries: [...seriesAgg.entries()]
      .map(([id, v]) => ({ id, title: v.title, slug: v.slug, views: v.views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8),
    recentUsers,
    reactionBreakdown: Object.fromEntries(reactionBreakdown.map((r) => [r.kind, r._count._all])),
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      type: e.type,
      createdAt: e.createdAt,
      user: e.user?.name ?? e.user?.email ?? "anonymous",
    })),
  });
}
