import { isLocale } from "@/lib/i18n";
import { CouponCapture } from "@/components/CouponCapture";
import { redirect } from "next/navigation";

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  // Safety-net: if someone hits a non-locale root like /seller (without /en),
  // we redirect instead of crashing the app.
  if (!isLocale(lang)) redirect("/en");

  return (
    <>
      <CouponCapture />
      {children}
    </>
  );
}
