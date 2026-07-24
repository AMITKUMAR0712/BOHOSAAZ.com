import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

/**
 * Unprefixed `/admin` routes redirect to `/{lang}/admin` in middleware.
 * This layout stays sidebar-free so we never show a second/incomplete admin menu.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  if (!user) redirect(`/login?next=/admin`);

  return <>{children}</>;
}
