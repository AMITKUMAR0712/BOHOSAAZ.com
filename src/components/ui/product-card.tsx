"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { PriceBlock } from "@/components/PriceBlock";

type ProductCardProduct = {
  id: string;
  title: string;
  slug: string;
  price: number;
  salePrice: number | null;
  createdAt?: string;
  images?: Array<{ url: string; isPrimary?: boolean }>; // from API
};

function pickStockImage(key: string) {
  const s = key || "x";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const idx = (h % 7) + 1;
  return `/s${idx}.jpg`;
}

export function ProductCard({
  langPrefix,
  product,
  className,
}: {
  langPrefix: string;
  product: ProductCardProduct;
  className?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const imgs = Array.isArray(product.images) ? product.images : [];
  const primary = imgs.find((x) => x.isPrimary)?.url || imgs[0]?.url || pickStockImage(product.slug || product.id);
  const isNew = (() => {
    if (!product.createdAt) return true; // safe default for UI
    const d = new Date(product.createdAt);
    if (Number.isNaN(d.getTime())) return true;
    const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 14;
  })();

  return (
    <div
      className={cn(
        "group rounded-(--radius) border border-border bg-card overflow-hidden transition will-change-transform hover:-translate-y-0.5 hover:shadow-premium",
        className,
      )}
    >
      <div className="relative">
        <Link href={`${langPrefix}/p/${product.slug}`} className="block">
          <div className="aspect-4/3 bg-muted overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primary}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>

          {isNew ? (
            <div className="absolute right-3 top-3 rounded-full bg-card/90 border border-border px-2.5 py-1 text-[11px] tracking-wide">
              New
            </div>
          ) : null}

          <div className="absolute inset-x-0 top-0 p-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="rounded-full bg-primary text-primary-foreground h-10 w-10 grid place-items-center shadow-premium" aria-hidden>
              →
            </div>
          </div>
        </Link>
      </div>

      <div className="p-4">
        <div className="min-h-11">
          <Link
            href={`${langPrefix}/p/${product.slug}`}
            className="font-heading text-[15px] leading-snug text-foreground hover:underline underline-offset-4 line-clamp-2"
          >
            {product.title}
          </Link>
        </div>

        <div className="mt-2">
          <PriceBlock price={product.price} salePrice={product.salePrice} size="sm" showSavings={false} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="soft"
            className="flex-1 uppercase tracking-wide"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await fetch("/api/cart/add", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productId: product.id, qty: 1 }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.error || "Add to cart failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "ADDING..." : "ADD TO CART"}
          </Button>

          <button
            type="button"
            className="h-10 w-10 grid place-items-center rounded-(--radius) border border-border bg-card hover:bg-muted/40 transition-colors"
            aria-label="Add to wishlist"
          >
            ♡
          </button>
        </div>
      </div>
    </div>
  );
}
