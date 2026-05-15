"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const KEY = "bohosaaz_preferred_coupon_code";

export function CouponCapture() {
  const sp = useSearchParams();

  useEffect(() => {
    const codeRaw = sp.get("coupon");
    const code = (codeRaw ?? "").trim().toUpperCase();
    if (!code) return;

    try {
      localStorage.setItem(KEY, code);
    } catch {
      // ignore
    }
  }, [sp]);

  return null;
}
