import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";
import { Prisma } from "@prisma/client";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  if (payload.role !== "VENDOR") return Response.json({ error: "Forbidden" }, { status: 403 });

  // find vendor by userId
  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor profile not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const categoryId = (url.searchParams.get("categoryId") || "").trim();
  const active = url.searchParams.get("active");
  const lowStock = url.searchParams.get("lowStock");

  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize") || 20)));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductWhereInput = {
    vendorId: vendor.id,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { slug: { contains: q } },
            { sku: { contains: q } },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(active === "true" ? { isActive: true } : {}),
    ...(active === "false" ? { isActive: false } : {}),
    ...(lowStock === "true" ? { stock: { lte: 5 } } : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { images: true, category: true },
      skip,
      take: pageSize,
    }),
  ]);

  return Response.json({
    products,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

const createSchema = z.object({
  title: z.string().min(3),
  slug: z.string().trim().min(1).max(191).optional().nullable(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  categoryId: z.string().min(1),
  brandId: z.string().min(1).optional().nullable(),
  // pricing
  currency: z.enum(["INR", "USD"]).optional().default("INR"),
  mrp: z.number().positive().optional().nullable(),
  price: z.number().positive().optional(),
  salePrice: z.number().positive().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().trim().max(191).optional().nullable(),
  stock: z.number().int().min(0).optional().default(0),
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
      })
    )
    .max(200)
    .optional()
    .default([]),
}).superRefine((v, ctx) => {
  const hasVariants = Array.isArray(v.variants) && v.variants.length > 0;
  if (!hasVariants && v.price === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "price is required" });
  }

  if (v.mrp != null && v.price != null && v.price > v.mrp) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "price must be less than or equal to mrp" });
  }
  if (v.salePrice != null && v.price != null && v.salePrice > v.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "salePrice must be less than or equal to price" });
  }
});

export async function POST(req: NextRequest) {
  const rlKey = `vendor:product:create:${req.headers.get("x-forwarded-for") || "ip"}`;
  const limited = await rateLimit(rlKey);
  if (!limited.success) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  if (payload.role !== "VENDOR") return Response.json({ error: "Forbidden" }, { status: 403 });

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor profile not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const {
    title,
    slug: requestedSlug,
    price,
    categoryId,
    brandId,
    salePrice,
    currency,
    mrp,
    sku,
    barcode,
    stock,
    description,
    shortDescription,
    isActive,
    material,
    weight,
    length,
    width,
    height,
    dimensions,
    shippingClass,
    countryOfOrigin,
    warranty,
    returnPolicy,
    metaTitle,
    metaDescription,
    metaKeywords,
    sizeOptions,
    colorOptions,
    tags,
    variants,
  } = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return Response.json({ error: "Category not found" }, { status: 400 });

  if (brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true, isActive: true } });
    if (!brand) return Response.json({ error: "Brand not found" }, { status: 400 });
    if (!brand.isActive) return Response.json({ error: "Brand is not active" }, { status: 400 });
  }

  // unique slug (advanced safe)
  const base = slugify(requestedSlug || title);
  if (!base) return Response.json({ error: "Invalid slug" }, { status: 400 });
  let slug = base;
  for (let i = 0; i < 10; i++) {
    const exists = await prisma.product.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const normalizedTags = (tags || [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);

  const normalizedVariants = (variants || [])
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
    if (skuSet.has(key)) {
      return Response.json({ error: "Duplicate variant SKU" }, { status: 400 });
    }
    skuSet.add(key);
  }

  const hasVariants = normalizedVariants.length > 0;

  const basePrice = price ?? 0;
  const computedStock = hasVariants
    ? normalizedVariants.filter((v) => v.isActive).reduce((sum, v) => sum + v.stock, 0)
    : stock;

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
    : salePrice ?? null;

  const product = await prisma.$transaction(async (tx) => {
    const dimL = length ?? dimensions?.length ?? null;
    const dimW = width ?? dimensions?.width ?? null;
    const dimH = height ?? dimensions?.height ?? null;

    const created = await tx.product.create({
      data: {
        vendorId: vendor.id,
        categoryId,
        brandId: brandId ?? null,
        title,
        slug,
        currency,
        mrp: hasVariants ? null : (mrp ?? null),
        price: computedBasePrice,
        salePrice: computedBaseSale,
        stock: computedStock,
        sku: hasVariants ? null : (sku ?? null),
        barcode: barcode ?? null,
        shortDescription: shortDescription ?? null,
        description: description ?? null,
        isActive,
        material: material ?? null,
        weight: weight ?? null,
        length: dimL,
        width: dimW,
        height: dimH,
        dimensions: dimensions ?? Prisma.DbNull,
        shippingClass: shippingClass ?? null,

        countryOfOrigin: countryOfOrigin ?? null,
        warranty: warranty ?? null,
        returnPolicy: returnPolicy ?? null,

        metaTitle: metaTitle ?? null,
        metaDescription: metaDescription ?? null,
        metaKeywords: metaKeywords ?? null,

        sizeOptions: sizeOptions ?? null,
        colorOptions: colorOptions ?? null,
      },
      include: { images: true, category: true },
    });

    if (hasVariants) {
      await tx.productVariant.createMany({
        data: normalizedVariants.map((v) => ({
          productId: created.id,
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
        })
      );

      await tx.productTag.createMany({
        data: tagRows.map((t) => ({ productId: created.id, tagId: t.id })),
        skipDuplicates: true,
      });
    }

    return created;
  });

  await audit({
    actorId: payload.sub,
    actorRole: payload.role,
    action: "VENDOR_PRODUCT_CREATE",
    entity: "Product",
    entityId: product.id,
    meta: {
      title,
      slug,
      categoryId,
      currency,
      mrp: hasVariants ? null : (mrp ?? null),
      price: computedBasePrice,
      salePrice: computedBaseSale,
      stock: computedStock,
      isActive,
      hasVariants,
      variantCount: normalizedVariants.length,
      tags: normalizedTags,
    },
    ip: req.headers.get("x-forwarded-for") || undefined,
  });

  return Response.json({ product }, { status: 201 });
}
