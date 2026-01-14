import * as React from "react";
import { cn } from "@/lib/cn";

export function RatingRow({
  rating = 0,
  count = 0,
  className,
}: {
  rating?: number;
  count?: number;
  className?: string;
}) {
  const stars = Array.from({ length: 5 }).map((_, i) => i < Math.round(rating));

  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-xs text-muted-foreground", className)}>
      <div className="inline-flex items-center gap-1" aria-label={`${rating} out of 5`}
      >
        {stars.map((on, idx) => (
          <span key={idx} className={on ? "text-accent" : "text-border"} aria-hidden>
            ★
          </span>
        ))}
      </div>
      <span>Based on {count} reviews.</span>
      <span className="text-primary underline underline-offset-4">Write a review</span>
    </div>
  );
}
