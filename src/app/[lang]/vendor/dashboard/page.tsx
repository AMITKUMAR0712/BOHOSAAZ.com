import { redirect } from "next/navigation";

export default async function VendorDashboardRedirect({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/vendor`);
}
