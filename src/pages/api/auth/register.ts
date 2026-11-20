import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
    return res.status(400).json({ error: "name, email and password are required" });
  }
  const normalized = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return res.status(400).json({ error: "Invalid email address" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (name.trim().length < 2 || name.trim().length > 60) return res.status(400).json({ error: "Name must be 2-60 characters" });

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: normalized, passwordHash },
    select: { id: true, name: true, email: true },
  });
  await prisma.analyticsEvent.create({ data: { type: "SIGNUP", userId: user.id } }).catch(() => {});
  return res.status(201).json({ user });
}
