import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { CategoriesGrid, CategoriesPageHero } from "@/components/CategoriesGrid";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "en";
  return buildMetadata({
    title: "Gift Categories in Noida & Delhi NCR",
    description:
      "Browse gift categories for Noida, Greater Noida, New Delhi and Delhi NCR: handcrafted gifts, home decor, barware, lifestyle products, festival gifts and premium hampers.",
    path: `/${locale}/categories`,
  });
}

export default async function AllCategoriesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) throw new Error("Invalid locale");

  const lp = `/${lang}`;

  const categories = await prisma.category.findMany({
    where: { isHidden: false },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, iconName: true, iconUrl: true },
  });

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <CategoriesPageHero />

      <div className="relative mt-10 flex flex-col gap-2 rounded-[30px] border border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">All collections</div>
          <h2 className="mt-1 font-heading text-2xl md:text-3xl tracking-tight text-foreground">
            {categories.length} Categories
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose a collection and find gifts faster.</p>
        </div>
      </div>

      <div className="relative mt-6">
        <CategoriesGrid langPrefix={lp} categories={categories} />
      </div>
    </div>
  );
}
