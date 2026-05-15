"use client";

import { useEffect, useState } from "react";
import ExportDropdown from "@/components/ExportDropdown";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  status: string;
  product: {
    title: string;
    images?: Array<{ url: string }>;
  };
};

type OrderRow = {
  id: string;
  createdAt: string;
  items: OrderItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/account/orders", { credentials: "include" });
    const data: unknown = await res.json().catch(() => null);
    if (!isRecord(data) || !Array.isArray(data.orders)) {
      setOrders([]);
      return;
    }
    setOrders(data.orders as OrderRow[]);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function requestReturn(itemId: string) {
    setMsg(null);
    const res = await fetch(`/api/orders/items/${itemId}/refund/request`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const data: unknown = await res.json().catch(() => null);
      if (isRecord(data) && typeof data.error === "string") setMsg(data.error);
      else setMsg("Failed");
    } else {
      setMsg("✅ Return requested");
      void load();
    }
  }

  return (
    <div className="p-6 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">My Orders</h1>
        <ExportDropdown
          filenameBase="Bohosaaz_Orders"
          csv={{ href: "/api/export/user/orders.csv" }}
          pdf={{ href: "/api/export/user/orders.pdf" }}
        />
      </div>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <div className="mt-6 grid gap-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border overflow-hidden">
            <div className="bg-gray-50 p-4 text-sm font-semibold">
              Order #{o.id} • {new Date(o.createdAt).toLocaleDateString()}
            </div>

            <div className="p-4 grid gap-3">
              {o.items.map((it) => {
                const img = it.product.images?.[0]?.url;

                return (
                  <div key={it.id} className="flex gap-4 border rounded-xl p-3">
                    <div className="h-16 w-16 rounded-lg border bg-gray-50 overflow-hidden">
                      {img ? (
                        <img src={img} alt={it.product.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-xs text-gray-400 flex h-full items-center justify-center">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="font-semibold">{it.product.title}</div>
                      <div className="text-xs text-gray-600">
                        Qty: {it.quantity} • ₹{it.price}
                      </div>

                      <div className="mt-1 text-xs">
                        Status: <b>{it.status}</b>
                      </div>

                      {it.status === "DELIVERED" && (
                        <button
                          className="mt-2 rounded-lg border px-3 py-1 text-xs"
                          onClick={() => requestReturn(it.id)}
                        >
                          Request Return
                        </button>
                      )}

                      {it.status === "RETURN_REQUESTED" && (
                        <div className="mt-2 text-xs text-amber-600">
                          ⏳ Return request pending approval
                        </div>
                      )}

                      {it.status === "REFUNDED" && (
                        <div className="mt-2 text-xs text-green-700">
                          ✅ Refunded
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="rounded-2xl border p-6 text-sm text-gray-600">
            No orders yet.
          </div>
        )}
      </div>
    </div>
  );
}
