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
  const [imgIndex, setImgIndex] = React.useState(0);
  const [isHovering, setIsHovering] = React.useState(false);
  const orderedImages = React.useMemo(() => {
    const imgs = Array.isArray(product.images) ? product.images : [];
    const primaryUrl = imgs.find((x) => x.isPrimary)?.url || "";
    const urls = imgs.map((x) => x.url).filter(Boolean);
    const out: string[] = [];
    const seen = new Set<string>();
    if (primaryUrl) {
      out.push(primaryUrl);
      seen.add(primaryUrl);
    }
    for (const url of urls) {
      if (seen.has(url)) continue;
      out.push(url);
      seen.add(url);
    }
    if (!out.length) out.push(pickStockImage(product.slug || product.id));
    return out;
  }, [product.images, product.id, product.slug]);
  const canAutoScroll = orderedImages.length > 1;

  React.useEffect(() => {
    setImgIndex(0);
  }, [product.id]);

  React.useEffect(() => {
    if (!canAutoScroll || isHovering) return;
    const timer = window.setInterval(() => {
      setImgIndex((prev) => (prev + 1) % orderedImages.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [canAutoScroll, isHovering, orderedImages.length]);

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
        "group overflow-hidden rounded-(--radius) border border-border bg-card transition duration-500 will-change-transform hover:-translate-y-1 hover:scale-[1.015] hover:shadow-premium",
        className,
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative">
        <Link href={`${langPrefix}/p/${product.slug}`} className="block">
          <div className="relative aspect-4/3 bg-muted overflow-hidden">
            {orderedImages.map((imageUrl, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${imageUrl}-${index}`}
                src={imageUrl}
                alt={product.title}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out",
                  index === imgIndex ? "opacity-100 scale-100" : "opacity-0 scale-[1.03]",
                  "group-hover:scale-[1.08] group-hover:rotate-[0.25deg]",
                )}
              />
            ))}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/20 via-transparent to-white/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            {canAutoScroll ? (
              <div className="absolute bottom-2 left-2 flex gap-1">
                {orderedImages.slice(0, 5).map((_, dotIndex) => (
                  <span
                    key={dotIndex}
                    className={cn(
                      "h-1.5 rounded-full bg-background/80 transition-all duration-500",
                      dotIndex === imgIndex ? "w-5 bg-primary" : "w-1.5",
                    )}
                  />
                ))}
              </div>
            ) : null}
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
            className="flex-1 font-semibold normal-case tracking-wide"
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
                if (res.status === 401) {
                  const next = `${window.location.pathname}${window.location.search}`;
                  window.location.href = `${langPrefix}/login?next=${encodeURIComponent(next)}`;
                  return;
                }
                if (!res.ok) throw new Error(data?.error || "Add to cart failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Adding..." : "Add to cart"}
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
