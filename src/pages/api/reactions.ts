import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { authSession } from "@/lib/auth";
import { prisma as p } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await authSession(req, res);
  if (!session?.user) return res.status(401).json({ error: "Sign in required" });
  const userId = (session.user as { id: string }).id;

  if (req.method === "GET") {
    const { partId } = req.query;
    if (typeof partId !== "string") return res.status(400).json({ error: "partId required" });
    const [grouped, mine] = await Promise.all([
      prisma.reaction.groupBy({ by: ["kind"], where: { partId }, _count: { _all: true } }),
      prisma.reaction.findMany({ where: { partId, userId }, select: { kind: true } }),
    ]);
    const counts: Record<string, number> = {};
    for (const g of grouped) counts[g.kind] = g._count._all;
    const mineMap: Record<string, boolean> = {};
    for (const m of mine) mineMap[m.kind] = true;
    return res.status(200).json({ counts, mine: mineMap });
  }

  if (req.method === "POST") {
    const { partId, kind } = req.body ?? {};
    if (typeof partId !== "string" || typeof kind !== "string") return res.status(400).json({ error: "partId and kind required" });
    const valid = ["LIKE", "LOVE", "WOW", "SAD", "FIRE"];
    if (!valid.includes(kind)) return res.status(400).json({ error: "Invalid reaction" });
    const part = await prisma.part.findUnique({ where: { id: partId }, select: { id: true } });
    if (!part) return res.status(404).json({ error: "Part not found" });
    const reaction = await prisma.reaction.upsert({
      where: { partId_userId_kind: { partId, userId, kind: kind as never } },
      create: { partId, userId, kind: kind as never },
      update: {},
    });
    await p.analyticsEvent.create({ data: { type: "REACTION_ADDED", partId, userId, sessionId: null } }).catch(() => {});
    return res.status(201).json({ reaction });
  }

  if (req.method === "DELETE") {
    const { partId, kind } = req.body ?? {};
    if (typeof partId !== "string" || typeof kind !== "string") return res.status(400).json({ error: "partId and kind required" });
    await prisma.reaction.deleteMany({ where: { partId, userId, kind: kind as never } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
