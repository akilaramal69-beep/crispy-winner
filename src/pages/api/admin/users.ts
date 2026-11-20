import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { authSession } from "@/lib/auth";
import { isAdminOnly } from "@/lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await authSession(req, res);
  if (!session?.user) return res.status(401).json({ error: "Sign in required" });
  const me = { id: (session.user as { id: string }).id, role: (session.user as { role: string }).role };
  if (!isAdminOnly({ id: me.id, role: me.role as never, name: null, email: null })) {
    return res.status(403).json({ error: "Admin-only action" });
  }

  if (req.method === "GET") {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        createdAt: true,
        _count: { select: { comments: true, reactions: true, partViews: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ users });
  }

  if (req.method === "PATCH") {
    const { id, role, banned } = req.body ?? {};
    if (typeof id !== "string") return res.status(400).json({ error: "id required" });
    if (id === me.id) return res.status(400).json({ error: "You cannot modify your own account here" });
    const data: Record<string, unknown> = {};
    if (role === "READER" || role === "EDITOR" || role === "ADMIN") data.role = role;
    if (typeof banned === "boolean") data.banned = banned;
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "Nothing to update" });
    try {
      const user = await prisma.user.update({ where: { id }, data: data as never, select: { id: true, role: true, banned: true } });
      return res.status(200).json({ user });
    } catch {
      return res.status(404).json({ error: "User not found" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
