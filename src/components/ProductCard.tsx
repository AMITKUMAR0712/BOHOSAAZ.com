"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import * as React from "react";
import { PriceBlock } from "@/components/PriceBlock";
import { WishlistButton } from "@/components/WishlistButton";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type ProductCardProduct = {
  id: string;
  title: string;
  slug: string;
  currency: "INR" | "USD";
  mrp?: number | null;
  price: number;
  salePrice?: number | null;
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
  onAddedToCart,
  enableImageSwipe,
}: {
  langPrefix: string;
  product: ProductCardProduct;
  className?: string;
  onAddedToCart?: () => void;
  enableImageSwipe?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const imgs = Array.isArray(product.images) ? product.images : [];
  const fallback = pickStockImage(product.slug || product.id);

  const orderedImages = React.useMemo(() => {
    const urls = imgs
      .map((i) => (typeof i?.url === "string" ? i.url.trim() : ""))
      .filter(Boolean);

    const primaryUrl = imgs.find((x) => x.isPrimary)?.url?.trim() || "";

    const out: string[] = [];
    const seen = new Set<string>();

    if (primaryUrl) {
      out.push(primaryUrl);
      seen.add(primaryUrl);
    }
    for (const u of urls) {
      if (seen.has(u)) continue;
      out.push(u);
      seen.add(u);
    }
    if (!out.length) out.push(fallback);
    return out;
  }, [imgs, fallback]);

  const canSwipe = Boolean(enableImageSwipe && orderedImages.length > 1);
  const [imgIndex, setImgIndex] = React.useState(0);
  const justSwipedAt = React.useRef(0);
  const startX = React.useRef<number | null>(null);

  React.useEffect(() => {
    // Reset when product changes.
    setImgIndex(0);
  }, [product.id]);

  const currentImage = orderedImages[imgIndex] ?? orderedImages[0] ?? fallback;

  function nextImage(dir: 1 | -1) {
    setImgIndex((prev) => {
      const n = orderedImages.length;
      if (n <= 1) return 0;
      return (prev + dir + n) % n;
    });
  }

  const isNew = (() => {
    if (!product.createdAt) return true;
    const d = new Date(product.createdAt);
    if (Number.isNaN(d.getTime())) return true;
    const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 14;
  })();

  const displayCurrency: "INR" | "USD" = product.currency;
  const displayPrice = Number(product.price);
  const displaySale = product.salePrice ?? null;
  const displayMrp = product.mrp ?? null;

  return (
    <div
      className={cn(
        "group h-full rounded-(--radius) border border-border bg-card overflow-hidden transition will-change-transform hover:-translate-y-0.5 hover:shadow-premium flex flex-col",
        className,
      )}
    >
      <div className="relative">
        <Link
          href={`${langPrefix}/p/${product.slug}`}
          className="block"
          onClick={(e) => {
            // Prevent navigation on swipe gesture.
            if (!canSwipe) return;
            const dt = Date.now() - justSwipedAt.current;
            if (dt >= 0 && dt < 350) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <div
            className="aspect-4/3 bg-muted overflow-hidden relative"
            style={canSwipe ? ({ touchAction: "pan-y" } as React.CSSProperties) : undefined}
            onPointerDown={(e) => {
              if (!canSwipe) return;
              // Only track primary pointer.
              if (e.pointerType === "mouse" && e.button !== 0) return;
              startX.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if (!canSwipe) return;
              if (startX.current == null) return;
              const dx = e.clientX - startX.current;
              startX.current = null;
              if (Math.abs(dx) < 32) return;
              justSwipedAt.current = Date.now();
              nextImage(dx < 0 ? 1 : -1);
            }}
            onPointerCancel={() => {
              startX.current = null;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage}
              alt={product.title}
              className={cn(
                "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
                canSwipe ? "select-none" : "",
              )}
              draggable={false}
            />

            {canSwipe ? (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  className={cn(
                    "absolute left-2 top-1/2 -translate-y-1/2",
                    "h-9 w-9 grid place-items-center rounded-full border border-border bg-background/70 backdrop-blur",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                  )}
                  onClick={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    nextImage(-1);
                  }}
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>

                <button
                  type="button"
                  aria-label="Next image"
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2",
                    "h-9 w-9 grid place-items-center rounded-full border border-border bg-background/70 backdrop-blur",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                  )}
                  onClick={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    nextImage(1);
                  }}
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>

                <div className="absolute bottom-2 right-2 rounded-full border border-border bg-background/70 backdrop-blur px-2 py-1 text-[11px] text-muted-foreground">
                  {imgIndex + 1}/{orderedImages.length}
                </div>
              </>
            ) : null}
          </div>

          {isNew ? (
            <div className="absolute left-3 top-3 rounded-full bg-card/90 border border-border px-2.5 py-1 text-[11px] tracking-wide">
              New
            </div>
          ) : null}

          <div className="absolute inset-x-0 top-0 p-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <div
              className="rounded-full bg-primary text-primary-foreground h-10 w-10 grid place-items-center shadow-premium"
              aria-hidden
            >
              →
            </div>
          </div>
        </Link>
      </div>

      <div className="p-4 flex flex-1 flex-col">
        <div className="h-11 overflow-hidden">
          <Link
            href={`${langPrefix}/p/${product.slug}`}
            className="font-heading text-[15px] leading-snug text-foreground hover:underline underline-offset-4 line-clamp-2"
          >
            {product.title}
          </Link>
        </div>

        <div className="mt-2 min-h-11 flex items-end">
          <PriceBlock
            price={displayPrice}
            salePrice={displaySale}
            mrp={displayMrp}
            currency={displayCurrency}
            size="sm"
          />
        </div>

        <div className="mt-auto pt-4 flex items-center gap-2">
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
                window.dispatchEvent(new Event("bohosaaz-cart"));
                onAddedToCart?.();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "ADDING..." : "ADD TO CART"}
          </Button>

          <WishlistButton productId={product.id} langPrefix={langPrefix} />
        </div>
      </div>
    </div>
  );
}
