"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Registration failed.");
      return;
    }
    router.push("/login?registered=1");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-100/60 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white"><BookOpen size={24} /></span>
          <h1 className="text-2xl font-bold text-zinc-900">Create your account</h1>
          <p className="text-sm text-zinc-500">Join Walammi to read and react</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-red-100/50">
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-semibold text-zinc-600">Name</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" placeholder="Your name" />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-zinc-600">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-zinc-600">Password (8+ characters)</label>
            <input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {busy && <Loader2 size={16} className="animate-spin" />} Create account
          </button>
          <p className="text-center text-sm text-zinc-500">
            Already registered? <Link href="/login" className="font-semibold text-red-600 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
