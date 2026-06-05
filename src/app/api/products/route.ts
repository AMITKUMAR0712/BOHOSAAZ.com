import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const querySchema = z.object({
  mode: z.enum(["featured", "trending", "latest", "offers"]).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
  q: z.string().trim().min(1).optional(),
  vendorId: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  occasion: z.string().trim().min(1).optional(),
  recipient: z.string().trim().min(1).optional(),
  availability: z.string().trim().min(1).optional(),
  budget: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  size: z.string().trim().min(1).optional(),
  color: z.string().trim().min(1).optional(),
  inStock: z.string().trim().optional(),
  discountOnly: z.string().trim().optional(),
  sort: z.enum(["featured", "best_selling", "trending", "new_arrivals", "latest", "price_asc", "price_desc", "offer", "customer_favorites", "highest_rated"]).optional(),
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

function giftFilterWhere(term: string): Prisma.ProductWhereInput {
  const label = term
    .replace(/^(occasion|recipient|availability)-/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  const slugValue = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slugCandidates = Array.from(
    new Set([
      term,
      slugValue,
      `occasion-${slugValue}`,
      `recipient-${slugValue}`,
      `availability-${slugValue}`,
    ].filter(Boolean)),
  );
  const text = label || term.replace(/[_-]+/g, " ");

  return {
    OR: [
      { tags: { some: { tag: { slug: { in: slugCandidates } } } } },
      { tags: { some: { tag: { name: { contains: text } } } } },
      { title: { contains: text } },
      { shortDescription: { contains: text } },
      { description: { contains: text } },
      { category: { name: { contains: text } } },
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
  const effectiveMode: "featured" | "trending" | "latest" | "offers" | undefined =
    requestedMode ??
    (requestedSort === "featured"
      ? "featured"
      : requestedSort === "offer"
        ? "offers"
        : requestedSort === "trending" || requestedSort === "best_selling" || requestedSort === "customer_favorites"
          ? "trending"
          : requestedSort === "new_arrivals"
            ? "latest"
            : undefined);

  const { limit, q, vendorId, category, size, color } = parsed.data;
  const selectedBudget = (() => {
    const raw = parsed.data.budget;
    if (!raw) return undefined;
    const match = raw.match(/^(\d*)-(\d*)$/);
    if (!match) return undefined;
    const min = match[1] ? Number(match[1]) : undefined;
    const max = match[2] ? Number(match[2]) : undefined;
    if ((min != null && !Number.isFinite(min)) || (max != null && !Number.isFinite(max))) return undefined;
    return { min, max };
  })();
  const minPrice = selectedBudget?.min ?? parsed.data.minPrice;
  const maxPrice = selectedBudget?.max ?? parsed.data.maxPrice;
  const inStock = toBool(parsed.data.inStock);
  const discountOnly = toBool(parsed.data.discountOnly);
  const sort =
    requestedSort === "offer" ||
    requestedSort === "trending" ||
    requestedSort === "best_selling" ||
    requestedSort === "customer_favorites" ||
    requestedSort === "new_arrivals" ||
    requestedSort === "featured" ||
    requestedSort === "highest_rated"
      ? undefined
      : requestedSort;
  const take = limit ?? 48;

  const variantFilters: Prisma.ProductVariantWhereInput = {
    ...(size ? { size: { contains: size } } : {}),
    ...(color ? { color: { contains: color } } : {}),
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

  const and: Prisma.ProductWhereInput[] = [{ isActive: true, deletedAt: null }];

  if (q) {
    and.push({
      OR: [
        { title: { contains: q } },
        { slug: { contains: q } },
        { description: { contains: q } },
      ],
    });
  }

  const availabilityTagFilter =
    parsed.data.availability &&
    parsed.data.availability !== "in_stock" &&
    parsed.data.availability !== "new_arrivals" &&
    parsed.data.availability !== "discounted"
      ? parsed.data.availability
      : undefined;
  const giftFilters = [
    parsed.data.occasion,
    parsed.data.recipient,
    availabilityTagFilter,
  ].filter((v): v is string => Boolean(v));

  for (const term of giftFilters) {
    and.push(giftFilterWhere(term));
  }

  if (parsed.data.availability === "new_arrivals") {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    and.push({ createdAt: { gte: since } });
  }

  if (parsed.data.availability === "discounted") {
    and.push({ salePrice: { not: null } });
  }

  if (vendorId) {
    and.push({ vendorId });
  }

  if (category) {
    and.push({ OR: [{ categoryId: category }, { category: { slug: category } }] });
  }

  if (hasVariantFilter || variantPriceFilter) {
    and.push({
      OR: [
        {
          variants: {
            some: {
              isActive: true,
              ...variantFilters,
              ...(variantPriceFilter ?? {}),
            },
          },
        },
        ...(color && !size && !variantPriceFilter && !inStock ? [{ colorOptions: { contains: color } }] : []),
      ],
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

  if (effectiveMode === "featured") {
    and.push({ isFeatured: true });
  }

  if (effectiveMode === "trending") {
    and.push({ isTrending: true });
  }

  if (effectiveMode === "featured" || effectiveMode === "trending") {
    const products = await prisma.product.findMany({
      where: { AND: and },
      take,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, shopName: true } },
        images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return Response.json({ products });
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
