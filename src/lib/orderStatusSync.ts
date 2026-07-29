import {
  OrderItemStatus,
  OrderStatus,
  VendorOrderStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const FULFILLMENT_RANK: Record<string, number> = {
  PLACED: 1,
  PACKED: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: 5,
  RETURN_REQUESTED: 6,
  RETURN_APPROVED: 7,
  REFUNDED: 8,
};

/** Map UI / Order-level status → OrderItemStatus (when possible). */
export function toOrderItemStatus(status: string): OrderItemStatus | null {
  const s = status.toUpperCase();
  switch (s) {
    case "PENDING":
    case "COD_PENDING":
    case "PAID":
    case "PLACED":
      return OrderItemStatus.PLACED;
    case "PACKED":
      return OrderItemStatus.PACKED;
    case "SHIPPED":
      return OrderItemStatus.SHIPPED;
    case "DELIVERED":
      return OrderItemStatus.DELIVERED;
    case "CANCELLED":
      return OrderItemStatus.CANCELLED;
    case "RETURN_REQUESTED":
      return OrderItemStatus.RETURN_REQUESTED;
    case "RETURN_APPROVED":
      return OrderItemStatus.RETURN_APPROVED;
    case "REFUNDED":
      return OrderItemStatus.REFUNDED;
    default:
      return null;
  }
}

export function toVendorOrderStatus(status: string): VendorOrderStatus | null {
  const item = toOrderItemStatus(status);
  if (!item) return null;
  switch (item) {
    case OrderItemStatus.PLACED:
      return VendorOrderStatus.PLACED;
    case OrderItemStatus.PACKED:
      return VendorOrderStatus.PACKED;
    case OrderItemStatus.SHIPPED:
      return VendorOrderStatus.SHIPPED;
    case OrderItemStatus.DELIVERED:
      return VendorOrderStatus.DELIVERED;
    case OrderItemStatus.CANCELLED:
    case OrderItemStatus.REFUNDED:
      return VendorOrderStatus.CANCELLED;
    default:
      // return/refund flow — keep VendorOrder on DELIVERED until settled/cancelled
      return VendorOrderStatus.DELIVERED;
  }
}

/** Primary status for a vendor slice: unanimous item status, else furthest along. */
export function deriveStatusFromItems(statuses: string[]): string {
  if (!statuses.length) return "PLACED";
  const unique = [...new Set(statuses.map((s) => s.toUpperCase()))];
  if (unique.length === 1) return unique[0];

  return unique.sort(
    (a, b) => (FULFILLMENT_RANK[b] ?? 0) - (FULFILLMENT_RANK[a] ?? 0)
  )[0];
}

type Tx = Prisma.TransactionClient | typeof prisma;

export async function syncVendorOrderFromItems(
  tx: Tx,
  orderId: string,
  vendorId: string
) {
  const vendorOrder = await tx.vendorOrder.findFirst({
    where: { orderId, vendorId },
    select: { id: true, status: true },
  });
  if (!vendorOrder || vendorOrder.status === VendorOrderStatus.SETTLED) return;

  const items = await tx.orderItem.findMany({
    where: { orderId, product: { vendorId } },
    select: { status: true },
  });
  if (!items.length) return;

  const derived = deriveStatusFromItems(items.map((i) => i.status));
  const next = toVendorOrderStatus(derived);
  if (!next || next === vendorOrder.status) return;

  await tx.vendorOrder.update({
    where: { id: vendorOrder.id },
    data: { status: next },
  });
}

/**
 * Roll up main Order.status from ALL order items (so customer header + admin header stay useful).
 * Does not touch payment-ish states unless all items agree on a fulfillment state.
 */
export async function rollupOrderStatusFromAllItems(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });
  if (!order) return;
  if (order.status === OrderStatus.PENDING) return;

  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { status: true },
  });
  if (!items.length) return;

  const derived = deriveStatusFromItems(items.map((i) => i.status));
  const unique = new Set(items.map((i) => i.status));

  // Only roll up when unanimous, or when derived is a clear terminal/progress state
  let next: OrderStatus | null = null;
  if (unique.size === 1) {
    next = derived as OrderStatus;
  } else if (derived === "DELIVERED" || derived === "CANCELLED" || derived === "REFUNDED") {
    next = derived as OrderStatus;
  } else if (derived === "SHIPPED" || derived === "PACKED") {
    next = derived as OrderStatus;
  }

  if (!next || next === order.status) return;

  // Never overwrite explicit payment hold with weaker item state unless unanimous
  const paymentHold =
    order.status === OrderStatus.COD_PENDING || order.status === OrderStatus.PAID;
  if (paymentHold && unique.size > 1) {
    return;
  }

  await tx.order.update({
    where: { id: orderId },
    data: { status: next },
  });
}

export async function applyStatusToVendorItems(
  tx: Tx,
  opts: {
    orderId: string;
    vendorId: string;
    status: string;
    itemIds?: string[];
  }
) {
  const itemStatus = toOrderItemStatus(opts.status);
  if (!itemStatus) return { updatedCount: 0, itemStatus: null as OrderItemStatus | null };

  const where: Prisma.OrderItemWhereInput = {
    orderId: opts.orderId,
    product: { vendorId: opts.vendorId },
    ...(opts.itemIds?.length ? { id: { in: opts.itemIds } } : {}),
  };

  const items = await tx.orderItem.findMany({
    where,
    select: { id: true, packedAt: true, shippedAt: true, deliveredAt: true },
  });

  const now = new Date();
  for (const item of items) {
    const data: {
      status: OrderItemStatus;
      packedAt?: Date;
      shippedAt?: Date;
      deliveredAt?: Date;
    } = { status: itemStatus };

    if (itemStatus === OrderItemStatus.PACKED) data.packedAt = item.packedAt ?? now;
    if (itemStatus === OrderItemStatus.SHIPPED) data.shippedAt = item.shippedAt ?? now;
    if (itemStatus === OrderItemStatus.DELIVERED) data.deliveredAt = item.deliveredAt ?? now;

    await tx.orderItem.update({ where: { id: item.id }, data });
  }

  await syncVendorOrderFromItems(tx, opts.orderId, opts.vendorId);
  await rollupOrderStatusFromAllItems(tx, opts.orderId);

  return { updatedCount: items.length, itemStatus };
}

/** Count distinct vendors on an order. */
export async function countVendorsOnOrder(tx: Tx, orderId: string) {
  const rows = await tx.orderItem.findMany({
    where: { orderId },
    select: { product: { select: { vendorId: true } } },
  });
  return new Set(rows.map((r) => r.product.vendorId)).size;
}
