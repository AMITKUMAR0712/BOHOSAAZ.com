import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import AdminSidebar from "./_components/AdminSidebar";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const user = await requireUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/admin`);
  if (user.role !== "ADMIN") redirect("/403");

  return (
    <div className="min-h-screen flex">
      <AdminSidebar lang={lang} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
