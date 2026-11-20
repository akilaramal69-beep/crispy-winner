"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { BarChart3, BookOpen, LayoutList, LogOut, Menu, MessageSquare, ShieldCheck, Users, X } from "lucide-react";

const links = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/series", label: "Series & Parts", icon: LayoutList },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
];

export default function AdminNav({ userName, role, hiddenComments }: { userName: string; role: string; hiddenComments: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <span className="flex items-center gap-2 font-bold text-zinc-900">
          <ShieldCheck size={18} className="text-red-600" /> Admin
        </span>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg border border-zinc-300 p-2 text-zinc-700" aria-label="Toggle menu">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <aside
        className={`${open ? "block" : "hidden"} shrink-0 border-b border-zinc-200 bg-white px-3 py-4 lg:sticky lg:top-0 lg:block lg:h-dvh lg:w-64 lg:border-b-0 lg:border-r lg:px-4 lg:py-6`}
      >
        <div className="mb-6 hidden items-center gap-2 px-2 lg:flex">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white"><BookOpen size={18} /></span>
          <div>
            <p className="text-sm font-bold leading-tight text-zinc-900">Walammi</p>
            <p className="text-xs text-zinc-400">Admin dashboard</p>
          </div>
        </div>

        <nav className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : !!pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-red-600 text-white" : "text-zinc-600 hover:bg-red-50 hover:text-red-700"
                }`}
              >
                <Icon size={17} />
                {label}
                {href === "/admin/comments" && hiddenComments > 0 && (
                  <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">{hiddenComments}</span>
                )}
              </Link>
            );
          })}
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 hover:bg-red-50 hover:text-red-700">
            <BookOpen size={17} /> View public site
          </Link>
        </nav>

        <div className="mt-6 border-t border-zinc-200 pt-4">
          <p className="truncate px-3 text-xs text-zinc-400">Signed in as</p>
          <p className="truncate px-3 text-sm font-semibold text-zinc-900">{userName}</p>
          <p className="mb-3 px-3 text-xs capitalize text-red-600">{role.toLowerCase()}</p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
