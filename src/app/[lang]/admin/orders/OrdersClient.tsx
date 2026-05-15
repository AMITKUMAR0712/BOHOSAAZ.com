"use client";

import Link from "next/link";
import { useState } from "react";
import ExportDropdown from "@/components/ExportDropdown";

type OrderRow = {
  id: string;
  status:
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
  total: number;
  city: string | null;
  state: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
  _count: { items: number };
};

export default function OrdersClient({
  lang,
  initialOrders,
}: {
  lang: string;
  initialOrders: OrderRow[];
}) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function reload() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/admin/orders?take=50", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load orders");
      setLoading(false);
      return;
    }
    setOrders((data.data?.orders || []) as OrderRow[]);
    setLoading(false);
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="mt-1 text-sm text-gray-600">Review orders and update status.</p>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <ExportDropdown
            filenameBase="Bohosaaz_Admin_Orders"
            csv={{ href: "/api/export/admin/orders.csv" }}
            pdf={{ href: "/api/export/admin/orders.pdf" }}
          />
          <button className="text-sm underline" onClick={reload} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-8 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-3">Order</div>
          <div>User</div>
          <div>Status</div>
          <div>Items</div>
          <div>Total</div>
          <div>Location</div>
        </div>

        {orders.map((o) => (
          <div key={o.id} className="grid grid-cols-8 gap-2 p-3 text-sm border-t">
            <div className="col-span-3">
              <Link className="underline" href={`/${lang}/admin/orders/${o.id}`}>
                {o.id}
              </Link>
              <div className="text-xs text-gray-600">
                {new Date(o.createdAt).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="font-semibold">{o.user.email}</div>
              <div className="text-xs text-gray-600">{o.user.name || "-"}</div>
            </div>
            <div className="font-semibold">{o.status}</div>
            <div>{o._count.items}</div>
            <div>₹{o.total.toFixed(2)}</div>
            <div className="text-xs text-gray-700">
              {(o.city || "-") + (o.state ? ", " + o.state : "")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
