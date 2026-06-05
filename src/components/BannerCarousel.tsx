"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";

type BannerCoupon = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
} | null;

export type HomeBanner = {
  id: string;
  title: string;
  highlightText: string | null;
  subtitle: string | null;
  imageUrl: string;
  videoUrl?: string | null;
  ctaText: string | null;
  ctaHref: string | null;
  sortOrder: number;
  couponCode: string | null;
  coupon: BannerCoupon;
};

type HomeThemeId = "studio" | "market" | "commerce" | "noir" | "atlas" | "heritage" | "mono";
const SLIDE_MS = 5000;

export function BannerCarousel({
  banners,
  homeTheme,
}: {
  lang: string;
  banners: HomeBanner[];
  homeTheme?: HomeThemeId;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const hoveredRef = useRef(false);

  const safeBanners = useMemo(() => banners.filter(Boolean), [banners]);
  const current = safeBanners[index] ?? null;

  const go = (next: number) => {
    const n = safeBanners.length;
    const i = ((next % n) + n) % n;
    setIndex(i);
  };

  // Each gifting story plays for 5 seconds, then moves to the next banner/video.
  useEffect(() => {
    if (safeBanners.length <= 1) return;
    if (paused) return;
    const t = setTimeout(() => {
      setIndex((prev) => {
        const n = safeBanners.length;
        return n ? (prev + 1) % n : 0;
      });
    }, SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, paused, safeBanners.length]);

  if (!safeBanners.length) return null;

  const storyUrl = current?.videoUrl?.trim() || null;
  const isAnimatedSvgStory = Boolean(storyUrl?.toLowerCase().split("?")[0]?.endsWith(".svg"));

  const chrome = (() => {
    if (homeTheme !== "commerce") {
      return {
        shell: "relative overflow-hidden rounded-[34px] border border-border/80 bg-card/80 shadow-premium backdrop-blur-xl",
        overlay: "absolute inset-0 bg-linear-to-r from-background/82 via-background/48 to-background/5",
        cta: "inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 transition",
        nav: "rounded-full border border-border bg-background/70 px-3 py-2 text-sm backdrop-blur hover:bg-background/85 transition",
        dotOn: "bg-primary",
        dotOff: "bg-background/80",
        chipA:
          "inline-flex items-center rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur",
        chipB:
          "inline-flex items-center rounded-full border border-border bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-primary backdrop-blur",
      };
    }

    // Commerce: more retail/boxed, clearer chrome (Amazon-like vibe)
    return {
      shell: "relative overflow-hidden rounded-2xl border-2 border-border bg-background shadow-sm",
        overlay: "absolute inset-0 bg-linear-to-r from-background/86 via-background/58 to-transparent",
      cta: "inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md transition",
      nav: "rounded-lg border border-border bg-background/85 px-3 py-2 text-sm backdrop-blur hover:bg-background transition",
      dotOn: "bg-foreground",
      dotOff: "bg-muted",
      chipA:
        "inline-flex items-center rounded-md border border-border bg-muted/25 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-foreground",
      chipB:
        "inline-flex items-center rounded-md border border-border bg-primary/15 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-primary",
    };
  })();

  return (
    <section className="mx-auto w-full max-w-6xl px-3 sm:px-4">
      <div
        className={chrome.shell}
        onMouseEnter={() => {
          hoveredRef.current = true;
          setPaused(true);
        }}
        onMouseLeave={() => {
          hoveredRef.current = false;
          setPaused(false);
        }}
      >
        <div className="relative min-h-[280px] w-full sm:aspect-16/7 sm:min-h-0">
          {storyUrl ? (
            isAnimatedSvgStory ? (
              <img
                src={storyUrl}
                alt={current?.title || "Bohosaaz gifting story"}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
              />
            ) : (
            <video
              key={storyUrl}
              src={storyUrl}
              poster={current.imageUrl || undefined}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              playsInline
              preload="auto"
              onLoadedData={(event) => {
                event.currentTarget.currentTime = 0;
                void event.currentTarget.play().catch(() => undefined);
              }}
            />
            )
          ) : (
            <img
              src={current?.imageUrl}
              alt={current?.title || "Banner"}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          )}
          <div className={chrome.overlay} />

          <div className="relative z-10 h-full" />
        </div>

        {safeBanners.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              className={
                "absolute left-2 top-1/2 -translate-y-1/2 sm:left-3 " +
                chrome.nav
              }
              aria-label="Previous banner"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className={
                "absolute right-2 top-1/2 -translate-y-1/2 sm:right-3 " +
                chrome.nav
              }
              aria-label="Next banner"
            >
              ›
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {safeBanners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => go(i)}
                  className={
                    "h-2.5 w-2.5 rounded-full border border-border transition " +
                    (i === index ? chrome.dotOn : chrome.dotOff)
                  }
                  aria-label={`Go to banner ${i + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
