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
}) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const didImpress = useRef(false);

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
      const first = list[0] ?? null;
      if (!cancelled) {
        setAd(first);
        setLoading(false);
        didImpress.current = false;
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [placement, device]);

  useEffect(() => {
    if (!ad) return;
    if (didImpress.current) return;
    didImpress.current = true;

    void fetch(`/api/ads/${encodeURIComponent(ad.id)}/impression`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: typeof window !== "undefined" ? window.location.href : undefined }),
    }).catch(() => null);
  }, [ad]);

  async function trackClick() {
    if (!ad) return;
    void fetch(`/api/ads/${encodeURIComponent(ad.id)}/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: typeof window !== "undefined" ? window.location.href : undefined }),
    }).catch(() => null);
  }

  if (loading) return null;
  if (!ad) return null;

  const wrap = (node: React.ReactNode) => {
    if (!ad.linkUrl) return node;
    return (
      <a
        href={ad.linkUrl}
        onClick={() => {
          void trackClick();
        }}
        className="block"
        rel="noreferrer"
      >
        {node}
      </a>
    );
  };

  if (ad.type === "IMAGE_BANNER" && ad.imageUrl) {
    return (
      <div className={className} aria-label={ad.title}>
        {wrap(
          <div className="rounded-4xl border border-border bg-card/70 overflow-hidden shadow-premium">
            <Image
              src={ad.imageUrl}
              alt={ad.title}
              width={1400}
              height={500}
              className="w-full h-auto"
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
          <div
            className="rounded-4xl border border-border bg-card/70 shadow-premium overflow-hidden"
            dangerouslySetInnerHTML={{ __html: safe }}
          />
        )}
      </div>
    );
  }

  return null;
}
