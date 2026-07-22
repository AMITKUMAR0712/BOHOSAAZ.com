import {
  DESCRIPTION_MAX,
  SITE,
  TITLE_MAX,
  TITLE_TEMPLATE_SUFFIX,
} from "@/lib/seo/config";

/** Full rendered title as users/Google see it (page segment + brand suffix). */
export function renderedTitle(pageTitle: string): string {
  return `${pageTitle}${TITLE_TEMPLATE_SUFFIX}`;
}

/**
 * Truncate a page-level title segment so the rendered title stays ≤ TITLE_MAX.
 * Page titles must NOT include the brand — the root template appends it.
 */
export function fitTitleSegment(segment: string, maxTotal = TITLE_MAX): string {
  const maxSegment = maxTotal - TITLE_TEMPLATE_SUFFIX.length;
  const cleaned = segment.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxSegment) return cleaned;
  if (maxSegment <= 1) return "…";
  return `${cleaned.slice(0, Math.max(1, maxSegment - 1)).trimEnd()}…`;
}

export function fitDescription(text: string, max = DESCRIPTION_MAX): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  if (max <= 1) return "…";
  return `${cleaned.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/**
 * Build-time / runtime assertion. Throws when SEO_STRICT=1 or during `next build`.
 * Truncation helpers should prevent failures; this catches regressions.
 */
export function assertSeoLimits(titleSegment: string, description: string): void {
  const fullTitle = renderedTitle(titleSegment);
  const isBuild =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.SEO_STRICT === "1";

  const titleOk = fullTitle.length <= TITLE_MAX;
  const descOk = description.length <= DESCRIPTION_MAX;

  if (titleOk && descOk) return;

  const message = [
    !titleOk
      ? `SEO title exceeds ${TITLE_MAX} chars (${fullTitle.length}): "${fullTitle}"`
      : null,
    !descOk
      ? `SEO description exceeds ${DESCRIPTION_MAX} chars (${description.length})`
      : null,
  ]
    .filter(Boolean)
    .join("; ");

  if (isBuild) {
    throw new Error(`[seo] ${message}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[seo] ${message}`);
  }
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${normalized === "/" ? "" : normalized}`;
}

export function ogImageUrl(title?: string, type?: "product" | "blog" | "page"): string {
  if (!title) return SITE.defaultOgImage;
  const params = new URLSearchParams({ title });
  if (type) params.set("type", type);
  return `/api/og?${params.toString()}`;
}
