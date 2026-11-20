"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { REACTIONS } from "@/lib/utils";

type Counts = Record<string, number>;
type Mine = Record<string, boolean>;

export default function ReactionBar({ partId, compact = false }: { partId: string; compact?: boolean }) {
  const [counts, setCounts] = useState<Counts>({});
  const [mine, setMine] = useState<Mine>({});
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/reactions?partId=${partId}`)
      .then((r) => r.json())
      .then((d: { counts?: Counts; mine?: Mine }) => {
        setCounts(d.counts ?? {});
        setMine(d.mine ?? {});
      })
      .catch(() => {});
  }, [partId]);

  async function toggle(kind: string) {
    const res = await fetch("/api/reactions", {
      method: mine[kind] ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partId, kind }),
    });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (!res.ok) return;
    const active = !mine[kind];
    setCounts((c) => ({ ...c, [kind]: Math.max(0, (c[kind] ?? 0) + (active ? 1 : -1)) }));
    setMine((m) => ({ ...m, [kind]: active }));
    setOpen(false);
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (compact) {
    return (
      <div className="relative flex items-center gap-1">
        {open && (
          <div className="absolute bottom-11 left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-full border border-zinc-200 bg-white p-1.5 shadow-xl">
            {REACTIONS.map((r) => (
              <button
                key={r.kind}
                onClick={() => toggle(r.kind)}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:scale-110 ${mine[r.kind] ? "bg-red-50" : ""}`}
                aria-label={r.label}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-red-50"
        >
          <span aria-hidden>💬</span>
          <span className="tabular-nums">{total}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTIONS.map((r) => {
        const on = !!mine[r.kind];
        const n = counts[r.kind] ?? 0;
        return (
          <button
            key={r.kind}
            onClick={() => toggle(r.kind)}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition ${
              on ? "border-red-500 bg-red-50 text-red-700" : "border-zinc-300 bg-white text-zinc-600 hover:bg-red-50"
            }`}
          >
            <span className="text-base" aria-hidden>{r.emoji}</span>
            <span className="tabular-nums">{n}</span>
            <span className="hidden sm:inline">{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}
