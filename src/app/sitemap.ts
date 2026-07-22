import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo/config";

type SitemapProduct = {
  slug: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasStringSlug(value: unknown): value is SitemapProduct {
  return isRecord(value) && typeof value.slug === "string";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE.url;

  // static routes (full locale-aware sitemap lands in Part 4)
  const staticRoutes = ["", "/en", "/en/about", "/en/contact", "/en/terms", "/en/privacy"].map(
    (p) => ({
      url: `${baseUrl}${p}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: p === "" || p === "/en" ? 1 : 0.7,
    })
  );

  const res = await fetch(`${baseUrl}/api/products`, { cache: "no-store" }).catch(() => null);
  const data: unknown = res ? await res.json().catch(() => null) : null;
  const products: unknown[] = isRecord(data) && Array.isArray(data.products) ? data.products : [];

  const productRoutes = products.filter(hasStringSlug).map((p) => ({
    url: `${baseUrl}/en/p/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
