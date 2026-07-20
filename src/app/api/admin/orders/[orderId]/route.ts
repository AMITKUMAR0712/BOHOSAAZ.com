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
        user: { select: { id: true, email: true, name: true } },
        items: {
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
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                vendor: { select: { id: true, shopName: true } },
              },
            },
          },
        },
        VendorOrder: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            status: true,
            subtotal: true,
            payout: true,
            createdAt: true,
            vendorId: true,
            vendor: { select: { id: true, shopName: true } },
          },
        },
      },
    });

    if (!order) return jsonError("Order not found", 404);

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
        user: order.user ?? { id: order.userId, email: "Unknown user", name: null },
        items: order.items.map((it) => ({
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
            id: it.product?.id ?? it.productId,
            title: it.product?.title ?? "Unknown product",
            slug: it.product?.slug ?? "",
            vendor: it.product?.vendor ?? { id: "unknown", shopName: "Unknown vendor" },
          },
        })),
        VendorOrder: order.VendorOrder.map((vo) => ({
          id: vo.id,
          status: vo.status,
          subtotal: Number(vo.subtotal ?? 0),
          payout: Number(vo.payout ?? 0),
          createdAt: vo.createdAt.toISOString(),
          vendor: vo.vendor ?? { id: vo.vendorId, shopName: "Unknown vendor" },
        })),
      },
    });
  } catch (error) {
    console.error("[api/admin/orders/[orderId]] GET failed:", error);
    return jsonError(`Failed to load order: ${formatDbError(error)}`, 500);
  }
}
