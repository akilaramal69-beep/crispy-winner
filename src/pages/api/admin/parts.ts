import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { authSession } from "@/lib/auth";
import { isAdmin } from "@/lib/session";
import { isValidHttpsUrl, keyFromPublicUrl } from "@/lib/r2";

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

async function nextOrder(seriesId: string): Promise<number> {
  const last = await prisma.part.findFirst({ where: { seriesId }, orderBy: { order: "desc" }, select: { order: true } });
  return (last?.order ?? 0) + 1;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const staff = await requireStaff(req, res);
  if (!staff) return;

  // ── List parts for a series ──
  if (req.method === "GET") {
    const { seriesId } = req.query;
    if (typeof seriesId !== "string") return res.status(400).json({ error: "seriesId required" });
    const parts = await prisma.part.findMany({
      where: { seriesId },
      orderBy: { order: "asc" },
      include: { _count: { select: { comments: true, reactions: true, views: true } } },
    });
    return res.status(200).json({ parts });
  }

  // ── Create part (from an R2 public link) ──
  if (req.method === "POST") {
    const { seriesId, title, pdfUrl, order, summary, published } = req.body ?? {};
    if (typeof seriesId !== "string" || typeof title !== "string" || typeof pdfUrl !== "string") {
      return res.status(400).json({ error: "seriesId, title and pdfUrl are required" });
    }
    if (!isValidHttpsUrl(pdfUrl)) {
      return res.status(400).json({ error: "PDF link must be a valid https URL (e.g. your R2 public link)" });
    }
    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) return res.status(404).json({ error: "Series not found" });

    // If the URL is an R2 public link and private mode is on, store just the key
    const key = keyFromPublicUrl(pdfUrl);

    // Try to fetch page count / size for the dashboard
    let pageCount: number | null = null;
    let fileSizeKb: number | null = null;
    try {
      const head = await fetch(pdfUrl, { method: "GET", headers: { Range: "bytes=0-2047" } });
      const chunk = await head.arrayBuffer();
      fileSizeKb = Number(head.headers.get("content-length")) || null;
      const tail = new Uint8Array(chunk);
      const text = new TextDecoder("latin1").decode(tail);
      const m = text.match(/\/Count\s+(\d+)/);
      if (m) pageCount = parseInt(m[1], 10);
    } catch {
      /* metadata is best-effort only */
    }

    const part = await prisma.part.create({
      data: {
        seriesId,
        title: title.trim(),
        pdfUrl,
        pdfKey: key,
        order: typeof order === "number" && order > 0 ? order : await nextOrder(seriesId),
        summary: typeof summary === "string" ? summary.trim() || null : null,
        published: published !== false,
      },
    });
    return res.status(201).json({ part });
  }

  // ── Update part ──
  if (req.method === "PATCH") {
    const { id, title, summary, published, order, pdfUrl } = req.body ?? {};
    if (typeof id !== "string") return res.status(400).json({ error: "id required" });
    const data: Record<string, unknown> = {};
    if (typeof title === "string" && title.trim()) data.title = title.trim();
    if (typeof summary === "string") data.summary = summary.trim() || null;
    if (typeof published === "boolean") data.published = published;
    if (typeof order === "number" && order > 0) data.order = Math.floor(order);
    if (typeof pdfUrl === "string" && pdfUrl) {
      if (!isValidHttpsUrl(pdfUrl)) return res.status(400).json({ error: "Invalid pdf URL" });
      data.pdfUrl = pdfUrl;
      data.pdfKey = keyFromPublicUrl(pdfUrl);
    }
    try {
      const part = await prisma.part.update({ where: { id }, data: data as never });
      return res.status(200).json({ part });
    } catch {
      return res.status(404).json({ error: "Part not found" });
    }
  }

  // ── Delete part ──
  if (req.method === "DELETE") {
    const { id } = req.body ?? {};
    if (typeof id !== "string") return res.status(400).json({ error: "id required" });
    try {
      await prisma.part.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(404).json({ error: "Part not found" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
