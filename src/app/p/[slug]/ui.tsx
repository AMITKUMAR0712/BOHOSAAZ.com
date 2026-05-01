"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { PriceBlock } from "@/components/PriceBlock";
import { WishlistButton } from "@/components/WishlistButton";

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
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const activeVariants = useMemo(
    () => (Array.isArray(variants) ? variants.filter((v) => v.isActive) : []),
    [variants]
  );

  const hasVariants = activeVariants.length > 0;

  const displayCurrency: "INR" | "USD" = currency;
  const basePrice = Number(price);
  const baseSale = salePrice ?? null;
  const baseMrp = mrp ?? null;

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

  const unitPrice = hasVariants
    ? selectedVariant
      ? Number(selectedVariant.salePrice ?? selectedVariant.price)
      : null
    : Number(baseSale ?? basePrice);

  const availableStock = hasVariants ? selectedVariant?.stock ?? 0 : stock;
  const canAdd = !disabled && !loading && (!hasVariants || Boolean(selectedVariant)) && availableStock > 0;
  const lp = langPrefix || "";
  const checkoutHref = `${lp}/checkout` || "/checkout";

  return (
    <div className="space-y-5">
      <div className="rounded-(--radius) border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Price</div>
            <div className="mt-2">
              {unitPrice == null ? (
                <div className="font-heading text-2xl text-muted-foreground">—</div>
              ) : (
                <PriceBlock
                  price={hasVariants ? Number(selectedVariant?.price ?? 0) : basePrice}
                  salePrice={hasVariants ? (selectedVariant?.salePrice ?? null) : baseSale}
                  mrp={hasVariants ? null : baseMrp}
                  currency={displayCurrency}
                  size="lg"
                />
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Availability</div>
            <div className="mt-2 font-heading text-lg text-foreground">
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

      <div className="rounded-(--radius) border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Quantity</div>
          <QtyStepper value={qty} min={1} max={Math.max(1, availableStock || 1)} onChange={setQty} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <Button
            variant="soft"
            className="h-11 uppercase tracking-[0.12em]"
            disabled={!canAdd}
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
                if (!res.ok) throw new Error(data?.error || "Add to cart failed");
                setMsg("Added to cart.");
                window.dispatchEvent(new Event("bohosaaz-cart"));
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : "Error";
                setMsg(message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "ADDING..." : "ADD TO CART"}
          </Button>

          <Button
            className="h-11 uppercase tracking-[0.12em]"
            disabled={!canAdd}
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
                if (!res.ok) throw new Error(data?.error || "Add to cart failed");
                window.location.href = checkoutHref;
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : "Error";
                setMsg(message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "PLEASE WAIT..." : "BUY NOW"}
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
