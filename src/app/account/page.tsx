import Link from "next/link";
import { redirect } from "next/navigation";
import { authSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, timeAgo } from "@/lib/utils";
import SignOutButton from "@/components/SignOutButton";
import { BookOpen, LayoutDashboard, MessageSquare, ThumbsUp } from "lucide-react";

export const metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await authSession();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  const userId = (session.user as { id: string }).id;
  const [comments, reactions, views] = await Promise.all([
    prisma.comment.findMany({ where: { userId, status: "VISIBLE" }, orderBy: { createdAt: "desc" }, take: 10, include: { part: { select: { id: true, title: true, order: true, series: { select: { title: true, slug: true } } } } } }),
    prisma.reaction.count({ where: { userId } }),
    prisma.partView.count({ where: { userId } }),
  ]);
  const isStaff = (session.user as { role: string }).role !== "READER";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white"><BookOpen size={18} /></span>
            Walammi
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {isStaff && <Link href="/admin" className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-600 hover:bg-red-50">Dashboard</Link>}
            <Link href="/browse" className="rounded-lg px-3 py-2 text-zinc-600 hover:bg-red-50 hover:text-red-700">Browse</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-xl font-bold text-red-600">
              {(session.user.name ?? session.user.email ?? "?")[0]?.toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-bold text-zinc-900">{session.user.name ?? "Reader"}</h1>
              <p className="text-sm text-zinc-500">{session.user.email}</p>
              <p className="text-xs capitalize text-zinc-400">{(session.user as { role: string }).role.toLowerCase()}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <BookOpen className="mb-2 h-5 w-5 text-red-600" />
            <p className="text-2xl font-bold text-zinc-900">{views}</p>
            <p className="text-xs text-zinc-500">parts read</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <MessageSquare className="mb-2 h-5 w-5 text-red-600" />
            <p className="text-2xl font-bold text-zinc-900">{comments.length}</p>
            <p className="text-xs text-zinc-500">recent comments</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <ThumbsUp className="mb-2 h-5 w-5 text-red-600" />
            <p className="text-2xl font-bold text-zinc-900">{reactions}</p>
            <p className="text-xs text-zinc-500">reactions given</p>
          </div>
        </div>

        <h2 className="mb-4 text-lg font-bold">Your recent comments</h2>
        {comments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            You haven&apos;t commented yet. Find a story and join the discussion!
          </p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <Link href={`/read/${c.part.id}`} className="text-sm font-semibold text-red-600 hover:underline">
                  {c.part.series.title} · Part {c.part.order}
                </Link>
                <p className="mt-1 line-clamp-3 text-sm text-zinc-600">{c.body}</p>
                <p className="mt-2 text-xs text-zinc-400">{timeAgo(c.createdAt)} · {formatDate(c.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
