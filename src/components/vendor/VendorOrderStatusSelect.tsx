"use client";

import { useEffect, useState } from "react";

export const VENDOR_ORDER_STATUSES = [
  "PENDING",
  "COD_PENDING",
  "PLACED",
  "PAID",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "REFUNDED",
] as const;

type Props = {
  orderId: string;
  value: string;
  /** When set, posts to admin vendor-status API instead of vendor API. */
  adminVendorId?: string;
  disabled?: boolean;
  className?: string;
  onSaved?: (status: string, items?: Array<{ id: string; status: string }>) => void;
  onMessage?: (message: string | null) => void;
};

export function VendorOrderStatusSelect({
  orderId,
  value,
  adminVendorId,
  disabled,
  className,
  onSaved,
  onMessage,
}: Props) {
  const [status, setStatus] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(value);
  }, [value]);

  async function saveStatus(next: string) {
    const prev = status;
    setStatus(next);
    setSaving(true);
    onMessage?.(null);
    try {
      const url = adminVendorId
        ? `/api/admin/orders/${orderId}/vendor-status`
        : `/api/vendor/orders/${orderId}/status`;
      const body = adminVendorId
        ? { vendorId: adminVendorId, status: next }
        : { status: next };

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Failed to update status");
      }

      const vendorStatus = (data?.vendorStatus || data?.data?.vendorStatus || next) as string;
      const items = (data?.items || data?.data?.items) as Array<{ id: string; status: string }> | undefined;
      setStatus(vendorStatus);
      onSaved?.(vendorStatus, items);
      onMessage?.("✅ Status updated");
    } catch (e) {
      setStatus(prev);
      const message = e instanceof Error ? e.message : "Failed to update status";
      onMessage?.(`❌ ${message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      className={
        className ??
        "rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
      }
      value={status}
      disabled={disabled || saving || status === "PENDING"}
      onChange={(e) => void saveStatus(e.target.value)}
      aria-label="Order status"
    >
      {VENDOR_ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
