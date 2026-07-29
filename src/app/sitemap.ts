import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/seo/config";
import { LOCAL_GIFT_AREAS } from "@/lib/seo/local-areas";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE.url;
  const now = new Date();

  const staticPaths = [
    "",
    "/en",
    "/en/shop",
    "/en/categories",
    "/en/offers",
    "/en/latest",
    "/en/blog",
    "/en/faq",
    "/en/about",
    "/en/contact",
    "/en/terms",
    "/en/privacy",
    "/en/return",
    "/en/brands/popular",
    "/en/brands/luxury",
    ...LOCAL_GIFT_AREAS.map((area) => `/en/gifts-in-${area.slug}`),
  ];

  const staticRoutes: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/en" ? "daily" : "weekly",
    priority:
      path === "" || path === "/en"
        ? 1
        : path.includes("/shop") || path.includes("/gifts-in-")
          ? 0.9
          : 0.7,
  }));

  try {
    const [products, categories, brands, posts] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, status: "PUBLISHED", deletedAt: null },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.category.findMany({
        where: { isHidden: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.brand.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.blogPost.findMany({
        where: {
          isPublished: true,
          OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
        },
        select: { slug: true, updatedAt: true, publishedAt: true },
      }),
    ]);

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/en/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${baseUrl}/en/c/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly",
      priority: 0.75,
    }));

    const brandRoutes: MetadataRoute.Sitemap = brands.map((b) => ({
      url: `${baseUrl}/en/brand/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: "weekly",
      priority: 0.65,
    }));

    const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${baseUrl}/en/blog/${post.slug}`,
      lastModified: post.updatedAt || post.publishedAt || now,
      changeFrequency: "monthly",
      priority: 0.75,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...brandRoutes, ...blogRoutes];
  } catch {
    return staticRoutes;
  }
}
