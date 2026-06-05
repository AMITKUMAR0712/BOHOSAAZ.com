"use client";

import Image from "next/image";
import sanitizeHtml from "sanitize-html";
import { useEffect, useMemo, useRef, useState } from "react";

type AdTargetDevice = "ALL" | "MOBILE" | "DESKTOP";

type Ad = {
  id: string;
  title: string;
  placement: string;
  type: "IMAGE_BANNER" | "HTML_SNIPPET" | "VIDEO" | "PRODUCT_SPOTLIGHT" | "BRAND_SPOTLIGHT";
  imageUrl: string | null;
  linkUrl: string | null;
  html: string | null;
  isFallback?: boolean;
  product?: {
    id: string;
    title: string;
    slug: string;
    currency?: "INR" | "USD" | string;
    mrp?: number | null;
    price: number;
    salePrice?: number | null;
    createdAt?: string | Date;
    images?: Array<{ url: string; isPrimary?: boolean }>;
    vendorId?: string | null;
    vendor?: { id?: string | null } | null;
  } | null;
};

function isAd(value: unknown): value is Ad {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.placement === "string" &&
    typeof v.type === "string"
  );
}

function extractAds(payload: unknown): Ad[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;

  const candidates: unknown[] = [];
  if (Array.isArray(root.ads)) candidates.push(root.ads);

  if (root.data && typeof root.data === "object") {
    const data = root.data as Record<string, unknown>;
    if (Array.isArray(data.ads)) candidates.push(data.ads);
  }

  const firstArray = candidates.find(Array.isArray);
  if (!firstArray || !Array.isArray(firstArray)) return [];
  return firstArray.filter(isAd);
}

function detectDevice(): AdTargetDevice {
  if (typeof window === "undefined") return "ALL";
  // simplest: treat narrow screens as mobile
  return window.matchMedia && window.matchMedia("(max-width: 768px)").matches ? "MOBILE" : "DESKTOP";
}

export function AdSlot({
  placement,
  className,
  langPrefix = "",
}: {
  placement:
    | "HOME_TOP"
    | "HOME_BETWEEN_SECTIONS"
    | "HOME_SIDEBAR"
    | "CATEGORY_TOP"
    | "PRODUCT_DETAIL_RIGHT"
    | "FOOTER_STRIP"
    | "SEARCH_TOP";
  className?: string;
  langPrefix?: string;
}) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const impressedIds = useRef(new Set<string>());

  const device = useMemo(() => detectDevice(), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const sp = new URLSearchParams();
      sp.set("placement", placement);
      sp.set("device", device);

      const res = await fetch(`/api/ads?${sp.toString()}`, { cache: "no-store" }).catch(() => null);
      const payload: unknown = res ? await res.json().catch(() => null) : null;
      const list = extractAds(payload);
      if (!cancelled) {
        setAds(list);
        setLoading(false);
        impressedIds.current = new Set();
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [placement, device]);

  useEffect(() => {
    for (const ad of ads) {
      if (ad.isFallback) continue;
      if (impressedIds.current.has(ad.id)) continue;
      impressedIds.current.add(ad.id);
      void fetch(`/api/ads/${encodeURIComponent(ad.id)}/impression`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referrer: typeof window !== "undefined" ? window.location.href : undefined }),
      }).catch(() => null);
    }
  }, [ads]);

  async function trackClick(ad: Ad) {
    if (!ad) return;
    if (ad.isFallback) return;
    void fetch(`/api/ads/${encodeURIComponent(ad.id)}/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: typeof window !== "undefined" ? window.location.href : undefined }),
    }).catch(() => null);
  }

  if (loading) return null;
  if (!ads.length) return null;

  const wrap = (ad: Ad, node: React.ReactNode) => {
    if (!ad.linkUrl) return node;
    return (
      <a
        href={ad.linkUrl}
        onClick={() => {
          void trackClick(ad);
        }}
        className="block"
        rel="noreferrer"
      >
        {node}
      </a>
    );
  };

  const ad = ads.find((item) => item.type !== "PRODUCT_SPOTLIGHT");
  if (!ad) return null;

  if (ad.type === "IMAGE_BANNER" && ad.imageUrl) {
    return (
      <div className={className} aria-label={ad.title}>
        {wrap(
          ad,
          <div className="group relative overflow-hidden rounded-[38px] border border-primary/15 bg-card/80 p-2 shadow-[0_24px_80px_rgba(47,38,34,0.12)] backdrop-blur-2xl transition hover:-translate-y-1 hover:shadow-premium">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-amber-500/10 opacity-80" />
            <Image
              src={ad.imageUrl}
              alt={ad.title}
              width={1400}
              height={500}
              className="relative h-auto w-full rounded-[30px] object-cover transition duration-500 group-hover:scale-[1.015]"
              priority={placement === "HOME_TOP"}
            />
          </div>
        )}
      </div>
    );
  }

  if (ad.type === "HTML_SNIPPET" && ad.html) {
    const safe = sanitizeHtml(ad.html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "video", "source"]),
      allowedAttributes: {
        a: ["href", "name", "target", "rel"],
        img: ["src", "alt", "title", "width", "height"],
        video: ["src", "controls", "autoplay", "muted", "loop", "playsinline"],
        source: ["src", "type"],
        "*": ["class", "style"],
      },
      allowedSchemes: ["http", "https", "data"],
    });

    return (
      <div className={className} aria-label={ad.title}>
        {wrap(
          ad,
          <div
            className="overflow-hidden rounded-[38px] border border-primary/15 bg-card/80 p-3 shadow-[0_24px_80px_rgba(47,38,34,0.12)] backdrop-blur-2xl"
            dangerouslySetInnerHTML={{ __html: safe }}
          />
        )}
      </div>
    );
  }

  return null;
}
