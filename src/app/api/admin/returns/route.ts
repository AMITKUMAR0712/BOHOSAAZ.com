import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const returns = await prisma.returnRequest.findMany({
    include: {
      order: {
        select: {
          id: true,
          createdAt: true,
          status: true,
          paymentMethod: true,
          fullName: true,
          phone: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          pincode: true,
        },
      },
      user: { select: { id: true, email: true, name: true, phone: true } },
      vendor: { select: { id: true, shopName: true } },
      orderItem: {
        select: {
          id: true,
          quantity: true,
          price: true,
          status: true,
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: { where: { isPrimary: true }, take: 1, select: { url: true } },
            },
          },
        },
      },
      refundRecord: { select: { id: true, status: true, amount: true, method: true, provider: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return jsonOk({ returns });
}
