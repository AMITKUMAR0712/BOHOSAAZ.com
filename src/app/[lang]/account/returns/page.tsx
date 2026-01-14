"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ExportDropdown from "@/components/ExportDropdown";

type EligibleItem = {
  id: string;
  status: string;
  quantity: number;
  price: number;
  orderId: string;
  order: { id: string; createdAt: string; status: string };
  product: { title: string; slug: string; images?: { url: string }[] };
};

type ReturnRequestRow = {
  id: string;
  status: string;
  reason: string;
  notes: string | null;
  pickupCourier: string | null;
  pickupTrackingNumber: string | null;
  pickupScheduledAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  pickedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  order: { id: string; createdAt: string; status: string };
  orderItem: {
    id: string;
    quantity: number;
    price: number;
    status: string;
    product: { title: string; slug: string; images?: { url: string }[] };
  };
  refundRecord: null | { id: string; status: string; amount: number; method: string; provider: string | null };
};

const reasons = [
  "Damaged product",
  "Wrong item delivered",
  "Not as described",
  "Size/fit issue",
  "Other",
] as const;

export default function AccountReturnsPage() {
  const [eligibleItems, setEligibleItems] = useState<EligibleItem[]>([]);
  const [returns, setReturns] = useState<ReturnRequestRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [reasonByItemId, setReasonByItemId] = useState<Record<string, string>>({});
  const [notesByItemId, setNotesByItemId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const delivered = useMemo(() => eligibleItems, [eligibleItems]);
  const returnRelated = useMemo(() => returns, [returns]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/returns", { credentials: "include" });
    const d = await res.json();
    if (d?.ok) {
      setEligibleItems(d.data?.eligibleItems || []);
      setReturns(d.data?.returns || []);
    } else {
      setMsg(d?.error || "Failed to load");
    }
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function requestReturn(orderItemId: string) {
    setMsg(null);
    const reason = reasonByItemId[orderItemId] || reasons[0];
    const notes = notesByItemId[orderItemId] || "";
    const res = await fetch("/api/returns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderItemId, reason, notes: notes.trim() ? notes.trim() : undefined }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d?.error || "Failed");
      return;
    }
    setMsg("Return requested");
    await load();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Returns & refunds</div>
          <div className="mt-1 text-sm text-gray-600">Request returns for delivered items and track refund status per item.</div>
          {msg ? <div className="mt-2 text-sm">{msg}</div> : null}
        </div>
        <ExportDropdown
          filenameBase="Bohosaaz_Returns"
          csv={{ href: "/api/export/user/returns.csv" }}
          pdf={{ href: "/api/export/user/returns.pdf" }}
        />
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-gray-50 p-4 text-sm font-semibold">Eligible for return (Delivered)</div>
        <div className="p-4 grid gap-3">
          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : (
            delivered.map((it) => {
              const img = it.product.images?.[0]?.url;
              const subtotal = it.price * it.quantity;
              return (
                <div key={it.id} className="flex gap-4 rounded-xl border p-3">
                  <div className="h-16 w-16 rounded-lg border bg-gray-50 overflow-hidden">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={it.product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-xs text-gray-400 flex h-full items-center justify-center">No image</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{it.product.title}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      Order #{it.order.id} • Qty: {it.quantity} • ₹{it.price} • Subtotal: ₹{subtotal}
                    </div>
                    <div className="mt-2 grid gap-2">
                      <textarea
                        className="min-h-18 w-full rounded-lg border px-3 py-2 text-xs"
                        placeholder="Add optional notes…"
                        value={notesByItemId[it.id] || ""}
                        onChange={(e) => setNotesByItemId((m) => ({ ...m, [it.id]: e.target.value }))}
                      />

                      <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="rounded-lg border px-3 py-2 text-xs"
                        value={reasonByItemId[it.id] || reasons[0]}
                        onChange={(e) => setReasonByItemId((m) => ({ ...m, [it.id]: e.target.value }))}
                      >
                        {reasons.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50"
                        onClick={() => requestReturn(it.id)}
                      >
                        Request return
                      </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {!loading && delivered.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-gray-600">No delivered items eligible for return.</div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-gray-50 p-4 text-sm font-semibold">Return/refund status</div>
        <div className="p-4 grid gap-3">
          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : (
            returnRelated.map((rr) => {
              const img = rr.orderItem.product.images?.[0]?.url;
              const subtotal = rr.orderItem.price * rr.orderItem.quantity;
              return (
                <div key={rr.id} className="flex gap-4 rounded-xl border p-3">
                  <div className="h-16 w-16 rounded-lg border bg-gray-50 overflow-hidden">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={rr.orderItem.product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-xs text-gray-400 flex h-full items-center justify-center">No image</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold truncate">{rr.orderItem.product.title}</div>
                      <Link className="text-xs underline" href={`/account/returns/${rr.id}`}>
                        View
                      </Link>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">Order #{rr.order.id}</div>
                    <div className="mt-1 text-xs">
                      Status: <b>{rr.status}</b> • Updated: {new Date(rr.updatedAt).toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Refund amount: ₹{subtotal}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {!loading && returnRelated.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-gray-600">No return requests yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
