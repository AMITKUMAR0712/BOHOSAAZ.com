"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import * as React from "react";
import { PriceBlock } from "@/components/PriceBlock";
import { WishlistButton } from "@/components/WishlistButton";
import { useCurrency } from "@/lib/currency-context";
import { getCustomerUnitPrice } from "@/lib/customer-pricing";

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
  vendorId?: string | null;
  vendor?: { id?: string | null } | null;
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
  enableImageSwipe = true,
}: {
  langPrefix: string;
  product: ProductCardProduct;
  className?: string;
  onAddedToCart?: () => void;
  enableImageSwipe?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const [inCart, setInCart] = React.useState(false);
  const { currency: userCurrency } = useCurrency();
  const fallback = pickStockImage(product.slug || product.id);
  const [isHovering, setIsHovering] = React.useState(false);

  const orderedImages = React.useMemo(() => {
    const imgs = Array.isArray(product.images) ? product.images : [];
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
  }, [product.images, fallback]);

  const canSwipe = Boolean(enableImageSwipe && orderedImages.length > 1);
  const [imgIndex, setImgIndex] = React.useState(0);
  const justSwipedAt = React.useRef(0);
  const startX = React.useRef<number | null>(null);

  React.useEffect(() => {
    // Reset when product changes.
    setImgIndex(0);
  }, [product.id]);

  React.useEffect(() => {
    if (!canSwipe || isHovering) return;
    const timer = window.setInterval(() => {
      setImgIndex((prev) => (prev + 1) % orderedImages.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [canSwipe, isHovering, orderedImages.length]);

  React.useEffect(() => {
    let cancelled = false;
    async function syncCartState() {
      try {
        const res = await fetch("/api/cart", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        const items = data?.order?.items;
        if (!Array.isArray(items)) return;
        const found = items.some(
          (it: { product?: { id?: string }; productId?: string }) =>
            it?.product?.id === product.id || it?.productId === product.id,
        );
        setInCart(found);
      } catch {
        // ignore cart state sync errors
      }
    }
    void syncCartState();
    const onCart = () => void syncCartState();
    window.addEventListener("bohosaaz-cart", onCart);
    return () => {
      cancelled = true;
      window.removeEventListener("bohosaaz-cart", onCart);
    };
  }, [product.id]);

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

  const hasVendor = Boolean(product.vendorId ?? product.vendor?.id);
  const displayConvertedPrice = getCustomerUnitPrice({
    basePrice: displayPrice,
    productCurrency: displayCurrency,
    displayCurrency: userCurrency,
    isVendorProduct: hasVendor,
  });
  const displayConvertedSale = displaySale
    ? getCustomerUnitPrice({
        basePrice: displaySale,
        productCurrency: displayCurrency,
        displayCurrency: userCurrency,
        isVendorProduct: hasVendor,
      })
    : null;
  const displayConvertedMrp = displayMrp
    ? getCustomerUnitPrice({
        basePrice: displayMrp,
        productCurrency: displayCurrency,
        displayCurrency: userCurrency,
        isVendorProduct: hasVendor,
      })
    : null;

  function redirectToLogin() {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.href = `${langPrefix}/login?next=${encodeURIComponent(next)}`;
  }

  return (
    <div
      className={cn(
        "group flex h-full transform-gpu flex-col overflow-hidden rounded-[22px] bg-card/92 shadow-[0_14px_42px_rgba(47,38,34,0.08)] ring-1 ring-transparent backdrop-blur-xl transition duration-500 ease-out will-change-transform hover:-translate-y-1 hover:scale-[1.015] hover:ring-primary/15 hover:shadow-premium sm:rounded-[32px] sm:hover:-translate-y-1.5",
        className,
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
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
            className="relative aspect-square overflow-hidden bg-linear-to-br from-background via-card to-primary/8 sm:aspect-4/3"
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
            {orderedImages.map((imageUrl, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${imageUrl}-${index}`}
                src={imageUrl}
                alt={product.title}
                className={cn(
                  "absolute inset-0 h-full w-full transform-gpu object-contain p-3 transition-all duration-700 ease-out will-change-transform sm:p-4",
                  index === imgIndex ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]",
                  "group-hover:scale-[1.025]",
                  canSwipe ? "select-none" : "",
                )}
                draggable={false}
              />
            ))}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/20 via-transparent to-white/15 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 translate-y-4 bg-linear-to-t from-primary/12 to-transparent opacity-0 blur-sm transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100" />

            {canSwipe ? (
              <>
                <div className="absolute bottom-2 right-2 rounded-full border border-border bg-background/80 backdrop-blur px-2 py-1 text-[11px] text-muted-foreground shadow-sm">
                  {imgIndex + 1}/{orderedImages.length}
                </div>
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {orderedImages.slice(0, 5).map((_, dotIndex) => (
                    <span
                      key={dotIndex}
                      className={cn(
                        "h-1.5 rounded-full bg-background/80 shadow-sm transition-all duration-500",
                        dotIndex === imgIndex ? "w-5 bg-primary" : "w-1.5",
                      )}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {isNew ? (
            <div className="absolute left-2 top-2 rounded-full border border-primary/20 bg-card/90 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary shadow-sm backdrop-blur sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
              New
            </div>
          ) : null}

          <div className="absolute inset-x-0 top-0 hidden p-3 justify-end opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
            <div
              className="rounded-full bg-primary text-primary-foreground h-10 w-10 grid place-items-center shadow-premium transition group-hover:scale-105"
              aria-hidden
            >
              →
            </div>
          </div>
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <div className="min-h-10 overflow-hidden sm:min-h-11">
          <Link
            href={`${langPrefix}/p/${product.slug}`}
            className="font-heading text-[14px] leading-snug text-foreground transition line-clamp-2 hover:text-primary sm:text-[15px]"
          >
            {product.title}
          </Link>
        </div>

        <div className="mt-2 min-h-[4.6rem] sm:mt-2 sm:min-h-[4.9rem]">
          <div className="min-w-0">
            <PriceBlock
              price={displayConvertedPrice}
              salePrice={displayConvertedSale}
              mrp={displayConvertedMrp}
              currency={userCurrency}
              size="sm"
            />
            {hasVendor ? (
              <div className="mt-1 text-xs text-muted-foreground"></div>
            ) : null}
          </div>
        </div>

        <div className="mt-auto grid grid-cols-[minmax(0,1fr)_2.25rem] items-center gap-1.5 pt-3 sm:grid-cols-[minmax(0,1fr)_2.5rem] sm:gap-2 sm:pt-5">
          <Button
            variant={inCart ? "outline" : "soft"}
            size="sm"
            className="min-w-0 overflow-hidden rounded-xl h-9! min-h-9! px-1.5 text-[10px] font-semibold normal-case tracking-wide transition-transform duration-300 hover:-translate-y-px sm:h-10! sm:min-h-10! sm:rounded-2xl sm:px-3 sm:text-xs"
            disabled={busy || inCart}
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
                  redirectToLogin();
                  return;
                }
                if (!res.ok) throw new Error(data?.error || "Add to cart failed");
                setInCart(true);
                window.dispatchEvent(new Event("bohosaaz-cart"));
                localStorage.setItem("bohosaaz_cart_ts", String(Date.now()));
                onAddedToCart?.();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Adding..." : inCart ? "Added" : "Add to cart"}
          </Button>

          <WishlistButton productId={product.id} langPrefix={langPrefix} className="h-9 w-9 shrink-0 rounded-xl sm:h-10 sm:w-10 sm:rounded-(--radius)" />
        </div>
      </div>
    </div>
  );
}
