import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";
import { bumpDashboardScopes } from "@/lib/bumpDashboard";
import {
  applyStatusToVendorItems,
  deriveStatusFromItems,
  toOrderItemStatus,
} from "@/lib/orderStatusSync";

const schema = z.object({
  vendorId: z.string().min(1),
  status: z.enum([
    "PENDING",
    "COD_PENDING",
    "PLACED",
    "PAID",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "RETURN_REQUESTED",
    "RETURN_APPROVED",
    "REFUNDED",
  ]),
});

/**
 * Admin sets status for ONE vendor's items only.
 * Other vendors on the same order are unaffected.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { orderId } = await ctx.params;
  if (!orderId) return jsonError("Missing orderId", 400);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  if (!toOrderItemStatus(parsed.data.status) && !["PENDING", "COD_PENDING", "PAID"].includes(parsed.data.status)) {
    return jsonError("Invalid status", 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, userId: true },
  });
  if (!order) return jsonError("Order not found", 404);
  if (order.status === "PENDING") return jsonError("Cart cannot be updated", 400);

  const { vendorId, status } = parsed.data;

  const owned = await prisma.orderItem.count({
    where: { orderId, product: { vendorId } },
  });
  if (!owned) return jsonError("No items for this vendor on the order", 404);

  const result = await prisma.$transaction(async (tx) => {
    const applied = await applyStatusToVendorItems(tx, {
      orderId,
      vendorId,
      status,
    });

    const items = await tx.orderItem.findMany({
      where: { orderId, product: { vendorId } },
      select: { id: true, status: true },
    });

    const orderAfter = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, updatedAt: true, userId: true },
    });

    return {
      order: orderAfter!,
      vendorStatus: deriveStatusFromItems(items.map((i) => i.status)),
      updatedCount: applied.updatedCount,
      items,
    };
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_VENDOR_ORDER_STATUS_SET",
    entity: "Order",
    entityId: orderId,
    meta: {
      vendorId,
      requestedStatus: status,
      vendorStatus: result.vendorStatus,
      orderStatus: result.order.status,
      updatedItemCount: result.updatedCount,
    },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  await bumpDashboardScopes([
    { kind: "admin" },
    { kind: "vendor", vendorId },
    { kind: "user", userId: result.order.userId },
  ]);

  return jsonOk({
    order: result.order,
    vendorStatus: result.vendorStatus,
    items: result.items,
  });
}
