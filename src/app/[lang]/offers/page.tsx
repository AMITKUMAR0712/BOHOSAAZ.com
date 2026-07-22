import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "en";
  return buildMetadata({
    title: "Gift Offers in Noida & Delhi NCR",
    description:
      "Shop discounted gift products in Noida, Greater Noida, New Delhi and Delhi NCR. Find offers on birthday gifts, home decor, barware, hampers and festival gifts.",
    path: `/${locale}/offers`,
  });
}

export default async function OffersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) throw new Error("Invalid locale");

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      status: "PUBLISHED",
      salePrice: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    take: 24,
    select: {
      id: true,
      title: true,
      slug: true,
      currency: true,
      mrp: true,
      price: true,
      salePrice: true,
      createdAt: true,
      images: {
        select: { url: true, isPrimary: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  const cards: ProductCardProduct[] = products
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      currency: p.currency,
      mrp: p.mrp == null ? null : Number(p.mrp),
      price: Number(p.price),
      salePrice: p.salePrice == null ? null : Number(p.salePrice),
      createdAt: p.createdAt.toISOString(),
      images: p.images,
    }))
    .filter((p) => p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price);

  return (
    <div className="site-container mobile-bottom-safe py-6 md:py-12">
      <div className="rounded-[24px] border border-border/80 bg-card/80 p-5 shadow-premium backdrop-blur-xl md:rounded-[36px] md:p-10">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Offers</div>
        <h1 className="mt-3 font-heading text-3xl tracking-tight md:text-5xl">Sale picks</h1>
        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
          Limited-time prices — grab your favorites while they’re on offer.
        </p>
      </div>

      <div className="mt-5 grid auto-rows-fr grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-3">
        {cards.map((p) => (
          <ProductCard key={p.id} langPrefix={`/${lang}`} product={p} />
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-border bg-card/80 p-6 text-sm text-muted-foreground shadow-sm">
          No offers available right now.
        </div>
      ) : null}
    </div>
  );
}
