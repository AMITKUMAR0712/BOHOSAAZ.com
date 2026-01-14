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
  ctaText: string | null;
  ctaHref: string | null;
  sortOrder: number;
  couponCode: string | null;
  coupon: BannerCoupon;
};

type HomeThemeId = "studio" | "market" | "commerce" | "noir" | "atlas" | "heritage" | "mono";

function discountLabel(coupon: BannerCoupon) {
  if (!coupon) return null;
  if (coupon.type === "PERCENT") {
    const pct = Math.round(Number(coupon.value));
    return `${pct}% OFF`;
  }
  const amount = Math.round(Number(coupon.value));
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} OFF`;
}

function appendCouponParam(href: string, couponCode: string) {
  try {
    const url = new URL(href, "http://local");
    if (!url.searchParams.get("coupon")) url.searchParams.set("coupon", couponCode);
    const path = `${url.pathname}${url.search ? url.search : ""}${url.hash ? url.hash : ""}`;
    return href.startsWith("http://") || href.startsWith("https://") ? url.toString() : path;
  } catch {
    const joiner = href.includes("?") ? "&" : "?";
    return `${href}${joiner}coupon=${encodeURIComponent(couponCode)}`;
  }
}

export function BannerCarousel({
  lang,
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

  // Auto-swipe every 4s; pause on hover.
  useEffect(() => {
    if (safeBanners.length <= 1) return;
    if (paused) return;
    const t = setInterval(() => {
      setIndex((prev) => {
        const n = safeBanners.length;
        return n ? (prev + 1) % n : 0;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [paused, safeBanners.length]);

  if (!safeBanners.length) return null;

  const href = (() => {
    if (!current) return null;
    const base = current.ctaHref?.trim() || null;
    if (!base) return current.couponCode ? `/${lang}/offers?coupon=${encodeURIComponent(current.couponCode)}` : null;
    return current.couponCode ? appendCouponParam(base, current.couponCode) : base;
  })();

  const badge = discountLabel(current?.coupon ?? null);

  const chrome = (() => {
    if (homeTheme !== "commerce") {
      return {
        shell: "relative overflow-hidden rounded-[28px] border border-border bg-card shadow-premium",
        overlay: "absolute inset-0 bg-linear-to-r from-background/85 via-background/55 to-transparent",
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
      overlay: "absolute inset-0 bg-linear-to-r from-background/92 via-background/70 to-transparent",
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
    <section className="mx-auto w-full max-w-6xl px-4">
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
        <div className="relative aspect-16/7 w-full">
          <img
            src={current?.imageUrl}
            alt={current?.title || "Banner"}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className={chrome.overlay} />

          <div className="relative z-10 flex h-full flex-col justify-end p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-2">
              {current?.highlightText ? (
                <span className={chrome.chipA}>
                  {current.highlightText}
                </span>
              ) : null}
              {badge ? (
                <span className={chrome.chipB}>
                  {badge}
                </span>
              ) : null}
            </div>

            <div className="mt-4 font-heading text-2xl md:text-4xl tracking-tight text-foreground">
              {current?.title}
            </div>
            {current?.subtitle ? (
              <div className="mt-2 max-w-xl text-sm md:text-base text-muted-foreground">
                {current.subtitle}
              </div>
            ) : null}

            {href ? (
              <div className="mt-6">
                <a
                  href={href}
                  className={chrome.cta}
                >
                  {current?.ctaText?.trim() || "Shop now"}
                </a>
              </div>
            ) : null}
          </div>
        </div>

        {safeBanners.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              className={
                "absolute left-3 top-1/2 -translate-y-1/2 " +
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
                "absolute right-3 top-1/2 -translate-y-1/2 " +
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
