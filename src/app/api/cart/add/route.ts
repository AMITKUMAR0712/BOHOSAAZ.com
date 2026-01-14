import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { JwtPayload, verifyToken } from "@/lib/auth";
import { z } from "zod";
import { bumpLiveVersion } from "@/lib/live";

const bodySchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional().nullable(),
  qty: z.number().int().min(1).optional().default(1),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

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

    // If there is only one active variant, it is safe to auto-pick.
    if (activeVariants.length === 1) return activeVariants[0] ?? null;

    // Prefer an obvious "default" variant if present.
    const bySku = activeVariants.find((v) => (v.sku || "").toUpperCase().includes("DEFAULT"));
    if (bySku) return bySku;

    // Otherwise, pick the cheapest active variant so ProductCard never crashes.
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
  if (maxQty <= 0) {
    return Response.json({ error: "Out of stock" }, { status: 400 });
  }
  const finalQty = Math.min(qty, maxQty);

  const unitPrice = pickedVariant
    ? Number(pickedVariant.salePrice ?? pickedVariant.price)
    : Number(product.salePrice ?? product.price);

  // find/create cart order
  let order = await prisma.order.findFirst({
    where: { userId: payload.sub, status: "PENDING" },
  });

  if (!order) {
    order = await prisma.order.create({
      data: { userId: payload.sub, status: "PENDING", total: 0 },
    });
  }

  // upsert item (increase qty) per product+variant
  const existing = await prisma.orderItem.findFirst({
    where: {
      orderId: order.id,
      productId,
      variantId: pickedVariant ? pickedVariant.id : null,
    },
  });

  if (existing) {
    const nextQty = Math.min(existing.quantity + finalQty, maxQty);
    await prisma.orderItem.update({
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
    await prisma.orderItem.create({
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

  // update total (simple compute)
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  await prisma.order.update({
    where: { id: order.id },
    data: { total },
  });

  await bumpLiveVersion({ kind: "user", userId: payload.sub });

  return Response.json({ ok: true, total });
}
