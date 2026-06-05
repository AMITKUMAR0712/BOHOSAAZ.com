import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";

const querySchema = z.object({
  placement: z.string().trim().min(1),
  device: z.enum(["ALL", "MOBILE", "DESKTOP"]).optional(),
});

function extractProductSlug(linkUrl: string | null) {
  if (!linkUrl) return null;
  try {
    const url = linkUrl.startsWith("http") ? new URL(linkUrl) : new URL(linkUrl, "https://bohosaaz.local");
    const parts = url.pathname.split("/").filter(Boolean);
    const pIndex = parts.indexOf("p");
    if (pIndex >= 0 && parts[pIndex + 1]) return decodeURIComponent(parts[pIndex + 1]);
  } catch {
    const match = linkUrl.match(/\/p\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(sp);
  if (!parsed.success) return jsonError("Invalid query", 400);

  const { placement, device } = parsed.data;
  const now = new Date();

  const ads = await prisma.ad.findMany({
    where: {
      placement: placement as any,
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        device
          ? {
              OR: [{ targetDevice: "ALL" }, { targetDevice: device }],
            }
          : {},
      ],
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: placement === "HOME_BETWEEN_SECTIONS" ? 20 : 10,
  });

  const spotlightSlugs = ads
    .filter((ad) => ad.type === "PRODUCT_SPOTLIGHT")
    .map((ad) => extractProductSlug(ad.linkUrl))
    .filter((slug): slug is string => Boolean(slug));

  const products = spotlightSlugs.length
    ? await prisma.product.findMany({
        where: { slug: { in: spotlightSlugs }, isActive: true },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          vendor: { select: { id: true, shopName: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        },
      })
    : [];

  const productBySlug = new Map(products.map((product) => [product.slug, product]));
  let enrichedAds: Array<Record<string, any>> = ads.map((ad) => {
    if (ad.type !== "PRODUCT_SPOTLIGHT") return ad;
    const slug = extractProductSlug(ad.linkUrl);
    return {
      ...ad,
      product: slug ? productBySlug.get(slug) ?? null : null,
    };
  });

  if (placement === "HOME_BETWEEN_SECTIONS") {
    const selectedProductIds = new Set(
      enrichedAds
        .filter((ad) => ad.type === "PRODUCT_SPOTLIGHT")
        .map((ad) => ("product" in ad ? ad.product?.id : null))
        .filter((id): id is string => Boolean(id))
    );
    const spotlightCount = selectedProductIds.size;

    if (spotlightCount < 10) {
      const fallbackProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          ...(selectedProductIds.size ? { id: { notIn: Array.from(selectedProductIds) } } : {}),
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          vendor: { select: { id: true, shopName: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        },
        orderBy: { createdAt: "desc" },
        take: 10 - spotlightCount,
      });

      enrichedAds = [
        ...enrichedAds,
        ...fallbackProducts.map((product, index) => ({
          id: `featured-fallback-${product.id}`,
          title: product.title,
          placement,
          type: "PRODUCT_SPOTLIGHT" as const,
          imageUrl: null,
          linkUrl: `/p/${product.slug}`,
          html: null,
          startsAt: null,
          endsAt: null,
          isActive: true,
          priority: -1000 - index,
          impressions: 0,
          clicks: 0,
          targetDevice: "ALL" as const,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          product,
          isFallback: true,
        })),
      ];
    }

    enrichedAds = enrichedAds.filter((ad) => ad.type === "PRODUCT_SPOTLIGHT" && "product" in ad && ad.product).slice(0, 10);
  }

  return jsonOk({ ads: enrichedAds });
}
