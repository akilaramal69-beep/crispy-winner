import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BookOpen, Flame, Layers, ShieldCheck, Users } from "lucide-react";
import SeriesCard from "@/components/SeriesCard";

async function getHomeData() {
  const [featured, latest, totals] = await Promise.all([
    prisma.series.findMany({ where: { parts: { some: { published: true } } }, include: { _count: { select: { parts: true } } }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 3 }),
    prisma.series.findMany({ where: { parts: { some: { published: true } } }, include: { _count: { select: { parts: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    Promise.all([
      prisma.series.count(),
      prisma.part.count({ where: { published: true } }),
      prisma.user.count(),
      prisma.partView.count(),
    ]),
  ]);
  return { featured: featured.filter((s) => s.featured), latest, totals };
}

export default async function HomePage() {
  const { featured, latest, totals } = await getHomeData();
  const [seriesCount, partCount, userCount, viewCount] = totals;
  const hero = featured[0] ?? latest[0];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white"><BookOpen size={18} /></span>
            Walammi
          </Link>
          <nav className="flex items-center gap-2 text-sm sm:gap-4">
            <Link href="/browse" className="rounded-lg px-3 py-2 text-zinc-600 hover:bg-red-50 hover:text-red-700">Browse</Link>
            <Link href="/login" className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <section className="mb-12 overflow-hidden rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 via-white to-red-100/60 p-6 sm:p-10">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
            <ShieldCheck size={14} /> Read-only — no downloads, ever
          </p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight text-zinc-900 sm:text-5xl">
            {hero ? <>Continue the journey: <span className="text-red-600">{hero.title}</span></> : "Read serialized stories, one part at a time"}
          </h1>
          <p className="mt-4 max-w-xl text-zinc-600">
            Every part opens in a secure in-browser reader. Follow your favourite series, react to plot twists
            and discuss them with other readers — right on the page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {hero && (
              <Link href={`/series/${hero.slug}`} className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700">
                {hero.featured ? "Read featured series" : "Start reading"}
              </Link>
            )}
            <Link href="/browse" className="rounded-xl border border-red-200 bg-white px-5 py-3 font-semibold text-red-700 hover:bg-red-50">
              Browse all series
            </Link>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Layers, label: "Series", value: seriesCount },
              { icon: BookOpen, label: "Parts", value: partCount },
              { icon: Users, label: "Readers", value: userCount },
              { icon: Flame, label: "Part reads", value: viewCount },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-red-100 bg-white/80 p-4 shadow-sm">
                <Icon className="mb-2 h-5 w-5 text-red-600" />
                <dd className="text-2xl font-bold text-zinc-900">{value}</dd>
                <dt className="text-xs text-zinc-500">{label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {featured.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-xl font-bold sm:text-2xl">Featured series</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((s) => <SeriesCard key={s.id} series={s} />)}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-xl font-bold sm:text-2xl">Latest series</h2>
          {latest.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
              No series yet. New stories are on the way!
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((s) => <SeriesCard key={s.id} series={s} />)}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500">
        Walammi · read stories online · downloads disabled
      </footer>
    </div>
  );
}
