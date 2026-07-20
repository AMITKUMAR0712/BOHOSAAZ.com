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

function isVideoUrl(url: string | null | undefined) {
  const clean = (url ?? "").trim().toLowerCase().split("?")[0] ?? "";
  return clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".mov");
}

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
  const [failedMedia, setFailedMedia] = useState<Record<string, true>>({});
  const [readyMedia, setReadyMedia] = useState<Record<string, true>>({});
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

  const mediaFromImageUrl = current?.imageUrl && isVideoUrl(current.imageUrl) ? current.imageUrl.trim() : null;
  const storyUrl = current?.videoUrl?.trim() || mediaFromImageUrl || null;
  const posterUrl = current?.imageUrl && !isVideoUrl(current.imageUrl) ? current.imageUrl : null;
  const isAnimatedSvgStory = Boolean(storyUrl?.toLowerCase().split("?")[0]?.endsWith(".svg"));
  const mediaFailed = storyUrl ? Boolean(failedMedia[storyUrl]) : false;
  const mediaReady = storyUrl ? Boolean(readyMedia[storyUrl]) : false;

  const chrome = (() => {
    if (homeTheme !== "commerce") {
      return {
        shell: "relative overflow-hidden rounded-[34px] bg-card shadow-premium",
        overlay: "pointer-events-none absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent",
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
      shell: "relative overflow-hidden rounded-2xl bg-background shadow-sm",
        overlay: "pointer-events-none absolute inset-0 bg-linear-to-t from-black/8 via-transparent to-transparent",
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
        <div className="relative flex min-h-[220px] w-full items-center justify-center bg-black/5 sm:aspect-video sm:min-h-0">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={current?.title || "Banner"}
              className="absolute inset-0 h-full w-full object-cover"
              loading={storyUrl ? "eager" : "lazy"}
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-card to-amber-500/10" />
          )}

          {storyUrl && !mediaFailed ? (
            isAnimatedSvgStory ? (
              <img
                src={storyUrl}
                alt={current?.title || "Bohosaaz gifting story"}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
                onError={() => setFailedMedia((prev) => ({ ...prev, [storyUrl]: true }))}
              />
            ) : (
            <video
              key={storyUrl}
              src={storyUrl}
              poster={posterUrl || undefined}
              className={`absolute inset-0 m-auto h-full w-full max-h-full max-w-full object-contain object-center transition-opacity duration-300 ${
                mediaReady ? "opacity-100" : "opacity-0"
              }`}
              autoPlay
              muted
              playsInline
              preload="auto"
              onLoadedData={(event) => {
                setReadyMedia((prev) => ({ ...prev, [storyUrl]: true }));
                event.currentTarget.currentTime = 0;
                void event.currentTarget.play().catch(() => undefined);
              }}
              onError={() => setFailedMedia((prev) => ({ ...prev, [storyUrl]: true }))}
            />
            )
          ) : null}
          <div className={chrome.overlay} />

          <div className="relative z-10 h-full" />
        </div>

        {safeBanners.length > 1 ? (
          <>
            <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-2 sm:flex">
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
