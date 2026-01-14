import * as React from "react";
import { cn } from "@/lib/cn";
import { formatMoney, round2 } from "@/lib/money";

export function PriceBlock({
  price,
  mrp,
  salePrice,
  currency = "INR",
  size = "md",
  className,
  showSavings = true,
}: {
  price: number;
  mrp?: number | null;
  salePrice?: number | null;
  currency?: "INR" | "USD";
  size?: "sm" | "md" | "lg";
  className?: string;
  showSavings?: boolean;
}) {
  const basePrice = Number(price);
  const baseMrp = mrp == null ? null : Number(mrp);
  const sp = salePrice == null ? null : Number(salePrice);

  const compare =
    baseMrp != null && Number.isFinite(baseMrp) && baseMrp > 0 ? baseMrp : basePrice;
  const current = sp != null && Number.isFinite(sp) && sp > 0 ? sp : basePrice;

  const hasDiscount =
    Number.isFinite(compare) && Number.isFinite(current) && compare > 0 && current > 0 && current < compare;
  const savings = hasDiscount ? Math.max(0, round2(compare - current)) : 0;
  const discountPct = hasDiscount ? Math.round((savings / compare) * 100) : 0;

  const priceCls =
    size === "sm"
      ? "text-base"
      : size === "lg"
        ? "text-2xl md:text-3xl"
        : "text-xl md:text-2xl";

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <div className={cn("font-heading tracking-tight text-primary", priceCls)}>
          {formatMoney(currency, current)}
        </div>

        {hasDiscount ? (
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground line-through">{formatMoney(currency, compare)}</div>
            <div className="inline-flex items-center rounded-full border border-border bg-accent/20 px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-foreground">
              {discountPct}% OFF
            </div>
          </div>
        ) : null}
      </div>

      {hasDiscount && showSavings ? (
        <div className="text-xs text-muted-foreground">You save {formatMoney(currency, savings)}</div>
      ) : null}
    </div>
  );
}
