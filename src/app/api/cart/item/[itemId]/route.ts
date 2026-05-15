import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { JwtPayload, verifyToken } from "@/lib/auth";
import { bumpLiveVersion } from "@/lib/live";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> }
) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const quantity = Number(body?.quantity);

  if (!Number.isFinite(quantity) || quantity < 1) {
    return Response.json({ error: "Quantity must be >= 1" }, { status: 400 });
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true, product: true, variant: true },
  });

  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });
  if (item.order.userId !== payload.sub || String(item.order.status) !== "PENDING") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const maxQty = item.variant ? Math.max(0, item.variant.stock) : Math.max(0, item.product.stock);
  if (maxQty <= 0) {
    return Response.json({ error: "Out of stock" }, { status: 400 });
  }
  const finalQty = Math.min(quantity, maxQty);

  const unitPrice = item.variant
    ? Number(item.variant.salePrice ?? item.variant.price)
    : Number(item.product.salePrice ?? item.product.price);

  await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      quantity: finalQty,
      price: unitPrice,
      variantSku: item.variant?.sku ?? null,
      variantSize: item.variant?.size ?? null,
      variantColor: item.variant?.color ?? null,
    },
  });

  const items = await prisma.orderItem.findMany({ where: { orderId: item.orderId } });
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  await prisma.order.update({ where: { id: item.orderId }, data: { total } });

  await bumpLiveVersion({ kind: "user", userId: payload.sub });

  return Response.json({ ok: true, quantity: finalQty, total });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> }
) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await ctx.params;

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true },
  });

  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });
  if (item.order.userId !== payload.sub || String(item.order.status) !== "PENDING") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.orderItem.delete({ where: { id: itemId } });

  const items = await prisma.orderItem.findMany({ where: { orderId: item.orderId } });
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  await prisma.order.update({ where: { id: item.orderId }, data: { total } });

  await bumpLiveVersion({ kind: "user", userId: payload.sub });

  return Response.json({ ok: true, total });
}
