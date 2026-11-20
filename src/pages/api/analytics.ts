import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { authSession } from "@/lib/auth";

const VALID_TYPES = new Set([
  "PAGE_VIEW",
  "READ_START",
  "READ_COMPLETE",
  "DOWNLOAD_ATTEMPT",
  "DOWNLOAD_BLOCKED",
  "SEARCH",
]);

/** Lightweight analytics ingest used by client beacons. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await authSession(req, res);
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const { type, path, partId, seriesId, meta } = req.body ?? {};
  if (typeof type !== "string" || !VALID_TYPES.has(type)) {
    return res.status(400).json({ error: "Invalid event type" });
  }

  try {
    await prisma.analyticsEvent.create({
      data: {
        type: type as never,
        path: typeof path === "string" ? path.slice(0, 200) : null,
        sessionId: null,
        userId,
        partId: typeof partId === "string" ? partId : null,
        seriesId: typeof seriesId === "string" ? seriesId : null,
        meta: (meta ?? undefined) as never,
      },
    });

    // Reading a part also counts as a PartView for read stats
    if (type === "READ_START" && typeof partId === "string") {
      await prisma.partView.create({ data: { partId, userId, sessionId: "web" } });
    }
    return res.status(202).json({ ok: true });
  } catch {
    return res.status(202).json({ ok: true }); // never fail the client over analytics
  }
}
