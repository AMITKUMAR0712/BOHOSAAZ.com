"use client";

import * as React from "react";

export function AutoScrollRow({
  children,
  className = "",
  contentClassName = "",
  step = 320,
  speed = 0.45,
  ariaLabel,
  arrowClassName = "",
  autoScroll = true,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  step?: number;
  speed?: number;
  ariaLabel: string;
  arrowClassName?: string;
  /** When false, row is manually scrollable only (no infinite loop). */
  autoScroll?: boolean;
}) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const pausedRef = React.useRef(false);

  React.useEffect(() => {
    if (!autoScroll) return;

    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const node = scrollerRef.current;
      if (node && !pausedRef.current) {
        const delta = Math.min(32, now - previous);
        node.scrollLeft += speed * delta;
        const halfway = node.scrollWidth / 2;
        if (halfway > 0 && node.scrollLeft >= halfway) {
          node.scrollLeft -= halfway;
        }
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [speed, autoScroll]);

  function move(direction: "left" | "right") {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  }

  const arrowClass =
    "grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-primary text-xl font-bold leading-none text-primary-foreground shadow-[0_12px_34px_rgba(135,56,20,0.28)] ring-4 ring-background/80 backdrop-blur transition hover:scale-105 hover:bg-foreground hover:text-background sm:h-11 sm:w-11 sm:text-2xl";

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div
        className={`pointer-events-none absolute inset-x-1 top-1/2 z-30 flex -translate-y-1/2 items-center justify-between sm:inset-x-3 md:inset-x-4 ${arrowClassName}`}
      >
        <button
          type="button"
          aria-label={`${ariaLabel} previous`}
          className={`pointer-events-auto ${arrowClass}`}
          onClick={() => move("left")}
        >
          ‹
        </button>
        <button
          type="button"
          aria-label={`${ariaLabel} next`}
          className={`pointer-events-auto ${arrowClass}`}
          onClick={() => move("right")}
        >
          ›
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="overflow-hidden scroll-smooth px-3 sm:px-0"
      >
        <div className={`flex w-max ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
}
