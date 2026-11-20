import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import PartActions from "@/components/PartActions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const series = await prisma.series.findUnique({ where: { slug } });
  return { title: series?.title ?? "Series" };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [series, session] = await Promise.all([
    prisma.series.findUnique({
      where: { slug },
      include: {
        parts: { where: { published: true }, orderBy: { order: "asc" }, include: { _count: { select: { comments: true, reactions: true, views: true } } } },
      },
    }),
    authSession(),
  ]);
  if (!series) notFound();

  const reactionCounts = await prisma.reaction.groupBy({ by: ["partId"], where: { partId: { in: series.parts.map((p) => p.id) } }, _count: true });
  const rcMap = new Map(reactionCounts.map((r) => [r.partId, r._count]));
  const isAuthed = !!session?.user;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
            </span>
            Walammi
          </Link>
          <nav className="flex items-center gap-2 text-sm sm:gap-4">
            <Link href="/browse" className="rounded-lg px-3 py-2 text-zinc-600 hover:bg-red-50 hover:text-red-700">Browse</Link>
            {isAuthed ? (
              <Link href="/account" className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700">My account</Link>
            ) : (
              <Link href="/login" className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700">Sign in</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="h-28 w-20 shrink-0 rounded-xl bg-gradient-to-br from-red-500 to-red-700" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {series.genre && <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700">{series.genre}</span>}
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600">{series.status.toLowerCase()}</span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold text-zinc-900 sm:text-4xl">{series.title}</h1>
              {series.author && <p className="mt-1 text-sm text-zinc-500">by {series.author}</p>}
              <p className="mt-3 max-w-2xl text-sm text-zinc-600">{series.description ?? "No description yet."}</p>
              <p className="mt-3 text-xs text-zinc-500">Started {formatDate(series.createdAt)} · {series.parts.length} published {series.parts.length === 1 ? "part" : "parts"}</p>
            </div>
          </div>
        </div>

        <h2 className="mb-4 text-lg font-bold sm:text-xl">Parts</h2>
        <ol className="space-y-3">
          {series.parts.map((part) => (
            <li key={part.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm font-bold text-red-600">{part.order}</span>
                    <Link href={`/read/${part.id}`} className="truncate font-semibold text-zinc-900 hover:text-red-600">{part.title}</Link>
                  </div>
                  <p className="mt-1.5 line-clamp-2 pl-10 text-sm text-zinc-500">{part.summary ?? "No summary."}</p>
                  <p className="mt-1.5 pl-10 text-xs text-zinc-400">
                    {formatDate(part.publishedAt)} · {part._count.views} reads · {part._count.comments} comments · {rcMap.get(part.id) ?? 0} reactions
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-10 sm:pl-0">
                  <PartActions partId={part.id} isAuthed={isAuthed} initialReactions={rcMap.get(part.id) ?? 0} />
                  <Link href={`/read/${part.id}`} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Read</Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
        {series.parts.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">No published parts yet.</p>
        )}
      </main>
    </div>
  );
}
