"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type SeriesRow = {
  id: string; title: string; slug: string; author: string | null; genre: string | null;
  status: string; featured: boolean; description: string | null; coverImage: string | null;
  partCount: number; lastPartAt: string | null;
};

type PartRow = {
  id: string; title: string; order: number; pdfUrl: string; published: boolean;
  summary: string | null; pageCount: number | null; publishedAt: string;
  _count: { comments: number; reactions: number; views: number };
};

const EMPTY_SERIES = { title: "", author: "", genre: "", description: "", coverImage: "", status: "ONGOING", featured: false };
const EMPTY_PART = { title: "", pdfUrl: "", summary: "", published: true, order: 0 };

export default function SeriesManager() {
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [seriesForm, setSeriesForm] = useState({ ...EMPTY_SERIES });
  const [savingSeries, setSavingSeries] = useState(false);

  const [partForms, setPartForms] = useState<Record<string, typeof EMPTY_PART>>({});
  const [savingPart, setSavingPart] = useState<string | null>(null);
  const [editingPart, setEditingPart] = useState<PartRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/series");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setSeries(data.series);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSeries(e: React.FormEvent) {
    e.preventDefault();
    setSavingSeries(true);
    try {
      const res = await fetch("/api/admin/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seriesForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create series");
      setShowSeriesForm(false);
      setSeriesForm({ ...EMPTY_SERIES });
      await load();
      setExpanded(data.series.id);
      setNotice(`Series "${data.series.title}" created — add its parts below.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create series");
    } finally {
      setSavingSeries(false);
    }
  }

  async function savePart(seriesId: string) {
    const form = partForms[seriesId] ?? { ...EMPTY_PART };
    if (!form.title.trim() || !form.pdfUrl.trim()) {
      setError("Part title and story link are both required.");
      return;
    }
    setSavingPart(seriesId);
    try {
      const res = await fetch("/api/admin/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, seriesId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add part");
      setPartForms((f) => ({ ...f, [seriesId]: { ...EMPTY_PART } }));
      setNotice(`Part "${data.part.title}" added.`);
      setError(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add part");
    } finally {
      setSavingPart(null);
    }
  }

  async function updatePart(id: string, patch: Record<string, unknown>) {
    const res = await fetch("/api/admin/parts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Update failed");
      return;
    }
    setNotice("Part updated.");
    await load();
  }

  async function deletePart(id: string) {
    if (!confirm("Delete this part? Its comments, reactions and view stats will be removed too.")) return;
    const res = await fetch("/api/admin/parts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { setNotice("Part deleted."); await load(); }
  }

  async function deleteSeries(id: string) {
    if (!confirm("Delete this series and ALL its parts? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/series?id=${id}`, { method: "DELETE" });
    if (res.ok) { setNotice("Series deleted."); setExpanded(null); await load(); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Series & Parts</h1>
          <p className="text-sm text-zinc-500">Create a series, then add each part with its story link.</p>
        </div>
        <button
          onClick={() => { setShowSeriesForm((s) => !s); }}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          <Plus size={16} /> New series
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error} <button className="underline" onClick={() => setError(null)}>dismiss</button></div>}
      {notice && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice} <button className="underline" onClick={() => setNotice(null)}>dismiss</button></div>}

      {/* New series form */}
      {showSeriesForm && (
        <form onSubmit={saveSeries} className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <h2 className="font-bold text-zinc-900">New series</h2>
          </div>
          <Field label="Title *"><input required value={seriesForm.title} onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })} className={inputCls} placeholder="The Lighthouse Keeper" /></Field>
          <Field label="Author"><input value={seriesForm.author} onChange={(e) => setSeriesForm({ ...seriesForm, author: e.target.value })} className={inputCls} placeholder="A. N. Author" /></Field>
          <Field label="Genre"><input value={seriesForm.genre} onChange={(e) => setSeriesForm({ ...seriesForm, genre: e.target.value })} className={inputCls} placeholder="Mystery" /></Field>
          <Field label="Status">
            <select value={seriesForm.status} onChange={(e) => setSeriesForm({ ...seriesForm, status: e.target.value })} className={inputCls}>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="HIATUS">Hiatus</option>
            </select>
          </Field>
          <Field label="Cover image URL (https)"><input value={seriesForm.coverImage} onChange={(e) => setSeriesForm({ ...seriesForm, coverImage: e.target.value })} className={inputCls} placeholder="https://example.com/covers/keeper.jpg" /></Field>
          <label className="flex items-center gap-2 self-end text-sm text-zinc-700">
            <input type="checkbox" checked={seriesForm.featured} onChange={(e) => setSeriesForm({ ...seriesForm, featured: e.target.checked })} className="h-4 w-4 accent-red-600" />
            Featured on home page
          </label>
          <div className="sm:col-span-2">
            <Field label="Description"><textarea rows={3} value={seriesForm.description} onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })} className={inputCls} placeholder="A short blurb for readers…" /></Field>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={savingSeries} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {savingSeries && <Loader2 size={15} className="animate-spin" />} Create series
            </button>
            <button type="button" onClick={() => setShowSeriesForm(false)} className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Cancel</button>
          </div>
        </form>
      )}

      {/* Series list */}
      {loading ? (
        <p className="p-6 text-zinc-500">Loading…</p>
      ) : series.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
          No series yet. Create your first series, then add its parts.
        </div>
      ) : (
        <ul className="space-y-3">
          {series.map((s) => {
            const isOpen = expanded === s.id;
            const pf = partForms[s.id] ?? { ...EMPTY_PART };
            return (
              <li key={s.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <button onClick={() => setExpanded(isOpen ? null : s.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <ChevronDown size={18} className={`shrink-0 text-zinc-400 transition ${isOpen ? "rotate-180" : ""}`} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900">
                        {s.title}
                        {s.featured && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">FEATURED</span>}
                      </p>
                      <p className="truncate text-xs text-zinc-400">
                        {s.partCount} parts · {s.author ?? "unknown author"} · {s.genre ?? "no genre"} · updated {formatDate(s.lastPartAt)}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
                    <Link href={`/series/${s.slug}`} className="rounded-lg border border-zinc-300 p-2 text-zinc-600 hover:bg-red-50 hover:text-red-700" aria-label="View public page"><ExternalLink size={15} /></Link>
                    <button onClick={() => deleteSeries(s.id)} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50" aria-label="Delete series"><Trash2 size={15} /></button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-zinc-200 p-4">
                    <PartsList seriesId={s.id} onEdit={setEditingPart} onDelete={deletePart} onUpdate={updatePart} />

                    {/* Add part form */}
                    <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 p-4">
                      <h3 className="mb-3 text-sm font-bold text-zinc-900">Add a part</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Part title *"><input value={pf.title} onChange={(e) => setPartForms({ ...partForms, [s.id]: { ...pf, title: e.target.value } })} className={inputCls} placeholder="Part 1 — The Storm" /></Field>
                        <Field label="Story file link * (https)">
                          <input value={pf.pdfUrl} onChange={(e) => setPartForms({ ...partForms, [s.id]: { ...pf, pdfUrl: e.target.value } })} className={inputCls} placeholder="https://example.com/stories/keeper/part-1.pdf" />
                        </Field>
                        <div className="sm:col-span-2">
                          <Field label="Summary"><textarea rows={2} value={pf.summary} onChange={(e) => setPartForms({ ...partForms, [s.id]: { ...pf, summary: e.target.value } })} className={inputCls} placeholder="What happens in this part…" /></Field>
                        </div>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700">
                        <input type="checkbox" checked={pf.published} onChange={(e) => setPartForms({ ...partForms, [s.id]: { ...pf, published: e.target.checked } })} className="h-4 w-4 accent-red-600" />
                        Publish immediately
                      </label>
                      <button
                        onClick={() => savePart(s.id)}
                        disabled={savingPart === s.id}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {savingPart === s.id ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add part
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Edit part modal */}
      {editingPart && (
        <EditPartModal
          part={editingPart}
          onClose={() => setEditingPart(null)}
          onSave={async (patch) => { await updatePart(editingPart.id, patch); setEditingPart(null); }}
        />
      )}
    </div>
  );
}

function PartsList({ seriesId, onEdit, onDelete, onUpdate }: { seriesId: string; onEdit: (p: PartRow) => void; onDelete: (id: string) => void; onUpdate: (id: string, patch: Record<string, unknown>) => void }) {
  const [parts, setParts] = useState<PartRow[]>([]);

  useEffect(() => {
    fetch(`/api/admin/parts?seriesId=${seriesId}`)
      .then((r) => r.json())
      .then((d) => setParts(d.parts ?? []))
      .catch(() => setParts([]));
  }, [seriesId]);

  if (parts.length === 0) return <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">No parts yet — add the first one below.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400">
            <th className="px-2 py-2">#</th>
            <th className="px-2 py-2">Title</th>
            <th className="px-2 py-2">Stats</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => (
            <tr key={p.id} className="border-b border-zinc-100">
              <td className="px-2 py-2.5 font-bold text-red-600">{p.order}</td>
              <td className="max-w-[220px] px-2 py-2.5">
                <p className="truncate font-medium text-zinc-900">{p.title}</p>
                <p className="truncate text-xs text-zinc-400">{p.pdfUrl}</p>
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-xs text-zinc-500">
                {p._count.views} reads · {p._count.comments} 💬 · {p._count.reactions} 😀
              </td>
              <td className="px-2 py-2.5">
                <button
                  onClick={() => onUpdate(p.id, { published: !p.published })}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${p.published ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500"}`}
                >
                  {p.published ? "Published" : "Draft"}
                </button>
              </td>
              <td className="px-2 py-2.5">
                <div className="flex justify-end gap-1.5">
                  <button onClick={() => onEdit(p)} className="rounded-lg border border-zinc-300 p-2 text-zinc-600 hover:bg-red-50 hover:text-red-700" aria-label="Edit part"><Pencil size={14} /></button>
                  <button onClick={() => onDelete(p.id)} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50" aria-label="Delete part"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditPartModal({ part, onClose, onSave }: { part: PartRow; onClose: () => void; onSave: (patch: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState(part.title);
  const [summary, setSummary] = useState(part.summary ?? "");
  const [pdfUrl, setPdfUrl] = useState(part.pdfUrl);
  const [order, setOrder] = useState(part.order);
  const [published, setPublished] = useState(part.published);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Edit part {part.order}</h2>
        {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
        <div className="space-y-3">
          <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></Field>
          <Field label="Story file link (https)"><input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} className={inputCls} /></Field>
          <Field label={`Order (current ${part.order})`}>
            <input type="number" min={1} value={order} onChange={(e) => setOrder(parseInt(e.target.value, 10) || 1)} className={inputCls} />
          </Field>
          <Field label="Summary"><textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} /></Field>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-red-600" /> Published
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Cancel</button>
          <button
            onClick={() => {
              if (!/^(https|http):\/\/|^https:\/\//.test(pdfUrl) && !pdfUrl.startsWith("http://localhost")) { setErr("Story link must start with https://"); return; }
              onSave({ title, summary, pdfUrl, order, published });
            }}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-zinc-600">{label}</span>
      {children}
    </label>
  );
}
