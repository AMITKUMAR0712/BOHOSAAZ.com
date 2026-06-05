import { redirect } from "next/navigation";

export default async function SellerRegisterPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  redirect(`/${lang}/register?next=${encodeURIComponent(`/${lang}/account/vendor-apply`)}`);
}
