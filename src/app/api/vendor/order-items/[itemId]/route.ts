import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";
import { bumpLiveVersion } from "@/lib/live";

const ALLOWED = ["PLACED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

function canTransition(from: string, to: string) {
  if (from === to) return true;
  const chain = ["PLACED", "PACKED", "SHIPPED", "DELIVERED"] as const;
  const fromIdx = chain.indexOf(from as (typeof chain)[number]);
  const toIdx = chain.indexOf(to as (typeof chain)[number]);

  // cancel only before shipped
  if (to === "CANCELLED") return from !== "SHIPPED" && from !== "DELIVERED";

  // once cancelled, no changes
  if (from === "CANCELLED") return false;

  // normal forward-only transitions
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx === fromIdx + 1;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> }
) {
  const ip = req.headers.get("x-forwarded-for") || "ip";
  const rlKey = `vendor:order-item:patch:${ip}`;
  const limited = await rateLimit(rlKey);
  if (!limited.success) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "VENDOR") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { itemId } = await ctx.params;
  const body = await req.json().catch(() => null);

  const status = String(body?.status || "").toUpperCase();
  const trackingCourier = body?.trackingCourier ? String(body.trackingCourier).trim() : null;
  const trackingNumber = body?.trackingNumber ? String(body.trackingNumber).trim() : null;

  if (!ALLOWED.includes(status as (typeof ALLOWED)[number])) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true, product: true },
  });
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

  // exclude cart
  if (item.order.status === "PENDING") {
    return Response.json({ error: "Cart item cannot be updated" }, { status: 400 });
  }

  // vendor ownership check
  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });
  if (item.product.vendorId !== vendor.id) return Response.json({ error: "Forbidden" }, { status: 403 });

  if (!canTransition(item.status, status)) {
    return Response.json({ error: `Invalid status transition: ${item.status} → ${status}` }, { status: 400 });
  }

  const now = new Date();
  const data: Record<string, unknown> = { status };

  if (status === "PACKED") data.packedAt = item.packedAt ?? now;
  if (status === "SHIPPED") {
    data.shippedAt = item.shippedAt ?? now;
    data.trackingCourier = trackingCourier;
    data.trackingNumber = trackingNumber;
  }
  if (status === "DELIVERED") data.deliveredAt = item.deliveredAt ?? now;

  const updated = await prisma.orderItem.update({ where: { id: itemId }, data });

  await audit({
    actorId: payload.sub,
    actorRole: payload.role,
    action: "VENDOR_ORDER_ITEM_UPDATE",
    entity: "OrderItem",
    entityId: itemId,
    meta: {
      fromStatus: item.status,
      toStatus: status,
      trackingCourier,
      trackingNumber,
      orderId: item.orderId,
      productId: item.productId,
    },
    ip: req.headers.get("x-forwarded-for") || undefined,
  });

  await Promise.all([
    bumpLiveVersion({ kind: "vendor", vendorId: vendor.id }),
    bumpLiveVersion({ kind: "user", userId: item.order.userId }),
    bumpLiveVersion({ kind: "admin" }),
  ]);

  return Response.json({ ok: true, item: updated });
}
