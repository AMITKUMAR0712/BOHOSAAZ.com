import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";
import { bumpDashboardScopes } from "@/lib/bumpDashboard";
import {
  applyStatusToVendorItems,
  countVendorsOnOrder,
  deriveStatusFromItems,
  toOrderItemStatus,
} from "@/lib/orderStatusSync";
import { OrderStatus } from "@prisma/client";

const ORDER_STATUSES = [
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
] as const;

const schema = z.object({
  status: z.enum(ORDER_STATUSES),
});

/**
 * Vendor sets status for THEIR slice only (items + VendorOrder).
 * Other vendors' items are never touched.
 * User sees item statuses; admin sees item + VendorOrder; Order header rollups when safe.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const vendorUser = await requireApprovedVendor();
  if (!vendorUser?.vendor?.id) return jsonError("Unauthorized", 401);

  const vendorId = vendorUser.vendor.id;
  const { orderId } = await ctx.params;
  if (!orderId) return jsonError("Missing orderId", 400);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const nextStatusKey = parsed.data.status;
  if (!toOrderItemStatus(nextStatusKey) && !["PENDING", "COD_PENDING", "PAID"].includes(nextStatusKey)) {
    return jsonError("Invalid status", 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, userId: true },
  });
  if (!order) return jsonError("Order not found", 404);
  if (order.status === "PENDING") return jsonError("Cart cannot be updated", 400);

  const ownedCount = await prisma.orderItem.count({
    where: { orderId, product: { vendorId } },
  });
  if (ownedCount === 0) return jsonError("Order not found for this vendor", 404);

  const result = await prisma.$transaction(async (tx) => {
    const applied = await applyStatusToVendorItems(tx, {
      orderId,
      vendorId,
      status: nextStatusKey,
    });

    // Payment-level statuses on Order header: only if this vendor owns the whole order
    const vendorCount = await countVendorsOnOrder(tx, orderId);
    if (
      vendorCount === 1 &&
      (nextStatusKey === "COD_PENDING" ||
        nextStatusKey === "PAID" ||
        nextStatusKey === "PENDING" ||
        nextStatusKey === "PLACED")
    ) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatusKey as OrderStatus },
      });
    }

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
      items,
      updatedCount: applied.updatedCount,
    };
  });

  await audit({
    actorId: vendorUser.id,
    actorRole: vendorUser.role,
    action: "VENDOR_ORDER_STATUS_SET",
    entity: "Order",
    entityId: orderId,
    meta: {
      vendorId,
      requestedStatus: nextStatusKey,
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
