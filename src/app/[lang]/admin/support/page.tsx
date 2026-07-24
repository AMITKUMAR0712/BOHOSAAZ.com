import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";

export default async function AdminSupportPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) redirect("/en/admin/support/tickets");

  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  redirect(`/${lang}/admin/support/tickets`);
}
