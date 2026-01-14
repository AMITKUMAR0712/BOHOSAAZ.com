import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { JwtPayload, verifyToken } from "@/lib/auth";
import { z } from "zod";
import { recomputePendingOrderTotals } from "@/lib/orderTotals";

const addBodySchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional().nullable(),
  qty: z.number().int().min(1).optional().default(1),
});

const patchBodySchema = z.object({
  itemId: z.string().trim().min(1),
  quantity: z.number().int().min(1),
});

const deleteBodySchema = z
  .object({
    itemId: z.string().trim().min(1).optional(),
  })
  .optional();

function getAuthPayload(req: NextRequest): JwtPayload | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const payload = getAuthPayload(req);
  // Treat cart as readable for guests (empty cart) to avoid noisy 401s
  // during initial page loads (e.g. header/cart badge).
  if (!payload) return Response.json({ order: null });

  const order = await prisma.order.findFirst({
    where: { userId: payload.sub, status: "PENDING" },
    include: {
      items: {
        include: {
          variant: true,
          product: {
            include: {
              images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
              vendor: { select: { shopName: true } },
              category: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ order: order || null });
}

export async function POST(req: NextRequest) {
  const payload = getAuthPayload(req);
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = addBodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const { productId, variantId, qty } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { where: { isActive: true } } },
  });
  if (!product || !product.isActive) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  const activeVariants = Array.isArray(product.variants) ? product.variants : [];
  const hasVariants = activeVariants.length > 0;

  const pickedVariant = (() => {
    if (!hasVariants) return null;
    if (variantId) return activeVariants.find((v) => v.id === variantId) ?? null;
    if (activeVariants.length === 1) return activeVariants[0] ?? null;
    const bySku = activeVariants.find((v) => (v.sku || "").toUpperCase().includes("DEFAULT"));
    if (bySku) return bySku;
    let best = activeVariants[0] ?? null;
    for (const v of activeVariants) {
      const vPrice = Number(v.salePrice ?? v.price);
      const bPrice = best ? Number(best.salePrice ?? best.price) : Number.POSITIVE_INFINITY;
      if (vPrice < bPrice) best = v;
    }
    return best;
  })();

  if (variantId && !pickedVariant) {
    return Response.json({ error: "Variant not found" }, { status: 404 });
  }

  const maxQty = pickedVariant ? Math.max(0, pickedVariant.stock) : Math.max(0, product.stock);
  if (maxQty <= 0) return Response.json({ error: "Out of stock" }, { status: 400 });
  const finalQty = Math.min(qty, maxQty);

  const unitPrice = pickedVariant
    ? Number(pickedVariant.salePrice ?? pickedVariant.price)
    : Number(product.salePrice ?? product.price);

  const totals = await prisma.$transaction(async (tx) => {
    let order = await tx.order.findFirst({
      where: { userId: payload.sub, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!order) {
      order = await tx.order.create({
        data: { userId: payload.sub, status: "PENDING", subtotal: 0, total: 0 },
        select: { id: true },
      });
    }

    const existing = await tx.orderItem.findFirst({
      where: {
        orderId: order.id,
        productId,
        variantId: pickedVariant ? pickedVariant.id : null,
      },
      select: { id: true, quantity: true },
    });

    if (existing) {
      const nextQty = Math.min(existing.quantity + finalQty, maxQty);
      await tx.orderItem.update({
        where: { id: existing.id },
        data: {
          quantity: nextQty,
          price: unitPrice,
          variantSku: pickedVariant?.sku ?? null,
          variantSize: pickedVariant?.size ?? null,
          variantColor: pickedVariant?.color ?? null,
        },
      });
    } else {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId,
          variantId: pickedVariant?.id ?? null,
          quantity: finalQty,
          price: unitPrice,
          variantSku: pickedVariant?.sku ?? null,
          variantSize: pickedVariant?.size ?? null,
          variantColor: pickedVariant?.color ?? null,
        },
      });
    }

    return recomputePendingOrderTotals(tx, order.id);
  });

  return Response.json({ ok: true, total: totals.total, subtotal: totals.subtotal, discount: totals.discount, couponCode: totals.couponCode });
}

export async function PATCH(req: NextRequest) {
  const payload = getAuthPayload(req);
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const { itemId, quantity } = parsed.data;

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true, product: true, variant: true },
  });
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });
  if (item.order.userId !== payload.sub || String(item.order.status) !== "PENDING") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const maxQty = item.variant ? Math.max(0, item.variant.stock) : Math.max(0, item.product.stock);
  if (maxQty <= 0) return Response.json({ error: "Out of stock" }, { status: 400 });
  const finalQty = Math.min(quantity, maxQty);

  const unitPrice = item.variant
    ? Number(item.variant.salePrice ?? item.variant.price)
    : Number(item.product.salePrice ?? item.product.price);

  const totals = await prisma.$transaction(async (tx) => {
    await tx.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: finalQty,
        price: unitPrice,
        variantSku: item.variant?.sku ?? null,
        variantSize: item.variant?.size ?? null,
        variantColor: item.variant?.color ?? null,
      },
    });

    return recomputePendingOrderTotals(tx, item.orderId);
  });

  return Response.json({ ok: true, quantity: finalQty, total: totals.total, subtotal: totals.subtotal, discount: totals.discount, couponCode: totals.couponCode });
}

export async function DELETE(req: NextRequest) {
  const payload = getAuthPayload(req);
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => undefined);
  const parsed = deleteBodySchema ? deleteBodySchema.safeParse(body) : { success: true as const, data: undefined };
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const order = await prisma.order.findFirst({
    where: { userId: payload.sub, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (!order) return Response.json({ ok: true, total: 0 });

  const itemId = parsed.data?.itemId;
  if (itemId) {
    const item = await prisma.orderItem.findUnique({ where: { id: itemId }, include: { order: true } });
    if (!item) return Response.json({ error: "Item not found" }, { status: 404 });
    if (item.order.userId !== payload.sub || String(item.order.status) !== "PENDING") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.orderItem.delete({ where: { id: itemId } });
  } else {
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  }

  const totals = await prisma.$transaction(async (tx) => {
    // If the cart is empty, also clear coupon fields.
    const remaining = await tx.orderItem.count({ where: { orderId: order.id } });
    if (remaining <= 0) {
      await tx.order.update({
        where: { id: order.id },
        data: { subtotal: 0, total: 0, couponId: null, couponCode: null, couponDiscount: 0 },
      });
      return { subtotal: 0, discount: 0, total: 0, couponCode: null as string | null };
    }

    return recomputePendingOrderTotals(tx, order.id);
  });

  return Response.json({ ok: true, total: totals.total, subtotal: totals.subtotal, discount: totals.discount, couponCode: totals.couponCode });
}
