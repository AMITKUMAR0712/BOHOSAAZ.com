import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api";

export async function GET() {
  const now = new Date();

  const coupon = await prisma.coupon.findFirst({
    where: {
      isActive: true,
      isHighlighted: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      code: true,
      type: true,
      value: true,
      minOrderAmount: true,
      maxDiscountAmount: true,
      startAt: true,
      endAt: true,
      usageLimit: true,
      usedCount: true,
      perUserLimit: true,
      isActive: true,
      isHighlighted: true,
      appliesTo: true,
      categoryId: true,
      productId: true,
    },
  });

  return jsonOk({ coupon: coupon ?? null });
}
