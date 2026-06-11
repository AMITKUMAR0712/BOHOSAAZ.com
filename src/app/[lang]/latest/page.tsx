import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "New Gift Products in Noida & Delhi NCR | Bohosaaz",
  description:
    "Discover new gift products in Noida, Greater Noida, New Delhi and Delhi NCR. Shop curated birthday gifts, anniversary gifts, corporate gifts and premium gift ideas on Bohosaaz.",
  keywords: [
    "new gift products in Noida",
    "latest gifts Delhi NCR",
    "online gifts Greater Noida",
    "birthday gifts New Delhi",
    "premium gift products Bohosaaz",
  ],
};

export default async function LatestPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) throw new Error("Invalid locale");

  const products = await prisma.product.findMany({
    where: { isActive: true, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
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
      vendorId: true,
    },
  });

  const cards: ProductCardProduct[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    currency: p.currency,
    mrp: p.mrp == null ? null : Number(p.mrp),
    price: Number(p.price),
    salePrice: p.salePrice == null ? null : Number(p.salePrice),
    createdAt: p.createdAt.toISOString(),
    images: p.images,
    vendorId: p.vendorId ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="rounded-[36px] border border-border/80 bg-card/80 p-6 shadow-premium backdrop-blur-xl md:p-10">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Products</div>
        <h1 className="mt-3 font-heading text-4xl md:text-5xl tracking-tight">New arrivals</h1>
        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
          Fresh drops from our artisan community — curated for premium taste.
        </p>
      </div>

      <div className="mt-5 grid auto-rows-fr grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-3">
        {cards.map((p) => (
          <ProductCard key={p.id} langPrefix={`/${lang}`} product={p} />
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-border bg-card/80 p-6 text-sm text-muted-foreground shadow-sm">
          No products found.
        </div>
      ) : null}
    </div>
  );
}
