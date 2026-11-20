import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-me",
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email.toLowerCase().trim() } });
        if (!user?.passwordHash || user.banned) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { id: string; role: string };
        token.id = u.id;
        token.role = u.role;
      }
      // Keep role fresh (admin may have been demoted)
      if (token.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string }, select: { role: true, banned: true } });
        if (!dbUser || dbUser.banned) {
          token.role = "READER";
        } else {
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
};

export async function authSession(...args: [] | [NextApiRequest, NextApiResponse]) {
  // Support both call shapes used in this codebase: app-router server components
  // (no args) and pages-router API routes (req, res).
  if (args.length === 0) return getServerSession(authOptions);
  const [req, res] = args;
  return getServerSession(req, res, authOptions);
}
