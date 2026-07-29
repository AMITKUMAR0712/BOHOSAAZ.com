"use client";

import { useEffect, useState } from "react";
import { VendorOrderStatusSelect } from "@/components/vendor/VendorOrderStatusSelect";

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

type ItemStatus =
  | "PLACED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "REFUNDED";

type OrderItemView = {
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
  _nextStatus?: string;
  _courier?: string;
  _tracking?: string;
};

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

  items: OrderItemView[];

  VendorOrder: Array<{
    id: string;
    status: string;
    subtotal: number;
    payout: number;
    createdAt: string;
    vendor: { id: string; shopName: string };
  }>;
};

const ITEM_STATUSES: ItemStatus[] = [
  "PLACED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "REFUNDED",
];

function vendorStatusFromItems(items: OrderItemView[], vendorId: string) {
  const statuses = items
    .filter((it) => it.product?.vendor?.id === vendorId)
    .map((it) => it.status);
  if (!statuses.length) return "PLACED";
  const unique = [...new Set(statuses.map((s) => s.toUpperCase()))];
  if (unique.length === 1) return unique[0];
  const rank: Record<string, number> = {
    PLACED: 1,
    PACKED: 2,
    SHIPPED: 3,
    DELIVERED: 4,
    CANCELLED: 5,
    RETURN_REQUESTED: 6,
    RETURN_APPROVED: 7,
    REFUNDED: 8,
  };
  return unique.sort((a, b) => (rank[b] ?? 0) - (rank[a] ?? 0))[0];
}

export default function OrderClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [status, setStatus] = useState<OrderStatus>("PENDING");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingItem, setSavingItem] = useState<Record<string, boolean>>({});
  const [creatingAwb, setCreatingAwb] = useState<Record<string, boolean>>({});

  async function loadOrder() {
    const res = await fetch(`/api/admin/orders/${orderId}`, { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load order");
      return false;
    }
    const next = data.data?.order as OrderView;
    setOrder(next);
    setStatus(next.status);
    return true;
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      setMsg(null);
      await loadOrder();
      if (!cancelled) setLoading(false);
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function createDelhiveryAwb(itemId: string) {
    setMsg(null);
    setCreatingAwb((prev) => ({ ...prev, [itemId]: true }));
    try {
      const res = await fetch("/api/couriers/delhivery/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Create AWB failed");

      setMsg(`✅ Delhivery AWB created${data?.trackingNumber ? `: ${data.trackingNumber}` : ""}`);
      await loadOrder();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error creating Delhivery AWB";
      setMsg(`❌ ${message}`);
    } finally {
      setCreatingAwb((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  async function saveStatus(next: OrderStatus) {
    if (!order) return;
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
    setMsg("✅ Order header status updated (payment/overall). Per-vendor status is below.");
    setSaving(false);
    await loadOrder();
  }

  async function saveItem(it: OrderItemView) {
    setMsg(null);
    setSavingItem((prev) => ({ ...prev, [it.id]: true }));
    try {
      const res = await fetch(`/api/admin/order-items/${it.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: it._nextStatus || it.status || "PLACED",
          trackingCourier: it._courier ?? it.trackingCourier ?? null,
          trackingNumber: it._tracking ?? it.trackingNumber ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Update failed");
      setMsg("✅ Item updated");
      await loadOrder();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error";
      setMsg(`❌ ${message}`);
    } finally {
      setSavingItem((prev) => ({ ...prev, [it.id]: false }));
    }
  }

  if (loading) {
    return <div className="p-6 md:p-10 text-sm text-gray-600">Loading order...</div>;
  }

  if (!order) {
    return <div className="p-6 md:p-10 text-sm text-red-600">{msg || "Order not found."}</div>;
  }

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Order {order.id}</h1>
          <div className="mt-1 text-sm text-gray-600">
            {order.user?.email || "Unknown user"} • {new Date(order.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={status}
            disabled={saving}
            onChange={(e) => saveStatus(e.target.value as OrderStatus)}
            title="Overall order header status"
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

      {msg ? <div className="mt-3 text-sm">{msg}</div> : null}

      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">Summary</div>
          <div className="mt-2 text-sm text-gray-700">
            <div>Total: ₹{Number(order.total ?? 0).toFixed(2)}</div>
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
          <div className="bg-gray-50 p-3 text-sm font-semibold">
            Per-vendor status (changes only that vendor + customer items)
          </div>
          <div className="divide-y">
            {order.VendorOrder.length ? (
              order.VendorOrder.map((vo) => {
                const vendorId = vo.vendor?.id;
                const current = vendorId
                  ? vendorStatusFromItems(order.items, vendorId)
                  : vo.status;
                return (
                  <div
                    key={vo.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold">{vo.vendor?.shopName || "Unknown vendor"}</div>
                      <div className="text-xs text-gray-700">
                        Subtotal: ₹{Number(vo.subtotal ?? 0).toFixed(2)} • Payout: ₹
                        {Number(vo.payout ?? 0).toFixed(2)}
                      </div>
                    </div>
                    {vendorId ? (
                      <VendorOrderStatusSelect
                        orderId={order.id}
                        adminVendorId={vendorId}
                        value={current}
                        onMessage={setMsg}
                        onSaved={() => void loadOrder()}
                      />
                    ) : (
                      <div className="text-xs text-gray-600">Status: {vo.status}</div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-sm text-gray-600">No vendor sub-orders</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <div className="bg-gray-50 p-3 text-sm font-semibold">
            Items — status, tracking & Delhivery (all vendors)
          </div>
          <div className="divide-y">
            {order.items.map((it) => (
              <div key={it.id} className="p-3 text-sm">
                <div className="font-semibold">{it.product?.title || "Unknown product"}</div>
                <div className="mt-1 text-xs text-gray-600">
                  Vendor: {it.product?.vendor?.shopName || "Unknown vendor"} • Qty: {it.quantity} •
                  Price: ₹{Number(it.price ?? 0).toFixed(2)}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <select
                    className="rounded-lg border px-3 py-2 text-sm"
                    defaultValue={it.status || "PLACED"}
                    onChange={(e) => {
                      it._nextStatus = e.target.value;
                    }}
                  >
                    {ITEM_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <input
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="Courier (optional)"
                    defaultValue={it.trackingCourier || ""}
                    onChange={(e) => {
                      it._courier = e.target.value;
                    }}
                  />

                  <input
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="Tracking No. (optional)"
                    defaultValue={it.trackingNumber || ""}
                    onChange={(e) => {
                      it._tracking = e.target.value;
                    }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-lg bg-black px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    disabled={savingItem[it.id]}
                    onClick={() => void saveItem(it)}
                  >
                    {savingItem[it.id] ? "Saving..." : "Save"}
                  </button>

                  {!it.trackingNumber && it.status !== "DELIVERED" && it.status !== "CANCELLED" ? (
                    <button
                      className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
                      disabled={creatingAwb[it.id]}
                      onClick={() => {
                        if (confirm("Create Delhivery AWB for this item?")) {
                          void createDelhiveryAwb(it.id);
                        }
                      }}
                    >
                      {creatingAwb[it.id] ? "Creating AWB..." : "Create Delhivery AWB"}
                    </button>
                  ) : null}

                  {it.trackingCourier || it.trackingNumber ? (
                    <div className="text-xs text-gray-600">
                      Tracking: {it.trackingCourier || "-"} • {it.trackingNumber || "-"}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No tracking</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
