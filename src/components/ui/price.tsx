import * as React from "react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

export function Price({
  value,
  currency = "INR",
  className,
  size = "lg",
}: {
  value: number;
  currency?: "INR" | "USD";
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const cls =
    size === "sm"
      ? "text-sm"
      : size === "md"
        ? "text-base"
        : "text-2xl md:text-3xl";

  return (
    <span className={cn("font-heading tracking-tight text-primary", cls, className)}>
      {formatMoney(currency, Number(value))}
    </span>
  );
}
