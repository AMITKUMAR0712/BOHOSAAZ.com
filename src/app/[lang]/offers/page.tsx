import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n";
import Link from "next/link";

export default async function OffersPage({ params, searchParams }: { params: { lang: string }; searchParams: { coupon?: string } }) {
  const { lang } = params;
  if (!isLocale(lang)) throw new Error("Invalid locale");

  const code = (searchParams?.coupon || null)?.toString() || null;
  const now = new Date();

  if (code) {
    const coupon = await prisma.coupon.findFirst({
      where: {
        code,
        isActive: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      select: { code: true, type: true, value: true },
    });

    if (!coupon) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-12">
          <h1 className="text-2xl font-heading">Coupon not found</h1>
          <p className="mt-4 text-sm text-muted-foreground">The coupon code you provided is not active or invalid.</p>
          <div className="mt-6">
            <Link href={`/${lang}`} className="text-primary underline">Back to home</Link>
          </div>
        </div>
      );
    }

    const label = coupon.type === "PERCENT" ? `${Math.round(Number(coupon.value))}% OFF` : `₹${Math.round(Number(coupon.value)).toLocaleString("en-IN") } OFF`;

    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-heading">Coupon: {coupon.code}</h1>
        <div className="mt-4 text-lg">{label}</div>
        <p className="mt-4 text-sm text-muted-foreground">Use this code at checkout to apply the discount.</p>
        <div className="mt-6">
          <Link href={`/${lang}/?coupon=${encodeURIComponent(coupon.code)}`} className="text-primary underline">Shop with coupon</Link>
        </div>
      </div>
    );
  }

  // No coupon code => show a simple list of active coupons
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    select: { id: true, code: true, type: true, value: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-heading">Active Coupons</h1>
      <div className="mt-6 grid gap-4">
        {coupons.map((c) => (
          <div key={c.id} className="rounded-lg border border-border p-4 bg-card">
            <div className="font-medium">{c.code}</div>
            <div className="text-sm text-muted-foreground mt-1">{c.type === "PERCENT" ? `${Math.round(Number(c.value))}% OFF` : `₹${Math.round(Number(c.value)).toLocaleString("en-IN") } OFF`}</div>
            <div className="mt-3">
              <Link href={`/${lang}/offers?coupon=${encodeURIComponent(c.code)}`} className="text-primary underline">View coupon</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
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

      <div className="mt-8 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
