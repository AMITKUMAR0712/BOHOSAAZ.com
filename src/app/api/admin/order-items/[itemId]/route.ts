import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";
import { bumpLiveVersion } from "@/lib/live";
import { createDelhiveryShipmentForOrderItem } from "@/lib/delhivery";
import { rollupOrderStatusFromAllItems, syncVendorOrderFromItems } from "@/lib/orderStatusSync";

const ALLOWED = [
  "PLACED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "REFUNDED",
] as const;

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> }
) {
  const ip = req.headers.get("x-forwarded-for") || "ip";
  const limited = await rateLimit(`admin:order-item:patch:${ip}`);
  if (!limited.success) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { itemId } = await ctx.params;
  const body = await req.json().catch(() => null);

  const status = String(body?.status || "").toUpperCase();
  const trackingCourier = body?.trackingCourier ? String(body.trackingCourier).trim() : null;
  let trackingNumber = body?.trackingNumber ? String(body.trackingNumber).trim() : null;

  if (!ALLOWED.includes(status as (typeof ALLOWED)[number])) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true, product: true },
  });
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

  if (item.order.status === "PENDING") {
    return Response.json({ error: "Cart item cannot be updated" }, { status: 400 });
  }

  const now = new Date();
  const data: Record<string, unknown> = { status };

  if (status === "PACKED") data.packedAt = item.packedAt ?? now;
  if (status === "SHIPPED") {
    data.shippedAt = item.shippedAt ?? now;
    data.trackingCourier = trackingCourier;
    data.trackingNumber = trackingNumber;

    if (!trackingNumber && trackingCourier?.toLowerCase() === "delhivery") {
      const result = await createDelhiveryShipmentForOrderItem(itemId);
      data.trackingNumber = result.trackingNumber;
      trackingNumber = result.trackingNumber;
    }
  }
  if (status === "DELIVERED") data.deliveredAt = item.deliveredAt ?? now;

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.orderItem.update({ where: { id: itemId }, data });
    await syncVendorOrderFromItems(tx, item.orderId, item.product.vendorId);
    await rollupOrderStatusFromAllItems(tx, item.orderId);
    return row;
  });

  await audit({
    actorId: admin.id,
    actorRole: "ADMIN",
    action: "ADMIN_ORDER_ITEM_UPDATE",
    entity: "OrderItem",
    entityId: itemId,
    meta: {
      fromStatus: item.status,
      toStatus: status,
      trackingCourier,
      trackingNumber,
      orderId: item.orderId,
      productId: item.productId,
      vendorId: item.product.vendorId,
    },
    ip: req.headers.get("x-forwarded-for") || undefined,
  });

  await Promise.all([
    bumpLiveVersion({ kind: "vendor", vendorId: item.product.vendorId }),
    bumpLiveVersion({ kind: "user", userId: item.order.userId }),
    bumpLiveVersion({ kind: "admin" }),
  ]);

  return Response.json({ ok: true, item: updated });
}
