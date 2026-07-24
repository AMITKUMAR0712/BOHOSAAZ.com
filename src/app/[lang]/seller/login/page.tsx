import { redirect } from "next/navigation";

export default async function SellerLoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  redirect(`/${lang}/login?next=${encodeURIComponent(`/account/vendor-apply`)}`);
}
