"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ReturnTrackingEvent = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string | Date;
};

type RefundRecord = {
  status: string;
  provider: string | null;
  providerRefundId: string | null;
} | null;

type ReturnRequest = {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  notes: string | null;
  rejectReason: string | null;
  pickupCourier: string | null;
  pickupTrackingNumber: string | null;
  order: { paymentMethod: string };
  orderItem: { price: number; quantity: number; product: { title: string } };
  user: { email: string; phone: string | null };
  vendor: { shopName: string };
  refundRecord: RefundRecord;
  trackingEvents: ReturnTrackingEvent[];
};

type Action = "approve" | "reject" | "schedule_pickup" | "mark_picked" | "mark_refunded";
export default function ReturnDetailClient({ initialReturn }: { initialReturn: ReturnRequest }) {
  const [rr, setRr] = useState<ReturnRequest>(initialReturn);
  const [busy, setBusy] = useState<Action | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const amount = useMemo(() => rr.orderItem.price * rr.orderItem.quantity, [rr]);

  async function doAction(action: Action, payload: Record<string, unknown> = {}) {
    setMsg(null);
    setBusy(action);
    const res = await fetch(`/api/admin/returns/${rr.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, ...payload }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) {
      setMsg(d?.error || "Action failed");
      setBusy(null);
      return;
    }
    const fresh = await fetch(`/api/admin/returns/${rr.id}`, { credentials: "include" });
    const fd = await fresh.json().catch(() => null);
    if (fresh.ok && fd?.ok) setRr(fd.data?.returnRequest);
    setBusy(null);
    setMsg("Updated");
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Return #{rr.id}</div>
          <div className="mt-1 text-sm text-muted-foreground">Order #{rr.orderId} • ₹{amount} • {rr.order.paymentMethod}</div>
        </div>
        <Link className="text-sm underline" href="/admin/returns">
          Back
        </Link>
      </div>

      {msg ? <div className="rounded-xl border p-3 text-sm">{msg}</div> : null}

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-muted/30 p-3 text-sm font-semibold">Request</div>
        <div className="p-4 grid gap-2 text-sm">
          <div>
            Status: <b>{rr.status}</b>
          </div>
          <div>
            Item: <b>{rr.orderItem.product.title}</b> • Qty {rr.orderItem.quantity} • ₹{rr.orderItem.price}
          </div>
          <div>
            User: <b>{rr.user.email}</b>{rr.user.phone ? ` • ${rr.user.phone}` : ""}
          </div>
          <div>
            Vendor: <b>{rr.vendor.shopName}</b>
          </div>
          <div>Reason: {rr.reason}</div>
          {rr.notes ? <div>Notes: {rr.notes}</div> : null}
          {rr.rejectReason ? <div>Reject reason: {rr.rejectReason}</div> : null}
          {rr.pickupCourier || rr.pickupTrackingNumber ? (
            <div>
              Pickup: {rr.pickupCourier || "—"} • {rr.pickupTrackingNumber || "—"}
            </div>
          ) : null}
          {rr.refundRecord ? (
            <div>
              Refund: <b>{rr.refundRecord.status}</b>
              {rr.refundRecord.provider ? ` • ${rr.refundRecord.provider}` : ""}
              {rr.refundRecord.providerRefundId ? ` • ${rr.refundRecord.providerRefundId}` : ""}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-muted/30 p-3 text-sm font-semibold">Actions</div>
        <div className="p-4 grid gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border px-3 py-2 text-xs hover:bg-muted disabled:opacity-50"
              disabled={!!busy || rr.status !== "REQUESTED"}
              onClick={() => doAction("approve")}
            >
              Approve
            </button>
            <button
              className="rounded-lg border px-3 py-2 text-xs hover:bg-muted disabled:opacity-50"
              disabled={!!busy || rr.status !== "REQUESTED"}
              onClick={() => {
                const reason = window.prompt("Reject reason?") || "";
                if (reason.trim().length < 2) return;
                void doAction("reject", { rejectReason: reason.trim() });
              }}
            >
              Reject
            </button>
            <button
              className="rounded-lg border px-3 py-2 text-xs hover:bg-muted disabled:opacity-50"
              disabled={!!busy || rr.status !== "APPROVED"}
              onClick={() => {
                const courier = window.prompt("Pickup courier?") || "";
                const tracking = window.prompt("Pickup tracking number?") || "";
                if (courier.trim().length < 2 || tracking.trim().length < 2) return;
                void doAction("schedule_pickup", { pickupCourier: courier.trim(), pickupTrackingNumber: tracking.trim() });
              }}
            >
              Schedule pickup
            </button>
            <button
              className="rounded-lg border px-3 py-2 text-xs hover:bg-muted disabled:opacity-50"
              disabled={!!busy || rr.status !== "PICKUP_SCHEDULED"}
              onClick={() => doAction("mark_picked")}
            >
              Mark picked
            </button>
            <button
              className="rounded-lg border px-3 py-2 text-xs hover:bg-muted disabled:opacity-50"
              disabled={!!busy || rr.status !== "PICKED"}
              onClick={() => {
                const provider = window.prompt("Refund provider (optional, e.g. RAZORPAY)?") || "";
                const providerRefundId = window.prompt("Provider refund id (optional)?") || "";
                void doAction("mark_refunded", {
                  provider: provider.trim() ? provider.trim() : undefined,
                  providerRefundId: providerRefundId.trim() ? providerRefundId.trim() : undefined,
                });
              }}
            >
              Mark refunded
            </button>
          </div>

          <div className="rounded-xl border p-3 text-xs text-muted-foreground">
            COD refunds credit the user wallet immediately; online refunds default to PROCESSING unless you supply a provider refund id.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-muted/30 p-3 text-sm font-semibold">Timeline</div>
        <div className="p-4 grid gap-3">
          {rr.trackingEvents?.length ? (
            rr.trackingEvents.map((ev) => (
              <div key={ev.id} className="rounded-xl border p-3">
                <div className="text-xs">
                  <b>{ev.status}</b> • {new Date(ev.createdAt).toLocaleString()}
                </div>
                {ev.note ? <div className="mt-1 text-xs text-muted-foreground">{ev.note}</div> : null}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No events yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
