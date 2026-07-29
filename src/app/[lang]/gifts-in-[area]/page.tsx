import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo/metadata";
import { getLocalGiftArea, LOCAL_GIFT_AREAS } from "@/lib/seo/local-areas";
import { LocalGiftAreaPage } from "@/components/seo/LocalGiftAreaPage";

export function generateStaticParams() {
  return LOCAL_GIFT_AREAS.map((area) => ({ area: area.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; area: string }>;
}): Promise<Metadata> {
  const { lang, area: areaSlug } = await params;
  const locale = isLocale(lang) ? lang : "en";
  const area = getLocalGiftArea(areaSlug);
  if (!area) {
    return buildMetadata({
      title: "Local gift shop",
      description: "Curated online gifting for Delhi NCR from Bohosaaz.",
      path: `/${locale}/gifts-in-${areaSlug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: area.titleSegment,
    description: area.description,
    path: `/${locale}/gifts-in-${area.slug}`,
  });
}

export default async function GiftsInAreaRoute({
  params,
}: {
  params: Promise<{ lang: string; area: string }>;
}) {
  const { lang, area: areaSlug } = await params;
  if (!isLocale(lang)) return notFound();

  const area = getLocalGiftArea(areaSlug);
  if (!area) return notFound();

  return <LocalGiftAreaPage lang={lang} area={area} />;
}
