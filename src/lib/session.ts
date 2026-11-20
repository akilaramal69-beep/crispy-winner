import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession, type DefaultSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
} | null;

export async function getSessionUser(req?: NextApiRequest, res?: NextApiResponse): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  const user = session?.user as (DefaultSession["user"] & { id?: string; role?: Role }) | undefined;
  if (!user) return null;
  return {
    id: (user.id as string) ?? "anonymous",
    name: user.name ?? null,
    email: user.email ?? null,
    role: user.role ?? Role.READER,
  };
}

export function isAdmin(user: SessionUser): boolean {
  return !!user && (user.role === "ADMIN" || user.role === "EDITOR");
}

export function isAdminOnly(user: SessionUser): boolean {
  return !!user && user.role === "ADMIN";
}

/** Standard JSON error helper */
export function apiError(res: NextApiResponse, status: number, message: string) {
  return res.status(status).json({ error: message });
}
