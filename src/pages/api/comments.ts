import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { authSession } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  user: { id: string; name: string | null; email: string | null };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { partId } = req.query;

  if (req.method === "GET") {
    if (typeof partId !== "string") return res.status(400).json({ error: "partId required" });
    const rows = await prisma.comment.findMany({
      where: { partId, status: "VISIBLE", parentId: null },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: {
          where: { status: "VISIBLE" },
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, email: true } },
            replies: {
              where: { status: "VISIBLE" },
              orderBy: { createdAt: "asc" },
              include: {
                user: { select: { id: true, name: true, email: true } },
                replies: {
                  where: { status: "VISIBLE" },
                  orderBy: { createdAt: "asc" },
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                    replies: {
                      where: { status: "VISIBLE" },
                      orderBy: { createdAt: "asc" },
                      include: { user: { select: { id: true, name: true, email: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return res.status(200).json({ comments: rows });
  }

  const session = await authSession(req, res);
  if (!session?.user) return res.status(401).json({ error: "Sign in to comment" });
  const userId = (session.user as { id: string }).id;

  if (req.method === "POST") {
    const { partId: pid, body, parentId } = req.body ?? {};
    if (typeof pid !== "string" || typeof body !== "string") return res.status(400).json({ error: "partId and body required" });
    const text = body.trim();
    if (!text) return res.status(400).json({ error: "Comment cannot be empty" });
    if (text.length > 2000) return res.status(400).json({ error: "Comment too long (max 2000 chars)" });

    const part = await prisma.part.findUnique({ where: { id: pid }, select: { id: true } });
    if (!part) return res.status(404).json({ error: "Part not found" });
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { id: true, partId: true } });
      if (!parent || parent.partId !== pid) return res.status(400).json({ error: "Invalid parent comment" });
    }

    const comment = await prisma.comment.create({
      data: { partId: pid, userId, body: text, parentId: parentId ?? null },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await prisma.analyticsEvent.create({ data: { type: "COMMENT_ADDED", partId: pid, userId } }).catch(() => {});
    return res.status(201).json({ comment: serialize(comment) });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

function serialize(c: { id: string; body: string; createdAt: Date; parentId: string | null; user: { id: string; name: string | null; email: string | null }; replies?: unknown[] }): CommentRow {
  return {
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    parentId: c.parentId,
    user: c.user,
  };
}

export type { Prisma };
