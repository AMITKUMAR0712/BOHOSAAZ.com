import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { formatDbError } from "@/lib/dbError";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { orderId } = await ctx.params;
  if (!orderId) return jsonError("Missing orderId", 400);

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        fullName: true,
        phone: true,
        address1: true,
        address2: true,
        city: true,
        state: true,
        pincode: true,
        userId: true,
      },
    });

    if (!order) return jsonError("Order not found", 404);

    // User (separate, resilient lookup)
    let user: { id: string; email: string; name: string | null } | null = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { id: true, email: true, name: true },
      });
    } catch (error) {
      console.warn("[api/admin/orders/[orderId]] user lookup failed:", formatDbError(error));
    }

    // Order items (scalars only)
    let items: Array<{
      id: string;
      quantity: number;
      price: number;
      status: string;
      trackingCourier: string | null;
      trackingNumber: string | null;
      packedAt: Date | null;
      shippedAt: Date | null;
      deliveredAt: Date | null;
      productId: string;
    }> = [];
    try {
      items = await prisma.orderItem.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          quantity: true,
          price: true,
          status: true,
          trackingCourier: true,
          trackingNumber: true,
          packedAt: true,
          shippedAt: true,
          deliveredAt: true,
          productId: true,
        },
      });
    } catch (error) {
      console.warn("[api/admin/orders/[orderId]] items lookup failed:", formatDbError(error));
    }

    // Products for those items
    const productIds = [...new Set(items.map((it) => it.productId).filter(Boolean))];
    const productsById = new Map<
      string,
      { id: string; title: string; slug: string; vendorId: string }
    >();
    if (productIds.length) {
      try {
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, title: true, slug: true, vendorId: true },
        });
        for (const p of products) productsById.set(p.id, p);
      } catch (error) {
        console.warn("[api/admin/orders/[orderId]] product lookup failed:", formatDbError(error));
      }
    }

    // Vendor orders (scalars only)
    let vendorOrders: Array<{
      id: string;
      status: string;
      subtotal: number;
      payout: number;
      createdAt: Date;
      vendorId: string;
    }> = [];
    try {
      vendorOrders = await prisma.vendorOrder.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          subtotal: true,
          payout: true,
          createdAt: true,
          vendorId: true,
        },
      });
    } catch (error) {
      console.warn("[api/admin/orders/[orderId]] vendor order lookup failed:", formatDbError(error));
    }

    // Vendors referenced by products + vendor orders
    const vendorIds = [
      ...new Set([
        ...[...productsById.values()].map((p) => p.vendorId),
        ...vendorOrders.map((vo) => vo.vendorId),
      ].filter(Boolean)),
    ];
    const vendorsById = new Map<string, { id: string; shopName: string }>();
    if (vendorIds.length) {
      try {
        const vendors = await prisma.vendor.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, shopName: true },
        });
        for (const v of vendors) vendorsById.set(v.id, v);
      } catch (error) {
        console.warn("[api/admin/orders/[orderId]] vendor lookup failed:", formatDbError(error));
      }
    }

    return jsonOk({
      order: {
        id: order.id,
        status: order.status,
        total: Number(order.total ?? 0),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        fullName: order.fullName,
        phone: order.phone,
        address1: order.address1,
        address2: order.address2,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        user: user ?? { id: order.userId, email: "Unknown user", name: null },
        items: items.map((it) => {
          const product = productsById.get(it.productId);
          const vendor = product ? vendorsById.get(product.vendorId) : undefined;
          return {
            id: it.id,
            quantity: it.quantity,
            price: Number(it.price ?? 0),
            status: it.status,
            trackingCourier: it.trackingCourier,
            trackingNumber: it.trackingNumber,
            packedAt: it.packedAt ? it.packedAt.toISOString() : null,
            shippedAt: it.shippedAt ? it.shippedAt.toISOString() : null,
            deliveredAt: it.deliveredAt ? it.deliveredAt.toISOString() : null,
            product: {
              id: product?.id ?? it.productId,
              title: product?.title ?? "Unknown product",
              slug: product?.slug ?? "",
              vendor: vendor ?? { id: product?.vendorId ?? "unknown", shopName: "Unknown vendor" },
            },
          };
        }),
        VendorOrder: vendorOrders.map((vo) => ({
          id: vo.id,
          status: vo.status,
          subtotal: Number(vo.subtotal ?? 0),
          payout: Number(vo.payout ?? 0),
          createdAt: vo.createdAt.toISOString(),
          vendor: vendorsById.get(vo.vendorId) ?? { id: vo.vendorId, shopName: "Unknown vendor" },
        })),
      },
    });
  } catch (error) {
    console.error("[api/admin/orders/[orderId]] GET failed:", error);
    return jsonError(`Failed to load order: ${formatDbError(error)}`, 500);
  }
}
