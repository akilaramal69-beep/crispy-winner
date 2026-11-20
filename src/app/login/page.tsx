"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    router.push(params.get("callbackUrl") || "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-100/60 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white"><BookOpen size={24} /></span>
          <h1 className="text-2xl font-bold text-zinc-900">Welcome back</h1>
          <p className="text-sm text-zinc-500">Sign in to read, react and comment</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-red-100/50">
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-zinc-600">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-zinc-600">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy && <Loader2 size={16} className="animate-spin" />} Sign in
          </button>
          <p className="text-center text-sm text-zinc-500">
            New here? <Link href="/register" className="font-semibold text-red-600 hover:underline">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
