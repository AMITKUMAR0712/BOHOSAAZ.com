import { computeCouponDiscount } from "@/lib/coupons";
import { round2 } from "@/lib/money";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function recomputePendingOrderTotals(
  tx: Tx,
  orderId: string
): Promise<{ subtotal: number; discount: number; total: number; couponCode: string | null }> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      userId: true,
      couponId: true,
      couponCode: true,
      items: {
        select: {
          price: true,
          quantity: true,
          productId: true,
          product: { select: { categoryId: true } },
        },
      },
    },
  });

  if (!order) throw new Error("Order not found");

  const subtotal = round2(order.items.reduce((sum, it) => sum + it.price * it.quantity, 0));

  // Only manage totals for PENDING cart orders
  if (String(order.status) !== "PENDING") {
    await tx.order.update({ where: { id: orderId }, data: { subtotal, total: subtotal } });
    return { subtotal, discount: 0, total: subtotal, couponCode: null };
  }

  if (!order.couponId) {
    await tx.order.update({
      where: { id: orderId },
      data: { subtotal, couponDiscount: 0, total: subtotal, couponCode: null },
    });
    return { subtotal, discount: 0, total: subtotal, couponCode: null };
  }

  const coupon = await tx.coupon.findUnique({
    where: { id: order.couponId },
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
      perUserLimit: true,
      usedCount: true,
      isActive: true,
      appliesTo: true,
      categoryId: true,
      productId: true,
    },
  });

  if (!coupon) {
    await tx.order.update({
      where: { id: orderId },
      data: { subtotal, couponId: null, couponCode: null, couponDiscount: 0, total: subtotal },
    });
    return { subtotal, discount: 0, total: subtotal, couponCode: null };
  }

  const applicableSubtotal = (() => {
    if (coupon.appliesTo === "ALL") return subtotal;
    if (coupon.appliesTo === "CATEGORY") {
      if (!coupon.categoryId) return 0;
      return round2(
        order.items
          .filter((it) => it.product?.categoryId === coupon.categoryId)
          .reduce((sum, it) => sum + it.price * it.quantity, 0)
      );
    }
    if (coupon.appliesTo === "PRODUCT") {
      if (!coupon.productId) return 0;
      return round2(
        order.items
          .filter((it) => it.productId === coupon.productId)
          .reduce((sum, it) => sum + it.price * it.quantity, 0)
      );
    }
    return subtotal;
  })();

  const userRedemptionCount =
    coupon.perUserLimit != null
      ? await tx.couponRedemption.count({ where: { couponId: coupon.id, userId: order.userId } })
      : undefined;

  const validation = computeCouponDiscount({
    coupon,
    subtotal,
    applicableSubtotal,
    userRedemptionCount,
  });
  if (!validation.ok) {
    await tx.order.update({
      where: { id: orderId },
      data: { subtotal, couponId: null, couponCode: null, couponDiscount: 0, total: subtotal },
    });
    return { subtotal, discount: 0, total: subtotal, couponCode: null };
  }

  await tx.order.update({
    where: { id: orderId },
    data: {
      subtotal,
      couponCode: coupon.code,
      couponDiscount: validation.discount,
      total: validation.finalTotal,
    },
  });

  return { subtotal, discount: validation.discount, total: validation.finalTotal, couponCode: coupon.code };
}
