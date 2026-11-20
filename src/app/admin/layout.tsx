import { redirect } from "next/navigation";
import { authSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import "../globals.css"; // ensure styles apply under the app router segment

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await authSession();
  if (!session?.user) redirect("/login?callbackUrl=/admin");

  const user = session.user as { id: string; role: string; name?: string | null; email?: string | null };
  if (user.role === "READER") redirect("/");

  const unreadReports = await prisma.comment.count({ where: { status: "HIDDEN" } }).catch(() => 0);

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 lg:flex-row">
      <AdminNav userName={user.name ?? user.email ?? "Admin"} role={user.role} hiddenComments={unreadReports} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
