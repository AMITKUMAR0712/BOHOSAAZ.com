import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Seller | Bohosaaz",
  description: "Become a seller on Bohosaaz or manage your vendor account.",
};

export default async function SellerPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) throw new Error("Invalid locale");

  const lp = `/${lang}`;
  const me = await requireUser();

  if (!me) {
    redirect(`${lp}/login?next=${encodeURIComponent(`${lp}/seller`)}`);
  }

  if (me.role === "ADMIN") {
    redirect(`${lp}/admin`);
  }

  if (me.role === "USER") {
    redirect(`${lp}/account/vendor-apply`);
  }

  // role === VENDOR
  if (me.vendor?.status === "APPROVED") {
    redirect(`${lp}/vendor`);
  }

  redirect(`${lp}/account/vendor-apply`);
}
