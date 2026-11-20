"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";

type UserRow = {
  id: string; name: string | null; email: string | null; role: string; banned: boolean; createdAt: string;
  _count: { comments: number; reactions: number; partViews: number };
};

export default function UserManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load users");
        setUsers(data.users);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function patch(id: string, patchBody: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patchBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...data.user } : u)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = users.filter(
    (u) =>
      !q ||
      (u.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Users</h1>
        <p className="text-sm text-zinc-500">Promote staff, demote or ban abusive accounts.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email…"
          className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
        />
      </div>

      {loading ? (
        <p className="p-6 text-zinc-500">Loading users…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className={`border-b border-zinc-100 ${u.banned ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                        {(u.name ?? u.email ?? "?")[0]?.toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-900">{u.name ?? "—"}</p>
                        <p className="truncate text-xs text-zinc-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">{formatDate(u.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                    {u._count.partViews} reads · {u._count.comments} 💬 · {u._count.reactions} 😀
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      u.role === "ADMIN" ? "bg-red-50 text-red-700" : u.role === "EDITOR" ? "bg-orange-50 text-orange-700" : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {u.role.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {busyId === u.id ? (
                        <Loader2 size={16} className="animate-spin text-zinc-400" />
                      ) : (
                        <>
                          <select
                            value={u.role}
                            onChange={(e) => patch(u.id, { role: e.target.value })}
                            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-red-500"
                            aria-label={`Role for ${u.name ?? u.email}`}
                          >
                            <option value="READER">Reader</option>
                            <option value="EDITOR">Editor</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          <button
                            onClick={() => patch(u.id, { banned: !u.banned })}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              u.banned ? "border-green-300 text-green-700 hover:bg-green-50" : "border-red-200 text-red-600 hover:bg-red-50"
                            }`}
                          >
                            {u.banned ? "Unban" : "Ban"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400">No users match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
