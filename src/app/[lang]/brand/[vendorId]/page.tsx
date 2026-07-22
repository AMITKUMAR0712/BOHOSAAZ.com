import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { buildMetadata } from "@/lib/seo/metadata";
import { fitDescription } from "@/lib/seo/assert";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; vendorId: string }>;
}): Promise<Metadata> {
  const { lang, vendorId: slug } = await params;
  const locale = isLocale(lang) ? lang : "en";
  const brand = await prisma.brand.findUnique({
    where: { slug },
    select: { name: true, isActive: true },
  });

  if (!brand || !brand.isActive) {
    return buildMetadata({
      title: "Brand",
      description: "Browse gift brands on Bohosaaz.",
      path: `/${locale}/brand/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: `${brand.name} Gifts in Noida & Delhi NCR`,
    description: fitDescription(
      `Shop ${brand.name} gift products for Noida, Greater Noida, New Delhi and Delhi NCR. Premium gifts, birthday gifts and curated online gifting ideas.`
    ),
    path: `/${locale}/brand/${slug}`,
  });
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ lang: string; vendorId: string }>;
}) {
  const { lang, vendorId: slug } = await params;
  const langPrefix = `/${lang}`;

  const brand = await prisma.brand.findUnique({
    where: { slug },
    select: { id: true, name: true, logoUrl: true, isActive: true },
  });
  if (!brand || !brand.isActive) return notFound();

  const products = await prisma.product.findMany({
    where: { brandId: brand.id, isActive: true, status: "PUBLISHED" },
    orderBy: [{ createdAt: "desc" }],
    take: 60,
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
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        take: 4,
        select: { url: true, isPrimary: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="rounded-[36px] border border-border/80 bg-card/80 p-6 shadow-premium backdrop-blur-xl md:p-10">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl border border-border bg-background/70 overflow-hidden grid place-items-center">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={brand.name} className="h-12 w-12 object-contain" />
            ) : (
              <div className="font-heading text-2xl text-primary">{brand.name.trim().slice(0, 1).toUpperCase()}</div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground truncate">{brand.name}</h1>
            <div className="mt-1 text-sm text-muted-foreground">Products by this brand</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid auto-rows-fr grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            langPrefix={langPrefix}
            product={{
              id: p.id,
              title: p.title,
              slug: p.slug,
              currency: p.currency,
              mrp: p.mrp == null ? null : Number(p.mrp),
              price: Number(p.price),
              salePrice: p.salePrice == null ? null : Number(p.salePrice),
              createdAt: p.createdAt.toISOString(),
              images: p.images,
            }}
          />
        ))}

        {!products.length ? (
          <div className="rounded-3xl border border-border bg-card/80 p-6 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            No products found for this brand.
          </div>
        ) : null}
      </div>
    </div>
  );
}
