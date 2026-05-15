import { redirect } from "next/navigation";

export default async function AdminDashboardRedirect({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/admin`);
}
