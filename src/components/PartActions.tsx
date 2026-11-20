"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Compact reaction bar used on series part lists.
 * Optimistically toggles the LIKE reaction via the API.
 */
export default function PartActions({ partId, isAuthed, initialReactions }: { partId: string; isAuthed: boolean; initialReactions: number }) {
  const [count, setCount] = useState(initialReactions);
  const [mine, setMine] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function react() {
    if (!isAuthed || busy) {
      if (!isAuthed) router.push("/login");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reactions", {
        method: mine ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partId, kind: "LIKE" }),
      });
      if (res.ok) {
        setMine(!mine);
        setCount((c) => c + (mine ? -1 : 1));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={react}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
        mine ? "border-red-500 bg-red-50 text-red-600" : "border-zinc-300 bg-white text-zinc-600 hover:bg-red-50 hover:text-red-700"
      }`}
      aria-pressed={mine}
    >
      <span aria-hidden>👍</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
