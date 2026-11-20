"use client";

import { useEffect, useState } from "react";
import { Activity, BookOpen, Download, Eye, MessageSquare, SmilePlus, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber, timeAgo } from "@/lib/utils";

type Stats = {
  totals: {
    series: number; parts: number; publishedParts: number; users: number;
    views: number; comments: number; reactions: number; downloadAttempts: number;
  };
  traffic: { days: string[]; views: number[]; signups: number[] };
  topParts: { id: string; title: string; seriesTitle: string; views: number }[];
  topSeries: { id: string; title: string; slug: string; views: number }[];
  recentUsers: { id: string; name: string | null; email: string | null; role: string; createdAt: string }[];
  reactionBreakdown: Record<string, number>;
  recentEvents: { id: string; type: string; createdAt: string; user: string }[];
};

const REACTION_EMOJI: Record<string, string> = { LIKE: "👍", LOVE: "❤️", WOW: "😮", SAD: "😢", FIRE: "🔥" };
const PIE_COLORS = ["#dc2626", "#f87171", "#fb923c", "#0d9488", "#64748b"];

const tooltipStyle = { background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: 12, color: "#18181b", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" } as const;

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Failed to load stats");
        return r.json();
      })
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">{error}</div>;
  if (!stats) return <div className="p-6 text-zinc-500">Loading stats…</div>;

  const trafficData = stats.traffic.days.map((d, i) => ({ day: d, views: stats.traffic.views[i], signups: stats.traffic.signups[i] }));
  const reactionData = Object.entries(stats.reactionBreakdown).map(([kind, n]) => ({ name: kind, value: n, emoji: REACTION_EMOJI[kind] ?? kind }));

  const cards = [
    { icon: Users, label: "Total users", value: stats.totals.users, sub: "registered readers" },
    { icon: Eye, label: "Total part reads", value: stats.totals.views, sub: "all time" },
    { icon: BookOpen, label: "Series", value: stats.totals.series, sub: `${stats.totals.publishedParts} published parts` },
    { icon: MessageSquare, label: "Comments", value: stats.totals.comments, sub: "visible" },
    { icon: SmilePlus, label: "Reactions", value: stats.totals.reactions, sub: "all time" },
    { icon: Download, label: "Download attempts", value: stats.totals.downloadAttempts, sub: "blocked & logged" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Overview</h1>
        <p className="text-sm text-zinc-500">Traffic, engagement and content at a glance (last 14 days on charts).</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <Icon className="mb-2 h-5 w-5 text-red-600" />
            <p className="text-2xl font-bold text-zinc-900">{formatNumber(value)}</p>
            <p className="text-xs font-medium text-zinc-700">{label}</p>
            <p className="text-[11px] text-zinc-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Traffic chart */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-zinc-900"><TrendingUp size={17} className="text-red-600" /> Traffic — reads & signups</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="day" stroke="#a1a1aa" fontSize={11} tickLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="views" name="Part reads" stroke="#dc2626" fill="url(#gViews)" strokeWidth={2} />
              <Area type="monotone" dataKey="signups" name="Signups" stroke="#0d9488" fill="url(#gSignups)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top parts */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 font-bold text-zinc-900">Most-read parts</h2>
          {stats.topParts.length === 0 ? (
            <p className="text-sm text-zinc-400">No reads recorded yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topParts} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                  <XAxis type="number" stroke="#a1a1aa" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="title" stroke="#a1a1aa" fontSize={10} width={140} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="views" name="Reads" fill="#dc2626" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Reactions */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 font-bold text-zinc-900">Reactions breakdown</h2>
          {reactionData.length === 0 ? (
            <p className="text-sm text-zinc-400">No reactions yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={reactionData} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={4}>
                    {reactionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend formatter={(v: string) => `${REACTION_EMOJI[v] ?? ""} ${v}`} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent users */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 font-bold text-zinc-900">Newest users</h2>
          <ul className="space-y-2">
            {stats.recentUsers.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                  {(u.name ?? u.email ?? "?")[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{u.name ?? "—"}</p>
                  <p className="truncate text-xs text-zinc-400">{u.email}</p>
                </div>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{u.role.toLowerCase()}</span>
                <span className="hidden text-xs text-zinc-400 sm:block">{timeAgo(u.createdAt)}</span>
              </li>
            ))}
            {stats.recentUsers.length === 0 && <li className="text-sm text-zinc-400">No users yet.</li>}
          </ul>
        </div>

        {/* Recent events */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-zinc-900"><Activity size={16} className="text-red-600" /> Recent activity</h2>
          <ul className="space-y-1.5">
            {stats.recentEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50/60 px-3 py-2 text-sm">
                <span className="truncate">
                  <span className="font-medium text-red-600">{prettyType(e.type)}</span>
                  <span className="text-zinc-500"> · {e.user}</span>
                </span>
                <span className="shrink-0 text-xs text-zinc-400">{timeAgo(e.createdAt)}</span>
              </li>
            ))}
            {stats.recentEvents.length === 0 && <li className="text-sm text-zinc-400">No events yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function prettyType(t: string): string {
  return t
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}
