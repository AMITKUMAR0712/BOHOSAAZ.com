import { z } from "zod";
import type { Prisma as PrismaType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);

  const parsed = z
    .object({
      q: z.string().trim().min(1).max(191).optional(),
      active: z.enum(["true", "false"]).optional(),
      take: z.coerce.number().int().min(1).max(100).optional(),
      cursor: z.string().trim().min(1).optional(),
    })
    .safeParse({
      q: url.searchParams.get("q") ?? undefined,
      active: (url.searchParams.get("active") ?? undefined) as
        | "true"
        | "false"
        | undefined,
      take: url.searchParams.get("take") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });

  if (!parsed.success) return jsonError("Invalid query", 400);

  const take = parsed.data.take ?? 50;

  const where: PrismaType.ProductWhereInput = {
    deletedAt: null,
    ...(parsed.data.q
      ? {
          OR: [
            { title: { contains: parsed.data.q } },
            { slug: { contains: parsed.data.q } },
            { sku: { contains: parsed.data.q } },
          ],
        }
      : {}),
    ...(parsed.data.active === "true" ? { isActive: true } : {}),
    ...(parsed.data.active === "false" ? { isActive: false } : {}),
  };

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      slug: true,
      sku: true,
      currency: true,
      mrp: true,
      price: true,
      salePrice: true,
      stock: true,
      isActive: true,
      createdAt: true,
      vendor: { select: { id: true, shopName: true, status: true } },
      category: { select: { id: true, name: true } },
      images: { select: { id: true, url: true, isPrimary: true }, orderBy: { createdAt: "asc" } },
    },
  });

  const nextCursor = products.length > take ? products[take]?.id : null;
  const items = products.slice(0, take);

  return jsonOk({ products: items, nextCursor });
}

const createSchema = z.object({
  title: z.string().trim().min(3).max(191),
  slug: z.string().trim().min(1).max(191).optional().nullable(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  categoryId: z.string().trim().min(1),
  brandId: z.string().trim().min(1).optional().nullable(),

  // pricing
  currency: z.enum(["INR", "USD"]),
  // base fields (optional when variants are provided)
  mrp: z.number().positive().optional().nullable(),
  price: z.number().positive().optional(),
  salePrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0).optional().default(0),
  sku: z.string().trim().max(191).optional().nullable(),
  barcode: z.string().trim().max(191).optional().nullable(),
  isActive: z.boolean().optional().default(true),

  // advanced attributes
  material: z.string().trim().min(1).optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  length: z.number().positive().optional().nullable(),
  width: z.number().positive().optional().nullable(),
  height: z.number().positive().optional().nullable(),
  dimensions: z
    .object({
      length: z.number().positive().optional(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
    })
    .optional()
    .nullable(),
  shippingClass: z.string().trim().min(1).optional().nullable(),

  countryOfOrigin: z.string().trim().max(191).optional().nullable(),
  warranty: z.string().trim().max(191).optional().nullable(),
  returnPolicy: z.string().trim().max(2000).optional().nullable(),

  metaTitle: z.string().trim().max(191).optional().nullable(),
  metaDescription: z.string().trim().max(500).optional().nullable(),
  metaKeywords: z.string().trim().max(500).optional().nullable(),

  sizeOptions: z.string().trim().max(500).optional().nullable(),
  colorOptions: z.string().trim().max(500).optional().nullable(),

  tags: z.array(z.string().trim().min(1)).max(20).optional().default([]),
  variants: z
    .array(
      z.object({
        size: z.string().trim().min(1),
        color: z.string().trim().min(1).optional().nullable(),
        sku: z.string().trim().min(1),
        price: z.number().positive(),
        salePrice: z.number().positive().optional().nullable(),
        stock: z.number().int().min(0),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .max(200)
    .optional()
    .default([]),
}).superRefine((v, ctx) => {
  const hasVariants = Array.isArray(v.variants) && v.variants.length > 0;
  if (!hasVariants) {
    if (v.price == null || !Number.isFinite(v.price) || v.price <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "price is required" });
    }
    if (v.salePrice != null && v.price != null && v.salePrice > v.price) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "salePrice must be less than or equal to price" });
    }
    if (v.mrp != null && v.price != null && v.price > v.mrp) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "price must be less than or equal to mrp" });
    }
  }
  if (v.mrp != null && v.salePrice != null && v.price != null) {
    // salePrice <= price <= mrp
    if (v.salePrice > v.price) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "salePrice must be less than or equal to price" });
    }
    if (v.price > v.mrp) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "price must be less than or equal to mrp" });
    }
  }
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) return jsonError("Category not found", 400);

  if (parsed.data.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: parsed.data.brandId } });
    if (!brand) return jsonError("Brand not found", 400);
  }

  // Ensure an admin-owned vendor profile exists to attach products.
  const vendor = await prisma.vendor.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      shopName: admin.name ? `${admin.name} (Admin)` : "Bohosaaz Admin",
      status: "APPROVED",
      commission: 0,
    },
    select: { id: true, shopName: true },
  });

  const base = slugify(parsed.data.slug || parsed.data.title);
  if (!base) return jsonError("Invalid slug", 400);
  let slug = base;
  for (let i = 0; i < 10; i++) {
    const exists = await prisma.product.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const normalizedTags = (parsed.data.tags || [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);

  const normalizedVariants = (parsed.data.variants || [])
    .map((v) => ({
      ...v,
      sku: v.sku.trim(),
      size: v.size.trim(),
      color: v.color ? v.color.trim() : null,
    }))
    .filter((v) => v.sku && v.size);

  const skuSet = new Set<string>();
  for (const v of normalizedVariants) {
    const key = v.sku.toLowerCase();
    if (skuSet.has(key)) return jsonError("Duplicate variant SKU", 400);
    skuSet.add(key);
  }

  const hasVariants = normalizedVariants.length > 0;

  const basePrice = parsed.data.price ?? 0;
  const computedStock = hasVariants
    ? normalizedVariants.filter((v) => v.isActive).reduce((sum, v) => sum + v.stock, 0)
    : parsed.data.stock;

  const computedBasePrice = hasVariants
    ? Math.min(...normalizedVariants.map((v) => v.price))
    : basePrice;

  const computedBaseSale = hasVariants
    ? (() => {
        const sales = normalizedVariants
          .map((v) => v.salePrice)
          .filter((p): p is number => typeof p === "number" && Number.isFinite(p));
        return sales.length ? Math.min(...sales) : null;
      })()
    : parsed.data.salePrice ?? null;

  const created = await prisma.$transaction(async (tx) => {
    const dimL = parsed.data.length ?? parsed.data.dimensions?.length ?? null;
    const dimW = parsed.data.width ?? parsed.data.dimensions?.width ?? null;
    const dimH = parsed.data.height ?? parsed.data.dimensions?.height ?? null;

    const product = await tx.product.create({
      data: {
        vendorId: vendor.id,
        categoryId: parsed.data.categoryId,
        brandId: parsed.data.brandId ?? null,
        title: parsed.data.title,
        slug,
        description: parsed.data.description ?? null,
        shortDescription: parsed.data.shortDescription ?? null,
        currency: parsed.data.currency,
        mrp: hasVariants ? null : (parsed.data.mrp ?? null),
        price: computedBasePrice,
        salePrice: computedBaseSale,
        stock: computedStock,
        sku: hasVariants ? null : (parsed.data.sku ?? null),
        barcode: parsed.data.barcode ?? null,
        isActive: parsed.data.isActive,
        material: parsed.data.material ?? null,
        weight: parsed.data.weight ?? null,
        length: dimL,
        width: dimW,
        height: dimH,
        dimensions: parsed.data.dimensions ?? Prisma.DbNull,
        shippingClass: parsed.data.shippingClass ?? null,

        countryOfOrigin: parsed.data.countryOfOrigin ?? null,
        warranty: parsed.data.warranty ?? null,
        returnPolicy: parsed.data.returnPolicy ?? null,

        metaTitle: parsed.data.metaTitle ?? null,
        metaDescription: parsed.data.metaDescription ?? null,
        metaKeywords: parsed.data.metaKeywords ?? null,

        sizeOptions: parsed.data.sizeOptions ?? null,
        colorOptions: parsed.data.colorOptions ?? null,
      },
      select: { id: true, title: true, slug: true, vendorId: true, categoryId: true, isActive: true },
    });

    if (hasVariants) {
      await tx.productVariant.createMany({
        data: normalizedVariants.map((v) => ({
          productId: product.id,
          size: v.size,
          color: v.color ?? null,
          sku: v.sku,
          price: v.price,
          salePrice: v.salePrice ?? null,
          stock: v.stock,
          isActive: v.isActive,
        })),
      });
    }

    if (normalizedTags.length) {
      const tagRows = await Promise.all(
        normalizedTags.map(async (name) => {
          const tagSlug = slugify(name);
          return tx.tag.upsert({
            where: { slug: tagSlug },
            update: {},
            create: { name, slug: tagSlug },
          });
        }),
      );

      await tx.productTag.createMany({
        data: tagRows.map((t) => ({ productId: product.id, tagId: t.id })),
        skipDuplicates: true,
      });
    }

    return product;
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_PRODUCT_CREATE",
    entity: "Product",
    entityId: created.id,
    meta: {
      title: created.title,
      slug: created.slug,
      vendorId: created.vendorId,
      categoryId: created.categoryId,
      hasVariants,
      variantCount: normalizedVariants.length,
      tags: normalizedTags,
    },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ product: created }, { status: 201 });
}
