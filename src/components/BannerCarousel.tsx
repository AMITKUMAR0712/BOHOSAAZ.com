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
  compact = false,
}: {
  lang: string;
  banners: HomeBanner[];
  homeTheme?: HomeThemeId;
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failedMedia, setFailedMedia] = useState<Record<string, true>>({});
  const [readyMedia, setReadyMedia] = useState<Record<string, true>>({});
  const [videoEnabled, setVideoEnabled] = useState(false);
  const hoveredRef = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const safeBanners = useMemo(() => banners.filter(Boolean), [banners]);
  const current = safeBanners[index] ?? null;

  const mediaFromImageUrl =
    current?.imageUrl && isVideoUrl(current.imageUrl) ? current.imageUrl.trim() : null;
  const storyUrl = current?.videoUrl?.trim() || mediaFromImageUrl || null;
  const posterUrl = current?.imageUrl && !isVideoUrl(current.imageUrl) ? current.imageUrl : null;
  const isAnimatedSvgStory = Boolean(storyUrl?.toLowerCase().split("?")[0]?.endsWith(".svg"));
  const mediaFailed = storyUrl ? Boolean(failedMedia[storyUrl]) : false;
  const mediaReady = storyUrl ? Boolean(readyMedia[storyUrl]) : false;
  const isLoopingVideo = Boolean(storyUrl && !isAnimatedSvgStory && !mediaFailed && videoEnabled);

  const go = (next: number) => {
    const n = safeBanners.length;
    const i = ((next % n) + n) % n;
    setIndex(i);
  };

  // Defer video network until visible + idle so poster can be LCP.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    let idleId: number | undefined;
    let timeoutId: number | undefined;
    let activated = false;

    const activate = () => {
      if (activated) return;
      activated = true;
      setVideoEnabled(true);
    };

    const schedule = () => {
      const ric = (window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback;

      if (typeof ric === "function") {
        idleId = ric(() => activate(), { timeout: 1800 });
      } else {
        timeoutId = window.setTimeout(activate, 1200);
      }
    };

    if (typeof IntersectionObserver === "undefined") {
      schedule();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          schedule();
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      const cic = (window as Window & {
        cancelIdleCallback?: (id: number) => void;
      }).cancelIdleCallback;
      if (idleId !== undefined && typeof cic === "function") {
        cic(idleId);
      }
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  // Image slides advance every 5s. Video slides stay put and loop.
  useEffect(() => {
    if (safeBanners.length <= 1) return;
    if (paused) return;
    if (isLoopingVideo) return;
    const t = setTimeout(() => {
      setIndex((prev) => {
        const n = safeBanners.length;
        return n ? (prev + 1) % n : 0;
      });
    }, SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, paused, safeBanners.length, isLoopingVideo]);

  if (!safeBanners.length) return null;

  const chrome = (() => {
    if (homeTheme !== "commerce") {
      return {
        shell: "relative h-full overflow-hidden rounded-[34px] bg-card shadow-premium",
        overlay:
          "pointer-events-none absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent",
        cta: "inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 transition",
        nav: "rounded-full border border-border bg-background/70 px-3 py-2 text-sm backdrop-blur hover:bg-background/85 transition",
        dotOn: "bg-primary",
        dotOff: "bg-background/80",
      };
    }

    return {
      shell: "relative h-full overflow-hidden rounded-2xl bg-background shadow-sm",
      overlay:
        "pointer-events-none absolute inset-0 bg-linear-to-t from-black/8 via-transparent to-transparent",
      cta: "inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md transition",
      nav: "rounded-lg border border-border bg-background/85 px-3 py-2 text-sm backdrop-blur hover:bg-background transition",
      dotOn: "bg-foreground",
      dotOff: "bg-muted",
    };
  })();

  return (
    <section
      className={compact ? "w-full" : "home-banner-screen mx-auto w-full max-w-6xl px-3 sm:px-4"}
    >
      <div
        ref={rootRef}
        className={`${chrome.shell} ${compact ? "aspect-4/3 h-auto w-full sm:aspect-16/10" : ""}`}
        onMouseEnter={() => {
          hoveredRef.current = true;
          setPaused(true);
        }}
        onMouseLeave={() => {
          hoveredRef.current = false;
          setPaused(false);
        }}
      >
        <div
          className={
            compact
              ? "relative h-full w-full bg-black/5"
              : "home-banner-media relative flex w-full items-center justify-center bg-black/5"
          }
        >
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={current?.title || "Banner"}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width={1200}
              height={750}
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
                loading="lazy"
                decoding="async"
                onError={() => setFailedMedia((prev) => ({ ...prev, [storyUrl]: true }))}
              />
            ) : videoEnabled ? (
              <video
                key={storyUrl}
                src={storyUrl}
                poster={posterUrl || undefined}
                className={`${
                  compact
                    ? "absolute inset-0 h-full w-full object-cover object-center"
                    : "absolute inset-0 m-auto h-full w-full max-h-full max-w-full object-contain object-center"
                } transition-opacity duration-300 ${mediaReady ? "opacity-100" : "opacity-0"}`}
                autoPlay
                loop
                muted
                playsInline
                preload="none"
                onLoadedData={(event) => {
                  setReadyMedia((prev) => ({ ...prev, [storyUrl]: true }));
                  void event.currentTarget.play().catch(() => undefined);
                }}
                onCanPlay={(event) => {
                  void event.currentTarget.play().catch(() => undefined);
                }}
                onError={() => setFailedMedia((prev) => ({ ...prev, [storyUrl]: true }))}
              />
            ) : null
          ) : null}
          <div className={chrome.overlay} />
          <div className="relative z-10 h-full" />
        </div>

        {safeBanners.length > 1 ? (
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
        ) : null}
      </div>
    </section>
  );
}
