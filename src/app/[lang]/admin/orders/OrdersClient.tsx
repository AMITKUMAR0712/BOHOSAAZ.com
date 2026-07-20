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

function statusClass(status: OrderRow["status"]) {
  if (status === "DELIVERED" || status === "REFUNDED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED") return "border-red-200 bg-red-50 text-red-700";
  if (status === "RETURN_REQUESTED" || status === "RETURN_APPROVED") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "PENDING" || status === "COD_PENDING") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function StatusBadge({ status }: { status: OrderRow["status"] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClass(status)}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function locationText(order: OrderRow) {
  return (order.city || "-") + (order.state ? `, ${order.state}` : "");
}

export default function OrdersClient({
  lang,
  initialOrders,
  initialError = null,
}: {
  lang: string;
  initialOrders: OrderRow[];
  initialError?: string | null;
}) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [msg, setMsg] = useState<string | null>(initialError);
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
    setOrders(
      ((data.data?.orders || []) as Array<Omit<OrderRow, "createdAt"> & { createdAt: string | Date }>).map(
        (order) => ({
          ...order,
          total: Number(order.total ?? 0),
          createdAt:
            typeof order.createdAt === "string" ? order.createdAt : new Date(order.createdAt).toISOString(),
          user: order.user ?? { id: "unknown", email: "Unknown user", name: null },
        }),
      ),
    );
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

      <div className="mt-6 overflow-hidden rounded-2xl border bg-white">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(180px,1.2fr)_140px_80px_120px_minmax(120px,1fr)] gap-3 bg-gray-50 p-3 text-sm font-semibold text-gray-700 lg:grid">
          <div>Order</div>
          <div>User</div>
          <div>Status</div>
          <div>Items</div>
          <div>Total</div>
          <div>Location</div>
        </div>

        {orders.map((o) => (
          <div
            key={o.id}
            className="border-t p-4 text-sm first:border-t-0 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(180px,1.2fr)_140px_80px_120px_minmax(120px,1fr)] lg:items-center lg:gap-3 lg:p-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 lg:block">
                <Link className="break-all font-semibold text-primary underline-offset-4 hover:underline" href={`/${lang}/admin/orders/${o.id}`}>
                  {o.id}
                </Link>
                <div className="lg:hidden">
                  <StatusBadge status={o.status} />
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                {new Date(o.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="mt-4 min-w-0 lg:mt-0">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500 lg:hidden">User</div>
              <div className="truncate font-semibold text-gray-900">{o.user?.email || "Unknown user"}</div>
              <div className="truncate text-xs text-gray-600">{o.user?.name || "No name provided"}</div>
            </div>

            <div className="mt-4 hidden lg:mt-0 lg:block">
              <StatusBadge status={o.status} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-gray-50 p-3 lg:contents">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 lg:hidden">Items</div>
                <div className="font-semibold text-gray-900">{o._count.items}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 lg:hidden">Total</div>
                <div className="font-semibold text-gray-900">₹{Number(o.total ?? 0).toFixed(2)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 lg:hidden">Location</div>
                <div className="truncate text-gray-700 lg:text-xs">{locationText(o)}</div>
              </div>
            </div>
          </div>
        ))}

        {!orders.length ? (
          <div className="p-6 text-center text-sm text-gray-600">No orders found.</div>
        ) : null}
      </div>
    </div>
  );
}
