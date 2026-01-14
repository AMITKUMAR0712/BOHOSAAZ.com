import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { computeCouponDiscount } from "@/lib/coupons";
import { round2 } from "@/lib/money";

const bodySchema = z.object({
  code: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((s) => (s == null ? "" : s.toUpperCase())),
});

function getAuthPayload(req: NextRequest): JwtPayload | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const payload = getAuthPayload(req);
  if (!payload) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const code = parsed.data.code.trim();

  try {
    const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { userId: payload.sub, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: { select: { id: true, categoryId: true } },
          },
        },
      },
    });

    if (!order || order.items.length === 0) throw new Error("Cart is empty");

    const subtotal = round2(order.items.reduce((sum, it) => sum + it.price * it.quantity, 0));

    // Remove coupon
    if (!code) {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          subtotal,
          total: subtotal,
          couponId: null,
          couponCode: null,
          couponDiscount: 0,
        },
        select: { subtotal: true, total: true, couponCode: true, couponDiscount: true },
      });

      return {
        subtotal: updated.subtotal,
        discount: updated.couponDiscount,
        total: updated.total,
        code: null as string | null,
      };
    }

    const coupon = await tx.coupon.findUnique({
      where: { code },
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
    if (!coupon) throw new Error("Invalid coupon code");

    const applicableSubtotal = (() => {
      const items = order.items;
      if (coupon.appliesTo === "ALL") {
        return subtotal;
      }
      if (coupon.appliesTo === "CATEGORY") {
        if (!coupon.categoryId) return 0;
        return round2(
          items
            .filter((it) => it.product?.categoryId === coupon.categoryId)
            .reduce((sum, it) => sum + it.price * it.quantity, 0)
        );
      }
      if (coupon.appliesTo === "PRODUCT") {
        if (!coupon.productId) return 0;
        return round2(
          items
            .filter((it) => it.productId === coupon.productId)
            .reduce((sum, it) => sum + it.price * it.quantity, 0)
        );
      }
      return subtotal;
    })();

    const userRedemptionCount =
      coupon.perUserLimit != null
        ? await tx.couponRedemption.count({ where: { couponId: coupon.id, userId: payload.sub } })
        : undefined;

    const validation = computeCouponDiscount({
      coupon,
      subtotal,
      applicableSubtotal,
      userRedemptionCount,
    });
    if (!validation.ok) throw new Error(validation.reason || "Coupon not applicable");

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal,
        couponId: coupon.id,
        couponCode: coupon.code,
        couponDiscount: validation.discount,
        total: validation.finalTotal,
      },
      select: { subtotal: true, total: true, couponCode: true, couponDiscount: true },
    });

    return {
      subtotal: updated.subtotal,
      discount: updated.couponDiscount,
      total: updated.total,
      code: updated.couponCode,
    };
    });

    return jsonOk(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Coupon not applicable";
    return jsonError(message, 400);
  }
}
