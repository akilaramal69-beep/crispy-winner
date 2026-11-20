import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authSession } from "@/lib/auth";
import { resolvePdfUrl } from "@/lib/r2";
import PdfReader from "@/components/PdfReader";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ partId: string }> }) {
  const { partId } = await params;
  const part = await prisma.part.findUnique({ where: { id: partId }, include: { series: true } });
  return { title: part ? `${part.series.title} — Part ${part.order}: ${part.title}` : "Read" };
}

export default async function ReadPage({ params }: { params: Promise<{ partId: string }> }) {
  const { partId } = await params;
  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: { series: { select: { id: true, title: true, slug: true } } },
  });
  if (!part || !part.published) notFound();

  const session = await authSession();
  if (!session?.user) redirect(`/login?callbackUrl=/read/${partId}`);

  const siblings = await prisma.part.findMany({
    where: { seriesId: part.seriesId, published: true },
    orderBy: { order: "asc" },
    select: { id: true, order: true, title: true },
  });
  const idx = siblings.findIndex((s) => s.id === part.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const srcUrl = `/api/pdf/${part.id}`;

  return (
    <div className="sv-reader-page flex h-dvh flex-col bg-zinc-100">
      {/* Print fallback — content itself never prints */}
      <div className="sv-print-notice p-10 text-center text-lg text-zinc-700">
        Printing and downloading are disabled on Walammi. Reading is online-only.
      </div>

      <header className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Link href={`/series/${part.series.slug}`} className="shrink-0 rounded-lg border border-zinc-300 p-2 text-zinc-600 hover:bg-red-50 hover:text-red-700" aria-label="Back to series">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-zinc-900">{part.title}</p>
            <p className="truncate text-xs text-zinc-500">
              {part.series.title} · Part {part.order}
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 sm:inline-flex">
          <ShieldCheck size={13} /> Read-only
        </span>
      </header>

      <PdfReader
        partId={part.id}
        src={srcUrl}
        title={part.title}
        watermarkText={`${session.user?.name ?? session.user?.email ?? "Reader"} · Walammi`}
        prevPart={prev ? { id: prev.id, label: `Part ${prev.order}` } : null}
        nextPart={next ? { id: next.id, label: `Part ${next.order}` } : null}
        siblingCount={siblings.length}
        currentIdx={idx + 1}
      />

      {/* Hidden: real URL never referenced client-side */}
      <span className="hidden">{resolvePdfUrl(part.pdfUrl, part.pdfKey)}</span>
    </div>
  );
}

export const dynamic = "force-dynamic";
