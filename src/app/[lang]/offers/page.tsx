import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import OffersCouponCapture from "./OffersCouponCapture";

export const metadata: Metadata = {
  title: "Offers | Bohosaaz",
  description: "Shop offers and discounted handcrafted products on Bohosaaz.",
};

export default async function OffersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) throw new Error("Invalid locale");

  const sp = (await searchParams) ?? {};
  const coupon = typeof sp.coupon === "string" ? sp.coupon.trim() : "";
  const couponCode = coupon ? coupon.toUpperCase() : null;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
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
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="rounded-4xl border border-border bg-card/70 backdrop-blur-xl p-6 md:p-10 shadow-premium">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Offers</div>
        <h1 className="mt-3 font-heading text-4xl md:text-5xl tracking-tight">Sale picks</h1>
        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
          Limited-time prices — grab your favorites while they’re on offer.
        </p>
      </div>

      <OffersCouponCapture coupon={couponCode} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((p) => (
          <ProductCard key={p.id} langPrefix={`/${lang}`} product={p} />
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="mt-10 rounded-(--radius) border border-border bg-card p-6 text-sm text-muted-foreground">
          No offers available right now.
        </div>
      ) : null}
    </div>
  );
}
