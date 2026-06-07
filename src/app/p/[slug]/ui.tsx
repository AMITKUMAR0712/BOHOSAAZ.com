"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { PriceBlock } from "@/components/PriceBlock";
import { WishlistButton } from "@/components/WishlistButton";
import { useCurrency } from "@/lib/currency-context";
import { getCustomerUnitPrice } from "@/lib/customer-pricing";

type Variant = {
  id: string;
  size: string;
  color: string | null;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  isActive: boolean;
};

export default function PurchasePanel({
  productId,
  currency,
  mrp,
  price,
  salePrice,
  stock,
  variants,
  disabled,
  langPrefix,
  forceCodOnly = false,
  isVendorProduct = false,
}: {
  productId: string;
  currency: "INR" | "USD";
  mrp?: number | null;
  price: number;
  salePrice?: number | null;
  stock: number;
  variants?: Variant[];
  disabled?: boolean;
  langPrefix?: string;
  forceCodOnly?: boolean;
  isVendorProduct?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const { currency: userCurrency } = useCurrency();
  const activeVariants = useMemo(
    () => (Array.isArray(variants) ? variants.filter((v) => v.isActive) : []),
    [variants]
  );

  const hasVariants = activeVariants.length > 0;

  const displayCurrency: "INR" | "USD" = currency;
  const basePrice = Number(price);
  const baseSale = salePrice ?? null;
  const baseMrp = mrp ?? null;

  const convertedBasePrice = getCustomerUnitPrice({
    basePrice,
    productCurrency: displayCurrency,
    displayCurrency: userCurrency,
    isVendorProduct,
  });
  const convertedBaseSale = baseSale
    ? getCustomerUnitPrice({
        basePrice: baseSale,
        productCurrency: displayCurrency,
        displayCurrency: userCurrency,
        isVendorProduct,
      })
    : null;
  const convertedBaseMrp = baseMrp
    ? getCustomerUnitPrice({
        basePrice: baseMrp,
        productCurrency: displayCurrency,
        displayCurrency: userCurrency,
        isVendorProduct,
      })
    : null;

  const sizes = useMemo(() => {
    const set = new Set(activeVariants.map((v) => v.size).filter(Boolean));
    return Array.from(set);
  }, [activeVariants]);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  useEffect(() => {
    if (!hasVariants) return;
    if (!selectedSize) setSelectedSize(sizes[0] ?? null);
  }, [hasVariants, selectedSize, sizes]);

  const colorsForSize = useMemo(() => {
    if (!selectedSize) return [];
    const set = new Set(
      activeVariants
        .filter((v) => v.size === selectedSize)
        .map((v) => v.color)
        .filter((c): c is string => Boolean(c))
    );
    return Array.from(set);
  }, [activeVariants, selectedSize]);

  useEffect(() => {
    if (!hasVariants) return;
    if (!colorsForSize.length) {
      setSelectedColor(null);
      return;
    }
    if (!selectedColor || !colorsForSize.includes(selectedColor)) {
      setSelectedColor(colorsForSize[0] ?? null);
    }
  }, [hasVariants, colorsForSize, selectedColor]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants || !selectedSize) return null;
    const list = activeVariants.filter((v) => v.size === selectedSize);
    if (!list.length) return null;
    if (!colorsForSize.length) {
      return list.find((v) => !v.color) ?? list[0];
    }
    if (!selectedColor) return null;
    return list.find((v) => (v.color ?? null) === selectedColor) ?? null;
  }, [activeVariants, colorsForSize.length, hasVariants, selectedColor, selectedSize]);

  useEffect(() => {
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
            it?.product?.id === productId || it?.productId === productId,
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
  }, [productId]);

  const unitPrice = hasVariants
    ? selectedVariant
      ? Number(selectedVariant.salePrice ?? selectedVariant.price)
      : null
    : Number(baseSale ?? basePrice);

  const availableStock = hasVariants ? selectedVariant?.stock ?? 0 : stock;
  const canAdd = !disabled && !loading && (!hasVariants || Boolean(selectedVariant)) && availableStock > 0;
  const lp = langPrefix || "";
  const checkoutHref = `${lp}/checkout` || "/checkout";

  function redirectToLogin() {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.href = `${lp || ""}/login?next=${encodeURIComponent(next)}`;
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="rounded-[20px] border border-border bg-card/92 p-3 shadow-sm sm:rounded-(--radius) sm:p-5">
        <div className="flex items-start justify-between gap-3 sm:gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px] sm:tracking-[0.16em]">Price</div>
            <div className="mt-1.5 sm:mt-2">
              {unitPrice == null ? (
                <div className="font-heading text-2xl text-muted-foreground">—</div>
              ) : (
                <PriceBlock
                  price={hasVariants ? getCustomerUnitPrice({ basePrice: Number(selectedVariant?.price ?? 0), productCurrency: displayCurrency, displayCurrency: userCurrency, isVendorProduct }) : convertedBasePrice}
                  salePrice={hasVariants && selectedVariant?.salePrice ? getCustomerUnitPrice({ basePrice: selectedVariant.salePrice, productCurrency: displayCurrency, displayCurrency: userCurrency, isVendorProduct }) : convertedBaseSale}
                  mrp={hasVariants ? null : convertedBaseMrp}
                  currency={userCurrency}
                  size="md"
                />
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px] sm:tracking-[0.16em]">Availability</div>
            <div className="mt-1.5 font-heading text-base text-foreground sm:mt-2 sm:text-lg">
              {availableStock > 0 ? availableStock : 0}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {availableStock > 0 ? "In stock" : "Out of stock"}
            </div>
          </div>
        </div>
      </div>

      {hasVariants && (
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-2">
            <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Size</div>
            <Select
              value={selectedSize ?? ""}
              onChange={(e) => setSelectedSize(e.target.value || null)}
            >
              <option value="" disabled>
                Select size
              </option>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          {colorsForSize.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Colour</div>
              <Select
                value={selectedColor ?? ""}
                onChange={(e) => setSelectedColor(e.target.value || null)}
              >
                <option value="" disabled>
                  Select color
                </option>
                {colorsForSize.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="rounded-[20px] border border-border bg-card/92 p-3 shadow-sm sm:rounded-(--radius) sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px] sm:tracking-[0.16em]">Quantity</div>
          <QtyStepper
            value={qty}
            min={1}
            max={Math.max(1, availableStock || 1)}
            onChange={setQty}
            className="[&>button]:w-9 [&>div]:w-10 sm:[&>button]:w-10 sm:[&>div]:w-12"
          />
        </div>

        <div className="mt-3 grid min-w-0 grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2">
          {forceCodOnly ? (
            <div className="col-span-2 mb-1 rounded-lg border border-yellow-200/50 bg-yellow-50/50 p-3 text-sm text-yellow-900">
              <span className="font-medium">Cash on Delivery:</span> This product prefers COD payment. 
            </div>
          ) : null}
          <Button
             variant={inCart ? "outline" : "soft"}
             className="h-10! min-h-10! min-w-0 rounded-xl px-1.5 text-[9px] uppercase tracking-[0.08em] sm:h-12! sm:min-h-12! sm:rounded-2xl sm:px-2 sm:text-sm sm:tracking-[0.12em]"
             disabled={!canAdd || inCart}
             onClick={async () => {
               setMsg(null);
               setLoading(true);
               try {
                const res = await fetch("/api/cart/add", {
                   method: "POST",
                   credentials: "include",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({
                     productId,
                     qty,
                     ...(selectedVariant ? { variantId: selectedVariant.id } : {}),
                   }),
                 });
                 const data = await res.json().catch(() => ({}));
                 if (res.status === 401) {
                   redirectToLogin();
                   return;
                 }
                if (!res.ok) throw new Error(data?.error || "Add to cart failed");
                 setInCart(true);
                 setMsg("Added to cart.");
                 window.dispatchEvent(new Event("bohosaaz-cart"));
                 localStorage.setItem("bohosaaz_cart_ts", String(Date.now()));
               } catch (e: unknown) {
                 const message = e instanceof Error ? e.message : "Error";
                 setMsg(message);
               } finally {
                 setLoading(false);
               }
             }}
           >
             {loading ? "ADDING..." : inCart ? "ADDED" : "ADD TO CART"}
           </Button>
 
           <Button
            className="h-10! min-h-10! min-w-0 rounded-xl px-1.5 text-[10px] uppercase tracking-[0.08em] sm:h-12! sm:min-h-12! sm:rounded-2xl sm:px-2 sm:text-sm sm:tracking-[0.12em]"
             disabled={!canAdd}
             onClick={async () => {
               setMsg(null);
               setLoading(true);
               try {
                const res = await fetch("/api/cart/buynow", {
                   method: "POST",
                   credentials: "include",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({
                     productId,
                     qty,
                     ...(selectedVariant ? { variantId: selectedVariant.id } : {}),
                   }),
                 });
                 const data = await res.json().catch(() => ({}));
                 if (res.status === 401) {
                   redirectToLogin();
                   return;
                 }
                if (!res.ok) throw new Error(data?.error || "Buy now failed");
                const orderId = typeof data?.orderId === "string" ? data.orderId : "";
                const qs = orderId ? `?orderId=${encodeURIComponent(orderId)}` : "";
                // Buy Now checks out only the newly-created one-item order.
                window.location.href = `${checkoutHref}${qs}`;
               } catch (e: unknown) {
                 const message = e instanceof Error ? e.message : "Error";
                 setMsg(message);
               } finally {
                 setLoading(false);
               }
             }}
           >
            {loading ? "PLEASE WAIT..." : forceCodOnly ? "BUY NOW " : "BUY NOW"}
           </Button>
         </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Wishlist</div>
          <WishlistButton productId={productId} langPrefix={lp || "/"} />
        </div>

        {msg ? <div className="mt-3 text-xs text-muted-foreground">{msg}</div> : null}
      </div>
    </div>
  );
}
