import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { computeCouponDiscount } from "@/lib/coupons";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(64).transform((s) => s.toUpperCase()),
  cartTotal: z.number().nonnegative(),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const code = parsed.data.code;
  const cartTotal = Number(parsed.data.cartTotal);

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    select: {
      id: true,
      type: true,
      value: true,
      minOrderAmount: true,
      maxDiscountAmount: true,
      startAt: true,
      endAt: true,
      usageLimit: true,
      usedCount: true,
      isActive: true,
    },
  });

  if (!coupon) return jsonError("Invalid coupon code", 404);

  const result = computeCouponDiscount({ coupon, subtotal: cartTotal });
  if (!result.ok) return jsonError(result.reason || "Coupon does not apply", 400);

  return jsonOk({
    couponId: coupon.id,
    code,
    discount: result.discount,
    finalTotal: result.finalTotal,
  });
}