import type { MetadataRoute } from "next";

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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // static routes
  const staticRoutes = ["", "/about", "/contact", "/terms", "/privacy"].map((p) => ({
    url: `${baseUrl}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  // products
  const res = await fetch(`${baseUrl}/api/products`, { cache: "no-store" });
  const data: unknown = await res.json().catch(() => null);
  const products: unknown[] = isRecord(data) && Array.isArray(data.products) ? data.products : [];

  const productRoutes = products
    .filter(hasStringSlug)
    .map((p) => ({
      url: `${baseUrl}/p/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

  return [...staticRoutes, ...productRoutes];
}
