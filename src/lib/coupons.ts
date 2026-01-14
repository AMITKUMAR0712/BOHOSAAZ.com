import type { Coupon, DiscountType } from "@prisma/client";
import { round2 } from "@/lib/money";

export type CouponValidationResult =
  | {
      ok: true;
      discount: number;
      finalTotal: number;
      reason: null;
    }
  | {
      ok: false;
      discount: 0;
      finalTotal: number;
      reason: string;
    };

function isWithinSchedule(now: Date, startAt?: Date | null, endAt?: Date | null) {
  if (startAt && now < startAt) return false;
  if (endAt && now > endAt) return false;
  return true;
}

export function computeCouponDiscount({
  coupon,
  subtotal,
  applicableSubtotal,
  userRedemptionCount,
  now = new Date(),
}: {
  coupon: Pick<
    Coupon,
    | "type"
    | "value"
    | "minOrderAmount"
    | "maxDiscountAmount"
    | "startAt"
    | "endAt"
    | "usageLimit"
    | "usedCount"
    | "isActive"
  > & { perUserLimit?: number | null };
  subtotal: number;
  applicableSubtotal?: number;
  userRedemptionCount?: number;
  now?: Date;
}): CouponValidationResult {
  const sub = round2(Number(subtotal));
  if (!Number.isFinite(sub) || sub <= 0) {
    return { ok: false, discount: 0, finalTotal: 0, reason: "Cart total is invalid" };
  }

  const applicableSub = round2(Number(applicableSubtotal ?? sub));
  if (!Number.isFinite(applicableSub) || applicableSub < 0) {
    return { ok: false, discount: 0, finalTotal: sub, reason: "Coupon scope subtotal is invalid" };
  }

  if (!coupon.isActive) {
    return { ok: false, discount: 0, finalTotal: sub, reason: "Coupon is disabled" };
  }

  if (!isWithinSchedule(now, coupon.startAt, coupon.endAt)) {
    return { ok: false, discount: 0, finalTotal: sub, reason: "Coupon is not active right now" };
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, discount: 0, finalTotal: sub, reason: "Coupon usage limit reached" };
  }

  if (coupon.perUserLimit != null && userRedemptionCount != null && userRedemptionCount >= coupon.perUserLimit) {
    return { ok: false, discount: 0, finalTotal: sub, reason: "Coupon per-user limit reached" };
  }

  if (coupon.minOrderAmount != null && sub < Number(coupon.minOrderAmount)) {
    return {
      ok: false,
      discount: 0,
      finalTotal: sub,
      reason: `Minimum order amount is ₹${Number(coupon.minOrderAmount).toFixed(2)}`,
    };
  }

  const rawDiscount = (() => {
    if ((coupon.type as DiscountType) === "PERCENT") {
      return (applicableSub * Number(coupon.value)) / 100;
    }
    return Number(coupon.value);
  })();

  const capped = coupon.maxDiscountAmount != null ? Math.min(rawDiscount, Number(coupon.maxDiscountAmount)) : rawDiscount;

  const discount = Math.max(0, round2(Math.min(capped, applicableSub)));
  const finalTotal = Math.max(0, round2(sub - discount));

  if (discount <= 0) {
    return { ok: false, discount: 0, finalTotal: sub, reason: "Coupon does not apply" };
  }

  return { ok: true, discount, finalTotal, reason: null };
}
