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
      ? "text-[15px] sm:text-base"
      : size === "lg"
        ? "text-2xl md:text-3xl"
        : "text-xl md:text-2xl";
  const compareCls = size === "sm" ? "text-xs" : "text-sm";
  const badgeCls =
    size === "sm"
      ? "whitespace-nowrap rounded-full px-2 py-1 text-[10px] leading-none tracking-[0.08em] sm:py-0.5 sm:text-[11px]"
      : "rounded-full px-2 py-0.5 text-[11px] tracking-[0.12em]";
  const savingsCls = size === "sm" ? "text-[11px] leading-snug" : "text-xs";

  return (
    <div className={cn("space-y-1", className)}>
      <div className={cn("flex gap-y-1", size === "sm" ? "flex-col items-start sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-3" : "flex-wrap items-end gap-x-3")}>
        <div className={cn("font-heading tracking-tight text-primary", priceCls)}>
          {formatMoney(currency, current)}
        </div>

        {hasDiscount ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className={cn("text-muted-foreground line-through", compareCls)}>{formatMoney(currency, compare)}</div>
            <div className={cn("inline-flex items-center border border-border bg-accent/20 font-semibold text-foreground", badgeCls)}>
              {discountPct}% OFF
            </div>
          </div>
        ) : null}
      </div>

      {hasDiscount && showSavings ? (
        <div className={cn("text-muted-foreground", savingsCls)}>You save {formatMoney(currency, savings)}</div>
      ) : null}
    </div>
  );
}
