"use client";

import { useCallback, useEffect, useState } from "react";
import { EyeOff, Loader2, RotateCcw, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";

type CommentRow = {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  part: { id: string; title: string; order: number; series: { title: string } };
  user: { name: string | null; email: string | null };
};

export default function CommentManager() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "VISIBLE" | "HIDDEN">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments?status=${statusFilter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load comments");
      setComments(data.comments);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: "VISIBLE" | "HIDDEN") {
    const res = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setComments((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    }
  }

  async function remove(id: string) {
    if (!confirm("Permanently delete this comment?")) return;
    const res = await fetch("/api/admin/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setComments((cs) => cs.filter((c) => c.id !== id));
  }

  const filtered = comments.filter(
    (c) =>
      !q ||
      c.body.toLowerCase().includes(q.toLowerCase()) ||
      (c.user.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (c.user.email ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Comments</h1>
        <p className="text-sm text-zinc-500">Hide or delete comments that break your community rules.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search comments or users…"
            className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>
        <div className="flex rounded-xl border border-zinc-300 bg-white p-1">
          {(["ALL", "VISIBLE", "HIDDEN"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold ${statusFilter === s ? "bg-red-600 text-white" : "text-zinc-500 hover:text-zinc-800"}`}
            >
              {s === "ALL" ? "All" : s === "VISIBLE" ? "Visible" : "Hidden"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="p-6 text-zinc-500"><Loader2 size={16} className="mr-2 inline animate-spin" />Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">No comments found.</div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li key={c.id} className={`rounded-2xl border p-4 ${c.status === "HIDDEN" ? "border-zinc-200 bg-zinc-50 opacity-60" : "border-zinc-200 bg-white shadow-sm"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">{c.user.name ?? c.user.email}</span>
                <span>on</span>
                <span className="font-medium text-red-600">{c.part.series.title} · Part {c.part.order}</span>
                <span>· {formatDate(c.createdAt)}</span>
                {c.status === "HIDDEN" && <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-600">hidden</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-700">{c.body}</p>
              <div className="mt-3 flex gap-2">
                {c.status === "VISIBLE" ? (
                  <button onClick={() => setStatus(c.id, "HIDDEN")} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                    <EyeOff size={13} /> Hide
                  </button>
                ) : (
                  <button onClick={() => setStatus(c.id, "VISIBLE")} className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50">
                    <RotateCcw size={13} /> Unhide
                  </button>
                )}
                <button onClick={() => remove(c.id)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
