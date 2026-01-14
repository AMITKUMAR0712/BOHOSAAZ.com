"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max,
  className,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
}) {
  const decDisabled = disabled || value <= min;
  const incDisabled = disabled || (max != null && value >= max);

  return (
    <div className={cn("inline-flex items-stretch rounded-[var(--radius)] border border-border bg-card overflow-hidden", className)}>
      <button
        type="button"
        className={cn(
          "w-10 grid place-items-center text-sm hover:bg-muted/50 transition-colors",
          decDisabled ? "opacity-50 pointer-events-none" : "",
        )}
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <div className="w-12 grid place-items-center text-sm font-semibold">{value}</div>
      <button
        type="button"
        className={cn(
          "w-10 grid place-items-center text-sm hover:bg-muted/50 transition-colors",
          incDisabled ? "opacity-50 pointer-events-none" : "",
        )}
        aria-label="Increase quantity"
        onClick={() => onChange(max != null ? Math.min(max, value + 1) : value + 1)}
      >
        +
      </button>
    </div>
  );
}
