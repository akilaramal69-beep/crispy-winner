import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SeriesCard from "@/components/SeriesCard";
import { Search } from "lucide-react";

export const metadata = { title: "Browse" };

type SearchParams = Promise<{ q?: string; genre?: string }>;

async function getSeries(q?: string, genre?: string) {
  return prisma.series.findMany({
    where: {
      parts: { some: { published: true } },
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
          { author: { contains: q, mode: "insensitive" as const } },
        ],
      }),
      ...(genre && { genre }),
    },
    include: { _count: { select: { parts: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function getGenres() {
  const rows = await prisma.series.findMany({ where: { parts: { some: { published: true } } }, select: { genre: true }, distinct: ["genre"] });
  return rows.map((r) => r.genre).filter((g): g is string => !!g);
}

export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const { q, genre } = await searchParams;
  const [series, genres] = await Promise.all([getSeries(q, genre), getGenres()]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold"><BookIcon /> Walammi</Link>
          <nav className="flex items-center gap-2 text-sm sm:gap-4">
            <Link href="/browse" className="rounded-lg px-3 py-2 text-zinc-600 hover:bg-red-50 hover:text-red-700">Browse</Link>
            <Link href="/login" className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Browse series</h1>

        <form className="mt-6 flex flex-col gap-3 sm:flex-row" action="/browse">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search title, author or description…"
              className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <select name="genre" defaultValue={genre ?? ""} className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100">
            <option value="">All genres</option>
            {genres.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button className="rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700">Search</button>
        </form>

        <p className="mt-4 text-sm text-zinc-500">{series.length} {series.length === 1 ? "series" : "series"} found</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => <SeriesCard key={s.id} series={s} />)}
        </div>
        {series.length === 0 && (
          <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
            Nothing matches your search.
          </p>
        )}
      </main>
    </div>
  );
}

function BookIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
    </span>
  );
}
