"use client";

import { useState } from "react";

type OrderStatus =
  | "PENDING"
  | "COD_PENDING"
  | "PLACED"
  | "PAID"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "REFUNDED";

type OrderView = {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt: string;

  fullName: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;

  user: { id: string; email: string; name: string | null };

  items: Array<{
    id: string;
    quantity: number;
    price: number;
    status: string;
    trackingCourier: string | null;
    trackingNumber: string | null;
    packedAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    product: { id: string; title: string; slug: string; vendor: { id: string; shopName: string } };
  }>;

  VendorOrder: Array<{
    id: string;
    status: string;
    subtotal: number;
    commission: number;
    payout: number;
    createdAt: string;
    vendor: { id: string; shopName: string };
  }>;
};

export default function OrderClient({ order }: { order: OrderView }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveStatus(next: OrderStatus) {
    setMsg(null);
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${order.id}/status`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to update status");
      setSaving(false);
      return;
    }
    setStatus(next);
    setMsg("Updated");
    setSaving(false);
  }

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Order {order.id}</h1>
          <div className="mt-1 text-sm text-gray-600">
            {order.user.email} • {new Date(order.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={status}
            disabled={saving}
            onChange={(e) => saveStatus(e.target.value as OrderStatus)}
          >
            <option value="PENDING">PENDING</option>
            <option value="COD_PENDING">COD_PENDING</option>
            <option value="PLACED">PLACED</option>
            <option value="PAID">PAID</option>
            <option value="PACKED">PACKED</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="RETURN_REQUESTED">RETURN_REQUESTED</option>
            <option value="RETURN_APPROVED">RETURN_APPROVED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">Summary</div>
          <div className="mt-2 text-sm text-gray-700">
            <div>Total: ₹{order.total.toFixed(2)}</div>
            <div>Status: {status}</div>
            <div>Updated: {new Date(order.updatedAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">Shipping</div>
          <div className="mt-2 text-sm text-gray-700">
            <div>{order.fullName || "-"}</div>
            <div>{order.phone || "-"}</div>
            <div>{order.address1 || "-"}</div>
            {order.address2 ? <div>{order.address2}</div> : null}
            <div>
              {(order.city || "-") + (order.state ? ", " + order.state : "")} {order.pincode || ""}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <div className="bg-gray-50 p-3 text-sm font-semibold">Items</div>
          <div className="divide-y">
            {order.items.map((it) => (
              <div key={it.id} className="p-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">{it.product.title}</div>
                    <div className="text-xs text-gray-600">
                      Vendor: {it.product.vendor.shopName} • Qty: {it.quantity} • Price: ₹{it.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">Item status: {it.status}</div>
                  </div>
                  <div className="text-xs text-gray-700">
                    {it.trackingCourier || it.trackingNumber ? (
                      <div>
                        {it.trackingCourier || "Courier"}: {it.trackingNumber || "-"}
                      </div>
                    ) : (
                      <div className="text-gray-500">No tracking</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <div className="bg-gray-50 p-3 text-sm font-semibold">Vendor Orders</div>
          <div className="divide-y">
            {order.VendorOrder.length ? (
              order.VendorOrder.map((vo) => (
                <div key={vo.id} className="p-3 text-sm">
                  <div className="font-semibold">{vo.vendor.shopName}</div>
                  <div className="text-xs text-gray-600">Status: {vo.status}</div>
                  <div className="text-xs text-gray-700">
                    Subtotal: ₹{vo.subtotal.toFixed(2)} • Commission: ₹{vo.commission.toFixed(2)} • Payout: ₹{vo.payout.toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-sm text-gray-600">No vendor sub-orders</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
