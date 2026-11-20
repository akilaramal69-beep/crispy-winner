"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Lock, MessageSquare, ThumbsUp } from "lucide-react";
import CommentSection from "@/components/CommentSection";
import ReactionBar from "@/components/ReactionBar";

type Sibling = { id: string; label: string } | null;

const PAGE_SIZES = [
  { id: "fit", label: "Fit" },
  { id: "1x", label: "100%" },
  { id: "1.5x", label: "150%" },
  { id: "2x", label: "200%" },
] as const;

export default function PdfReader({
  partId,
  src,
  title,
  watermarkText,
  prevPart,
  nextPart,
  siblingCount,
  currentIdx,
}: {
  partId: string;
  src: string;
  title: string;
  watermarkText: string;
  prevPart: Sibling;
  nextPart: Sibling;
  siblingCount: number;
  currentIdx: number;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<(typeof PAGE_SIZES)[number]["id"]>("fit");
  const [showComments, setShowComments] = useState(false);
  const [blockNotice, setBlockNotice] = useState<string | null>(null);
  const [startLogged, setStartLogged] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const blockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfDocRef = useRef<PdfDoc | null>(null);

  // Re-render "fit" zoom when the viewport changes size (rotate / resize).
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (zoom !== "fit" || !pdfDocRef.current) return;
        const pdf = pdfDocRef.current;
        const container = pagesRef.current;
        if (!container) return;
        const scroller = container.parentElement!;
        (async () => {
          container.replaceChildren();
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const wrapper = document.createElement("div");
            wrapper.className = "sv-page relative mx-auto mb-4 shadow-2xl";
            const canvas = document.createElement("canvas");
            canvas.className = "block";
            wrapper.appendChild(canvas);
            container.appendChild(wrapper);
            const cssW = scroller.clientWidth - 16;
            const viewport0 = page.getViewport({ scale: 1 });
            const scale = Math.max(0.3, Math.min(cssW / viewport0.width, 3));
            const viewport = page.getViewport({ scale });
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(viewport.width * dpr);
            canvas.height = Math.floor(viewport.height * dpr);
            canvas.style.width = `${Math.floor(viewport.width)}px`;
            canvas.style.height = `${Math.floor(viewport.height)}px`;
            await page.render({ canvasContext: canvas.getContext("2d")!, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined }).promise;
            const wm = document.createElement("div");
            wm.className = "pointer-events-none absolute inset-0 select-none";
            wm.style.cssText =
              "display:flex;align-items:center;justify-content:center;transform:rotate(-30deg);font-size:clamp(10px,2vw,16px);color:rgba(220,38,38,0.10);font-weight:700;text-align:center;line-height:2;";
            wm.textContent = `${watermarkText} · ${watermarkText}`;
            wrapper.appendChild(wm);
          }
        })();
      }, 250);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // ── Load pdf.js from a local copy under /public/vendor (no CDN) ──
  useEffect(() => {
    let cancelled = false;

    // Inject a module script that imports the vendored pdf.js and exposes it on window.
    // (Inline textContent keeps the import out of webpack's module graph.)
    function loadLib(): Promise<PdfJsLib> {
      const w = window as unknown as { pdfjsLib?: PdfJsLib };
      if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.type = "module";
        s.textContent = `import * as pdfjs from "/vendor/pdf.mjs"; window.pdfjsLib = pdfjs;`;
        document.head.appendChild(s);
        const started = Date.now();
        const poll = setInterval(() => {
          if (w.pdfjsLib) {
            clearInterval(poll);
            resolve(w.pdfjsLib);
          } else if (Date.now() - started > 8000) {
            clearInterval(poll);
            reject(new Error("pdf.js load timeout"));
          }
        }, 50);
      });
    }

    async function boot() {
      const lib = await loadLib();
      lib.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.mjs";
      const task = lib.getDocument({ url: src, withCredentials: true });
      const pdf = await task.promise;
      if (cancelled) return;
      pdfDocRef.current = pdf;
      // Render everything imperatively BEFORE any state update, so React never
      // re-renders while we are mutating the unmanaged DOM node.
      await renderAll(pdf);
      if (!cancelled) setNumPages(pdf.numPages);
    }

    async function renderAll(pdf: PdfDoc) {
      // Pages are rendered imperatively into a nested div that React never owns,
      // so React's reconciliation can't fight the manual DOM writes.
      let container = pagesRef.current;
      if (!container) return;
      container.replaceChildren();
      const scroller = container.parentElement!;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const wrapper = document.createElement("div");
        wrapper.className = "sv-page relative mx-auto mb-4 shadow-2xl";
        const canvas = document.createElement("canvas");
        canvas.className = "block";
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        const cssW = scroller.clientWidth - 16;
        const viewport0 = page.getViewport({ scale: 1 });
        const scale = zoom === "fit" ? Math.max(0.3, Math.min(cssW / viewport0.width, 3)) : parseFloat(zoom);
        const viewport = page.getViewport({ scale });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined }).promise;
        // watermark per page
        const wm = document.createElement("div");
        wm.className = "pointer-events-none absolute inset-0 select-none";
        wm.style.cssText =
          "display:flex;align-items:center;justify-content:center;transform:rotate(-30deg);font-size:clamp(10px,2vw,16px);color:rgba(220,38,38,0.10);font-weight:700;text-align:center;line-height:2;";
        wm.textContent = `${watermarkText} · ${watermarkText}`;
        wrapper.appendChild(wm);
      }
      // All pages drawn — now flip React state once (removes the spinner).
      if (!cancelled) setLoaded(true);
      if (!startLogged) {
        setStartLogged(true);
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "READ_START", partId }),
        }).catch(() => {});
      }
    }

    boot().catch((e) => {
      console.error(e);
      if (!cancelled) setError("Could not load this PDF. Please try again.");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, zoom]);

  // ── Read-only enforcement ──
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      flash("Copying is disabled — reading is online-only.");
    };
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      flash("Right-click is disabled in the reader.");
    };
    const onDrag = (e: DragEvent) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const combo = (e.ctrlKey || e.metaKey) && ["s", "p", "u", "a", "c"].includes(k);
      if (combo) {
        e.preventDefault();
        flash(k === "p" ? "Printing is disabled." : "Downloads and copying are disabled.");
      }
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function flash(msg: string) {
    setBlockNotice(msg);
    if (blockTimer.current) clearTimeout(blockTimer.current);
    blockTimer.current = setTimeout(() => setBlockNotice(null), 2200);
  }

  // Log blocked download attempts (long-press / menu)
  useEffect(() => {
    if (!blockNotice) return;
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DOWNLOAD_ATTEMPT", partId, meta: { notice: blockNotice } }),
    }).catch(() => {});
  }, [blockNotice, partId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-2 sm:px-5">
        <div className="flex items-center gap-2 text-xs text-zinc-500 sm:text-sm">
          <Lock size={13} className="text-red-600" />
          <span>{numPages ? `${numPages} pages · ${currentIdx}/${siblingCount}` : "Loading…"}</span>
        </div>
        <div className="flex items-center gap-1">
          {PAGE_SIZES.map((z) => (
            <button
              key={z.id}
              onClick={() => setZoom(z.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${zoom === z.id ? "bg-red-600 text-white" : "text-zinc-600 hover:bg-red-50 hover:text-red-700"}`}
            >
              {z.label}
            </button>
          ))}
          <button
            onClick={() => setShowComments(true)}
            className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-red-50"
          >
            <MessageSquare size={13} /> Comments
          </button>
        </div>
      </div>

      {/* Pages: React-owned scroller -> unmanaged inner div for pdf.js canvases */}
      <div ref={containerRef} className="sv-scroll sv-readonly relative min-h-0 flex-1 overflow-auto bg-zinc-200/60 p-2 sm:p-4">
        <div ref={pagesRef} />
        {!loaded && !error && (
          <div className="flex h-full items-center justify-center gap-2 text-zinc-500">
            <Loader2 className="animate-spin" size={20} /> Loading story…
          </div>
        )}
        {error && <div className="flex h-full items-center justify-center p-8 text-center text-red-600">{error}</div>}
      </div>

      {/* Prev / next */}
      <div className="flex items-center justify-between gap-2 border-t border-zinc-200 bg-white px-3 py-2.5 sm:px-5">
        {prevPart ? (
          <Link href={`/read/${prevPart.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-red-50 hover:text-red-700 sm:text-sm">
            <ChevronLeft size={15} /> {prevPart.label}
          </Link>
        ) : <span />}
        <ReactionBar partId={partId} compact />
        {nextPart ? (
          <Link href={`/read/${nextPart.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 sm:text-sm">
            {nextPart.label} <ChevronRight size={15} />
          </Link>
        ) : (
          <span className="text-xs text-zinc-400">You&apos;re at the latest part</span>
        )}
      </div>

      {/* Blocked-action toast */}
      {blockNotice && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 mx-auto w-fit rounded-full border border-red-200 bg-white px-4 py-2 text-sm text-red-700 shadow-xl">
          {blockNotice}
        </div>
      )}

      {/* Comments drawer */}
      {showComments && <CommentSection partId={partId} onClose={() => setShowComments(false)} />}
    </div>
  );
}

/* pdf.js type shims */
type PdfViewport = { width: number; height: number };
type PdfPage = {
  getViewport: (o: { scale: number }) => PdfViewport;
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport; transform?: number[] }) => { promise: Promise<void> };
};
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (o: unknown) => { promise: Promise<PdfDoc> };
};
