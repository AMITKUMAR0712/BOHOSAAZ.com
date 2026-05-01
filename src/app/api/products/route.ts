import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const querySchema = z.object({
  mode: z.enum(["trending", "latest", "offers"]).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
  q: z.string().trim().min(1).optional(),
  vendorId: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  size: z.string().trim().min(1).optional(),
  color: z.string().trim().min(1).optional(),
  inStock: z.string().trim().optional(),
  discountOnly: z.string().trim().optional(),
  sort: z.enum(["latest", "price_asc", "price_desc", "offer"]).optional(),
});

function toBool(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function offersWhere(): Prisma.ProductWhereInput {
  const offerTagSlugs = ["offer", "offers", "sale", "special-offer", "special"];
  return {
    OR: [
      { salePrice: { not: null } },
      { tags: { some: { tag: { slug: { in: offerTagSlugs } } } } },
    ],
  };
}

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }

  const requestedMode = parsed.data.mode;
  const requestedSort = parsed.data.sort;
  const effectiveMode: "trending" | "latest" | "offers" | undefined =
    requestedMode ?? (requestedSort === "offer" ? "offers" : undefined);

  const { limit, q, vendorId, category, minPrice, maxPrice, size, color } = parsed.data;
  const inStock = toBool(parsed.data.inStock);
  const discountOnly = toBool(parsed.data.discountOnly);
  const sort = requestedSort === "offer" ? undefined : requestedSort;
  const take = limit ?? 48;

  const variantFilters = {
    ...(size ? { size } : {}),
    ...(color ? { color } : {}),
    ...(inStock ? { stock: { gt: 0 } } : {}),
  };

  const hasVariantFilter = Boolean(size || color);

  const priceRange: Prisma.FloatFilter | undefined =
    minPrice != null || maxPrice != null
      ? {
          ...(minPrice != null ? { gte: minPrice } : {}),
          ...(maxPrice != null ? { lte: maxPrice } : {}),
        }
      : undefined;

  const productPriceFilter: Prisma.ProductWhereInput | undefined = priceRange
    ? {
        OR: [{ salePrice: priceRange }, { salePrice: null, price: priceRange }],
      }
    : undefined;

  const variantPriceFilter: Prisma.ProductVariantWhereInput | undefined = priceRange
    ? {
        OR: [{ salePrice: priceRange }, { salePrice: null, price: priceRange }],
      }
    : undefined;

  const and: Prisma.ProductWhereInput[] = [{ isActive: true }];

  if (q) {
    and.push({
      OR: [
        { title: { contains: q } },
        { slug: { contains: q } },
        { description: { contains: q } },
      ],
    });
  }

  if (vendorId) {
    and.push({ vendorId });
  }

  if (category) {
    and.push({ OR: [{ categoryId: category }, { category: { slug: category } }] });
  }

  if (hasVariantFilter || variantPriceFilter) {
    and.push({
      variants: {
        some: {
          isActive: true,
          ...variantFilters,
          ...(variantPriceFilter ?? {}),
        },
      },
    });
  } else if (productPriceFilter) {
    and.push(productPriceFilter);
  }

  if (inStock && !(hasVariantFilter || variantPriceFilter)) {
    and.push({
      OR: [
        { stock: { gt: 0 } },
        { variants: { some: { isActive: true, stock: { gt: 0 } } } },
      ],
    });
  }

  if (discountOnly && effectiveMode !== "offers") {
    and.push({ salePrice: { not: null } });
  }

  if (effectiveMode === "offers") {
    and.push(offersWhere());
  }

  // Trending is derived from recent orders (fallback to newest)
  if (effectiveMode === "trending") {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const grouped = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        createdAt: { gte: since },
        order: { status: { not: "PENDING" } },
        product: { isActive: true },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take,
    });

    const ids = grouped.map((g) => g.productId);
    if (ids.length === 0) {
      const products = await prisma.product.findMany({
        where: { AND: and },
        take,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          vendor: { select: { id: true, shopName: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        },
        orderBy: { createdAt: "desc" },
      });

      return Response.json({ products });
    }

    const products = await prisma.product.findMany({
      where: { AND: [...and, { id: { in: ids } }] },
      take,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, shopName: true } },
        images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      },
    });

    const byId = new Map(products.map((p) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
    return Response.json({ products: ordered });
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { price: "asc" }
      : sort === "price_desc"
        ? { price: "desc" }
        : { createdAt: "desc" };

  try {
    const products = await prisma.product.findMany({
      where: { AND: and },
      take,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, shopName: true } },
        images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      },
      orderBy: effectiveMode === "latest" ? { createdAt: "desc" } : orderBy,
    });

    return Response.json({ products });
  } catch (err) {
    console.error("[api/products] GET failed:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
