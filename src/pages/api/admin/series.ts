import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { authSession } from "@/lib/auth";
import { isAdmin } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { isValidHttpsUrl } from "@/lib/r2";

async function requireStaff(req: NextApiRequest, res: NextApiResponse) {
  const session = await authSession(req, res);
  if (!session?.user) {
    res.status(401).json({ error: "Sign in required" });
    return null;
  }
  const user = {
    id: (session.user as { id: string }).id,
    role: (session.user as { role: string }).role,
  };
  if (!isAdmin({ id: user.id, role: user.role as never, name: null, email: null })) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const staff = await requireStaff(req, res);
  if (!staff) return;

  // ── List series with counts ──
  if (req.method === "GET") {
    const series = await prisma.series.findMany({
      include: {
        _count: { select: { parts: true } },
        parts: { orderBy: { order: "desc" }, take: 1, select: { publishedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({
      series: series.map((s) => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        author: s.author,
        genre: s.genre,
        status: s.status,
        featured: s.featured,
        description: s.description,
        coverImage: s.coverImage,
        partCount: s._count.parts,
        lastPartAt: s.parts[0]?.publishedAt ?? null,
      })),
    });
  }

  // ── Create series ──
  if (req.method === "POST") {
    const { title, description, author, genre, coverImage, status, featured } = req.body ?? {};
    if (typeof title !== "string" || !title.trim()) return res.status(400).json({ error: "Title is required" });
    if (coverImage && typeof coverImage === "string" && !isValidHttpsUrl(coverImage)) {
      return res.status(400).json({ error: "Cover image must be a valid https URL" });
    }
    let slug = slugify(title);
    const clash = await prisma.series.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    const series = await prisma.series.create({
      data: {
        title: title.trim(),
        slug,
        description: typeof description === "string" ? description.trim() || null : null,
        author: typeof author === "string" ? author.trim() || null : null,
        genre: typeof genre === "string" && genre.trim() ? genre.trim() : null,
        coverImage: coverImage || null,
        status: ["ONGOING", "COMPLETED", "HIATUS"].includes(status) ? status : "ONGOING",
        featured: featured === true,
      },
    });
    return res.status(201).json({ series });
  }

  // ── Update series (feature / status / fields) ──
  if (req.method === "PATCH") {
    const { id, title, description, author, genre, coverImage, status, featured } = req.body ?? {};
    if (typeof id !== "string") return res.status(400).json({ error: "id required" });
    const data: Record<string, unknown> = {};
    if (typeof title === "string" && title.trim()) data.title = title.trim();
    if (typeof description === "string") data.description = description.trim() || null;
    if (typeof author === "string") data.author = author.trim() || null;
    if (typeof genre === "string") data.genre = genre.trim() || null;
    if (typeof coverImage === "string" && coverImage) {
      if (!isValidHttpsUrl(coverImage)) return res.status(400).json({ error: "Cover image must be a valid https URL" });
      data.coverImage = coverImage;
    }
    if (["ONGOING", "COMPLETED", "HIATUS"].includes(status)) data.status = status;
    if (typeof featured === "boolean") data.featured = featured;
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "Nothing to update" });
    try {
      const series = await prisma.series.update({ where: { id }, data: data as never });
      return res.status(200).json({ series });
    } catch {
      return res.status(404).json({ error: "Series not found" });
    }
  }

  // ── Delete series (cascades parts, comments, reactions, views) ──
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (typeof id !== "string") return res.status(400).json({ error: "id query param required" });
    try {
      await prisma.series.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(404).json({ error: "Series not found" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
