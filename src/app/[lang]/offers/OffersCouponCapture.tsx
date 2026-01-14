"use client";

import { useEffect } from "react";

const LS_KEY = "bohosaaz_preferred_coupon_code";

export default function OffersCouponCapture({ coupon }: { coupon: string | null }) {
  useEffect(() => {
    if (!coupon) return;
    try {
      localStorage.setItem(LS_KEY, coupon.toUpperCase());
    } catch {
      // ignore
    }
  }, [coupon]);

  if (!coupon) return null;

  return (
    <div className="mt-6 rounded-3xl border border-border bg-card/60 backdrop-blur-xl p-4 text-sm text-muted-foreground">
      <span className="font-semibold text-foreground">Coupon ready:</span> {coupon.toUpperCase()} • It will auto-apply at checkout.
    </div>
  );
}
