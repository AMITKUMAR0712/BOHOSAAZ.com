"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReturnTrackingEvent = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
};

type ReturnRequest = {
  id: string;
  status: string;
  reason: string;
  notes: string | null;
  pickupCourier: string | null;
  pickupTrackingNumber: string | null;
  pickupScheduledAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  pickedAt: string | null;
  refundedAt: string | null;
  order: { id: string; createdAt: string; status: string; paymentMethod: string };
  orderItem: {
    id: string;
    quantity: number;
    price: number;
    status: string;
    product: { title: string; slug: string; images?: { url: string }[] };
  };
  trackingEvents: ReturnTrackingEvent[];
  refundRecord: null | { status: string; amount: number; method: string; provider: string | null; providerRefundId: string | null };
};

export default function AccountReturnDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<ReturnRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/returns/${params.id}`, { credentials: "include" });
    const d = await res.json();

    if (!res.ok || !d?.ok) {
      setError(d?.error || "Failed to load");
      setData(null);
      setLoading(false);
      return;
    }

    setData(d.data?.returnRequest || null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Return request</div>
          <div className="mt-1 text-sm text-gray-600">Track pickup and refund timeline.</div>
        </div>
        <Link className="text-sm underline" href="/account/returns">
          Back
        </Link>
      </div>

      {loading ? <div className="text-sm text-gray-600">Loading…</div> : null}
      {error ? <div className="rounded-xl border p-4 text-sm">{error}</div> : null}

      {data ? (
        <>
          <div className="rounded-2xl border overflow-hidden">
            <div className="bg-gray-50 p-4 text-sm font-semibold">Item</div>
            <div className="p-4">
              <div className="font-semibold">{data.orderItem.product.title}</div>
              <div className="mt-1 text-xs text-gray-600">
                Order #{data.order.id} • Qty: {data.orderItem.quantity} • ₹{data.orderItem.price} • Subtotal: ₹
                {data.orderItem.price * data.orderItem.quantity}
              </div>
              <div className="mt-2 text-xs">
                Status: <b>{data.status}</b>
              </div>
              <div className="mt-1 text-xs text-gray-600">Reason: {data.reason}</div>
              {data.notes ? <div className="mt-1 text-xs text-gray-600">Notes: {data.notes}</div> : null}
              {data.pickupCourier || data.pickupTrackingNumber ? (
                <div className="mt-2 text-xs text-gray-600">
                  Pickup: {data.pickupCourier || "—"} • {data.pickupTrackingNumber || "—"}
                </div>
              ) : null}
              {data.refundRecord ? (
                <div className="mt-2 text-xs text-gray-600">
                  Refund: {data.refundRecord.status} • ₹{data.refundRecord.amount} • {data.refundRecord.method}
                </div>
              ) : null}
              {data.rejectReason ? <div className="mt-2 text-xs text-gray-600">Rejection: {data.rejectReason}</div> : null}
            </div>
          </div>

          <div className="rounded-2xl border overflow-hidden">
            <div className="bg-gray-50 p-4 text-sm font-semibold">Timeline</div>
            <div className="p-4 grid gap-3">
              {data.trackingEvents?.length ? (
                data.trackingEvents.map((ev) => (
                  <div key={ev.id} className="rounded-xl border p-3">
                    <div className="text-xs">
                      <b>{ev.status}</b> • {new Date(ev.createdAt).toLocaleString()}
                    </div>
                    {ev.note ? <div className="mt-1 text-xs text-gray-600">{ev.note}</div> : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-600">No events yet.</div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
