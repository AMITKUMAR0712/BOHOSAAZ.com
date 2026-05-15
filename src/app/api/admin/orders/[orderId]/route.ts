import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { orderId } = await ctx.params;
  if (!orderId) return jsonError("Missing orderId", 400);

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
          commission: true,
          payout: true,
          vendor: { select: { id: true, shopName: true } },
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!order) return jsonError("Order not found", 404);

  return jsonOk({ order });
}
