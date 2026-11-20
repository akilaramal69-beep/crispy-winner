import Link from "next/link";
import type { Series } from "@prisma/client";

type SeriesWithCount = Series & { _count: { parts: number } };

export default function SeriesCard({ series }: { series: SeriesWithCount }) {
  return (
    <Link
      href={`/series/${series.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-red-300 hover:shadow-lg hover:shadow-red-100"
    >
      <div
        className="flex h-36 items-end bg-gradient-to-br from-red-500 via-red-600 to-red-700 p-4"
        style={series.coverImage ? { backgroundImage: `url(${series.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-red-700 backdrop-blur">
          {series._count.parts} {series._count.parts === 1 ? "part" : "parts"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-bold text-zinc-900 group-hover:text-red-600">{series.title}</h3>
        {series.author && <p className="text-xs text-zinc-400">by {series.author}</p>}
        <p className="line-clamp-2 text-sm text-zinc-500">{series.description ?? "No description yet."}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2 text-xs">
          {series.genre && <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">{series.genre}</span>}
          <span className={`rounded-full px-2 py-0.5 font-medium ${series.status === "COMPLETED" ? "bg-green-50 text-green-700" : series.status === "HIATUS" ? "bg-zinc-100 text-zinc-600" : "bg-red-50 text-red-700"}`}>
            {series.status.toLowerCase()}
          </span>
        </div>
      </div>
    </Link>
  );
}
