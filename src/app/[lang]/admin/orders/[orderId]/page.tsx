import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import OrderClient from "./OrderClient";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { orderId } = await params;

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
          createdAt: true,
          vendor: { select: { id: true, shopName: true } },
        },
      },
    },
  });

  if (!order) redirect("/404");

  const viewModel = {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((it) => ({
      ...it,
      packedAt: it.packedAt ? it.packedAt.toISOString() : null,
      shippedAt: it.shippedAt ? it.shippedAt.toISOString() : null,
      deliveredAt: it.deliveredAt ? it.deliveredAt.toISOString() : null,
    })),
    VendorOrder: order.VendorOrder.map((vo) => ({
      ...vo,
      createdAt: vo.createdAt.toISOString(),
    })),
  };

  return <OrderClient order={viewModel} />;
}
