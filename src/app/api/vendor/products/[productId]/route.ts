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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "VENDOR") return Response.json({ error: "Forbidden" }, { status: 403 });

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor profile not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });

  const { productId } = await ctx.params;

  const product = await prisma.product.findFirst({
    where: { id: productId, vendorId: vendor.id, deletedAt: null },
    include: {
      images: true,
      category: true,
      variants: { orderBy: { createdAt: "asc" } },
      tags: { include: { tag: true } },
    },
  });

  if (!product) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ product });
}

const patchSchema = z.object({
  title: z.string().min(3).optional(),
  slug: z.string().trim().min(1).max(191).optional(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  // pricing
  currency: z.enum(["INR", "USD"]).optional(),
  mrp: z.number().positive().optional().nullable(),
  price: z.number().positive().optional(),
  salePrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0).optional(),
  sku: z.string().optional().nullable(),
  barcode: z.string().trim().max(191).optional().nullable(),
  isActive: z.boolean().optional(),
  categoryId: z.string().min(1).optional(),
  brandId: z.string().min(1).optional().nullable(),

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

  tags: z.array(z.string().trim().min(1)).max(20).optional(),
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
    .optional(),
}).superRefine((v, ctx) => {
  if (v.mrp != null && v.price != null && v.price > v.mrp) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "price must be less than or equal to mrp" });
  }
  if (v.salePrice != null && v.price != null && v.salePrice > v.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "salePrice must be less than or equal to price" });
  }
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  const rlKey = `vendor:product:patch:${req.headers.get("x-forwarded-for") || "ip"}`;
  const limited = await rateLimit(rlKey);
  if (!limited.success) return Response.json({ error: "Too many requests" }, { status: 429 });

  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  if (payload.role !== "VENDOR") return Response.json({ error: "Forbidden" }, { status: 403 });

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor profile not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });

  const { productId } = await ctx.params;

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  if (product.vendorId !== vendor.id) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });
  const b = parsed.data;

  const nextPrice = b.price !== undefined ? b.price : product.price;
  const nextSale = b.salePrice !== undefined ? (b.salePrice ?? null) : product.salePrice;
  const nextMrp = b.mrp !== undefined ? (b.mrp ?? null) : product.mrp;

  if (nextSale != null && nextPrice != null && nextSale > nextPrice) {
    return Response.json({ error: "salePrice must be less than or equal to price" }, { status: 400 });
  }
  if (nextMrp != null && nextPrice != null && nextPrice > nextMrp) {
    return Response.json({ error: "price must be less than or equal to mrp" }, { status: 400 });
  }

  if (b.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: b.categoryId } });
    if (!category) return Response.json({ error: "Category not found" }, { status: 400 });
  }

  if (b.brandId !== undefined && b.brandId !== null) {
    const brand = await prisma.brand.findUnique({ where: { id: b.brandId }, select: { id: true, isActive: true } });
    if (!brand) return Response.json({ error: "Brand not found" }, { status: 400 });
    if (!brand.isActive) return Response.json({ error: "Brand is not active" }, { status: 400 });
  }

  const normalizedTags = b.tags
    ? b.tags.map((t) => t.trim()).filter(Boolean).slice(0, 20)
    : null;

  const normalizedVariants = b.variants
    ? b.variants
        .map((v) => ({
          ...v,
          sku: v.sku.trim(),
          size: v.size.trim(),
          color: v.color ? v.color.trim() : null,
        }))
        .filter((v) => v.sku && v.size)
    : null;

  if (normalizedVariants !== null) {
    const skuSet = new Set<string>();
    for (const v of normalizedVariants) {
      const key = v.sku.toLowerCase();
      if (skuSet.has(key)) {
        return Response.json({ error: "Duplicate variant SKU" }, { status: 400 });
      }
      skuSet.add(key);
    }
  }

  const slugBase = b.slug !== undefined ? slugify(b.slug) : null;
  if (b.slug !== undefined && !slugBase) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    let nextSlug: string | undefined;
    if (b.slug !== undefined) {
      const base = slugBase as string;
      let candidate = base;
      for (let i = 0; i < 10; i++) {
        const exists = await tx.product.findFirst({
          where: { slug: candidate, NOT: { id: productId } },
          select: { id: true },
        });
        if (!exists) break;
        candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }
      nextSlug = candidate;
    }

    const dimL =
      b.length !== undefined ? b.length : b.dimensions !== undefined ? (b.dimensions?.length ?? null) : undefined;
    const dimW =
      b.width !== undefined ? b.width : b.dimensions !== undefined ? (b.dimensions?.width ?? null) : undefined;
    const dimH =
      b.height !== undefined ? b.height : b.dimensions !== undefined ? (b.dimensions?.height ?? null) : undefined;

    // base product update
    const next = await tx.product.update({
      where: { id: productId },
      data: {
        title: b.title ?? undefined,
        slug: nextSlug ?? undefined,
        description: b.description ?? undefined,
        shortDescription: b.shortDescription !== undefined ? (b.shortDescription ?? null) : undefined,
        currency: b.currency ?? undefined,
        mrp: b.mrp !== undefined ? (b.mrp ?? null) : undefined,
        price: b.price ?? undefined,
        salePrice: b.salePrice !== undefined ? (b.salePrice ?? null) : undefined,
        stock: b.stock ?? undefined,
        sku: b.sku !== undefined ? (b.sku === null ? null : String(b.sku)) : undefined,
        barcode: b.barcode !== undefined ? (b.barcode ?? null) : undefined,
        isActive: b.isActive ?? undefined,
        categoryId: b.categoryId ?? undefined,
        brandId: b.brandId !== undefined ? b.brandId : undefined,
        material: b.material !== undefined ? (b.material ?? null) : undefined,
        weight: b.weight !== undefined ? (b.weight ?? null) : undefined,
        dimensions: b.dimensions !== undefined ? (b.dimensions ?? Prisma.DbNull) : undefined,
        length: dimL !== undefined ? dimL : undefined,
        width: dimW !== undefined ? dimW : undefined,
        height: dimH !== undefined ? dimH : undefined,
        shippingClass: b.shippingClass !== undefined ? (b.shippingClass ?? null) : undefined,

        countryOfOrigin: b.countryOfOrigin !== undefined ? (b.countryOfOrigin ?? null) : undefined,
        warranty: b.warranty !== undefined ? (b.warranty ?? null) : undefined,
        returnPolicy: b.returnPolicy !== undefined ? (b.returnPolicy ?? null) : undefined,

        metaTitle: b.metaTitle !== undefined ? (b.metaTitle ?? null) : undefined,
        metaDescription: b.metaDescription !== undefined ? (b.metaDescription ?? null) : undefined,
        metaKeywords: b.metaKeywords !== undefined ? (b.metaKeywords ?? null) : undefined,

        sizeOptions: b.sizeOptions !== undefined ? (b.sizeOptions ?? null) : undefined,
        colorOptions: b.colorOptions !== undefined ? (b.colorOptions ?? null) : undefined,
      },
      include: { images: true, category: true },
    });

    // tags replace
    if (normalizedTags) {
      await tx.productTag.deleteMany({ where: { productId } });
      if (normalizedTags.length) {
        const tagRows = await Promise.all(
          normalizedTags.map(async (name) => {
            const tagSlug = name.toLowerCase().trim().replace(/\s+/g, " ");
            const slug = tagSlug
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
            return tx.tag.upsert({
              where: { slug },
              update: {},
              create: { name, slug },
            });
          })
        );
        await tx.productTag.createMany({
          data: tagRows.map((t) => ({ productId, tagId: t.id })),
          skipDuplicates: true,
        });
      }
    }

    // variants upsert by SKU; deactivate removed
    if (normalizedVariants !== null) {
      const existing = await tx.productVariant.findMany({ where: { productId } });
      const existingBySku = new Map(existing.map((v) => [v.sku.toLowerCase(), v]));
      const incomingSkus = new Set(normalizedVariants.map((v) => v.sku.toLowerCase()));

      // deactivate removed variants (preserves references)
      const toDeactivate = existing.filter((v) => !incomingSkus.has(v.sku.toLowerCase()));
      await Promise.all(
        toDeactivate.map((v) =>
          tx.productVariant.update({ where: { id: v.id }, data: { isActive: false } })
        )
      );

      // upsert incoming
      await Promise.all(
        normalizedVariants.map(async (v) => {
          const key = v.sku.toLowerCase();
          const cur = existingBySku.get(key);
          if (cur) {
            await tx.productVariant.update({
              where: { id: cur.id },
              data: {
                size: v.size,
                color: v.color ?? null,
                sku: v.sku,
                price: v.price,
                salePrice: v.salePrice ?? null,
                stock: v.stock,
                isActive: v.isActive,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId,
                size: v.size,
                color: v.color ?? null,
                sku: v.sku,
                price: v.price,
                salePrice: v.salePrice ?? null,
                stock: v.stock,
                isActive: v.isActive,
              },
            });
          }
        })
      );

      const activeVariants = await tx.productVariant.findMany({
        where: { productId, isActive: true },
      });

      // If there are active variants, product fields are computed from them.
      // If there are no active variants (including the case where client sent variants: []),
      // treat as a non-variant product and keep base fields as updated above.
      if (activeVariants.length) {
        const computedStock = activeVariants.reduce((sum, v) => sum + v.stock, 0);
        const computedPrice = Math.min(...activeVariants.map((v) => v.price));
        const computedSale = (() => {
          const sales = activeVariants
            .map((v) => v.salePrice)
            .filter((p): p is number => typeof p === "number" && Number.isFinite(p));
          return sales.length ? Math.min(...sales) : null;
        })();

        await tx.product.update({
          where: { id: productId },
          data: {
            stock: computedStock,
            mrp: null,
            price: computedPrice,
            salePrice: computedSale,
            sku: null,
          },
        });
      } else {
        await tx.product.update({
          where: { id: productId },
          data: {
            sku: next.sku ?? null,
          },
        });
      }
    }

    return next;
  });

  await audit({
    actorId: payload.sub,
    actorRole: payload.role,
    action: "VENDOR_PRODUCT_UPDATE",
    entity: "Product",
    entityId: result.id,
    meta: b,
    ip: req.headers.get("x-forwarded-for") || undefined,
  });

  return Response.json({ product: result });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  const rlKey = `vendor:product:delete:${req.headers.get("x-forwarded-for") || "ip"}`;
  const limited = await rateLimit(rlKey);
  if (!limited.success) return Response.json({ error: "Too many requests" }, { status: 429 });

  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  if (payload.role !== "VENDOR") return Response.json({ error: "Forbidden" }, { status: 403 });

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor profile not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });

  const { productId } = await ctx.params;

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  if (product.vendorId !== vendor.id) return Response.json({ error: "Forbidden" }, { status: 403 });

  await prisma.product.update({
    where: { id: product.id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await audit({
    actorId: payload.sub,
    actorRole: payload.role,
    action: "VENDOR_PRODUCT_DELETE",
    entity: "Product",
    entityId: product.id,
    meta: { title: product.title, slug: product.slug },
    ip: req.headers.get("x-forwarded-for") || undefined,
  });

  return Response.json({ ok: true });
}
