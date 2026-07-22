import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo/metadata";
import { isLocale } from "@/lib/i18n";

const BRAND_TYPES = {
  popular: {
    dbValue: "POPULAR",
    title: "Popular Brands",
    subtitle: "Explore trusted artisan labels and top-selling brands curated for meaningful gifting.",
  },
  luxury: {
    dbValue: "LUXURY",
    title: "Luxury Brands",
    subtitle: "Discover premium labels selected for refined, memorable and elevated gifts.",
  },
} as const;

type BrandTypeSlug = keyof typeof BRAND_TYPES;

function getBrandType(type: string): (typeof BRAND_TYPES)[BrandTypeSlug] | null {
  return type === "popular" || type === "luxury" ? BRAND_TYPES[type] : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; type: string }>;
}): Promise<Metadata> {
  const { lang, type } = await params;
  const locale = isLocale(lang) ? lang : "en";
  const brandType = getBrandType(type);
  return buildMetadata({
    title: brandType?.title ?? "Brands",
    description:
      brandType?.subtitle ??
      "Explore curated gift brands on Bohosaaz for Noida and Delhi NCR.",
    path: `/${locale}/brands/${type}`,
    noindex: !brandType,
  });
}

export default async function BrandTypePage({
  params,
}: {
  params: Promise<{ lang: string; type: string }>;
}) {
  const { lang, type } = await params;
  const brandType = getBrandType(type);
  if (!brandType) return notFound();

  const brands = await prisma.brand.findMany({
    where: { isActive: true, brandType: brandType.dbValue },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <main className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[44px] border border-primary/15 bg-linear-to-br from-card/90 via-background/75 to-primary/8 p-6 shadow-premium backdrop-blur-2xl md:p-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative text-[11px] uppercase tracking-[0.28em] text-primary/80">Brands</div>
        <h1 className="mt-3 font-heading text-3xl tracking-tight text-foreground md:text-5xl">{brandType.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">{brandType.subtitle}</p>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-3">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/${lang}/brand/${encodeURIComponent(brand.slug)}`}
            className="group overflow-hidden rounded-[32px] border border-primary/10 bg-card/85 p-5 shadow-[0_18px_55px_rgba(47,38,34,0.07)] backdrop-blur-xl transition hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-premium"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-[22px] border border-primary/15 bg-background/75 shadow-sm transition group-hover:scale-105">
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logoUrl} alt={brand.name} className="h-12 w-12 object-contain" />
                ) : (
                  <span className="font-heading text-2xl text-primary">{brand.name.trim().slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-heading text-xl text-foreground transition group-hover:text-primary">{brand.name}</h2>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {brand._count.products} products
                </p>
              </div>
            </div>
          </Link>
        ))}

        {!brands.length ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/80 p-8 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            No brands have been added to this section yet.
          </div>
        ) : null}
      </div>
    </main>
  );
}
