import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { authSession } from "@/lib/auth";
import { resolvePdfUrl } from "@/lib/r2";

export const config = { api: { responseLimit: false } };

/**
 * Read-only PDF streaming proxy.
 * - Auth required; the R2 URL is never exposed to the browser.
 * - Streamed inline with no-store so the viewer renders it on canvas.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await authSession(req, res);
  if (!session?.user) return res.status(401).json({ error: "Sign in to read" });

  const { partId } = req.query;
  if (typeof partId !== "string") return res.status(400).json({ error: "partId required" });

  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part || !part.published) return res.status(404).json({ error: "Not found" });

  const upstreamUrl = resolvePdfUrl(part.pdfUrl, part.pdfKey);

  try {
    const upstream = await fetch(upstreamUrl, { headers: { "User-Agent": "Walammi-Proxy" } });
    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ error: "PDF upstream unavailable" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="story.pdf"');
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200);

    const reader = upstream.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } catch {
      /* client disconnect */
    } finally {
      res.end();
    }
  } catch (e) {
    console.error("pdf proxy error", e);
    if (!res.headersSent) res.status(502).json({ error: "PDF upstream unavailable" });
  }
}
