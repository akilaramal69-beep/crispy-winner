import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { authSession } from "@/lib/auth";
import { isAdmin } from "@/lib/session";

async function requireStaff(req: NextApiRequest, res: NextApiResponse) {
  const session = await authSession(req, res);
  if (!session?.user) return res.status(401).json({ error: "Sign in required" }), null;
  const user = { id: (session.user as { id: string }).id, role: (session.user as { role: string }).role };
  if (!isAdmin({ id: user.id, role: user.role as never, name: null, email: null })) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const staff = await requireStaff(req, res);
  if (!staff) return;

  if (req.method === "GET") {
    const { status } = req.query;
    const where = status === "VISIBLE" || status === "HIDDEN" ? { status: status as "VISIBLE" | "HIDDEN" } : {};
    const comments = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        part: { select: { id: true, title: true, order: true, series: { select: { title: true } } } },
      },
    });
    return res.status(200).json({ comments });
  }

  if (req.method === "PATCH") {
    const { id, status } = req.body ?? {};
    if (typeof id !== "string" || (status !== "VISIBLE" && status !== "HIDDEN")) {
      return res.status(400).json({ error: "id and status (VISIBLE/HIDDEN) required" });
    }
    try {
      const comment = await prisma.comment.update({ where: { id }, data: { status } });
      return res.status(200).json({ comment: { id: comment.id, status: comment.status } });
    } catch {
      return res.status(404).json({ error: "Comment not found" });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.body ?? {};
    if (typeof id !== "string") return res.status(400).json({ error: "id required" });
    try {
      await prisma.comment.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(404).json({ error: "Comment not found" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
