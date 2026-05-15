"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  orderId: string;
  status: string;
  subtotal: number;
  commission: number;
  payout: number;
  createdAt: string;
  updatedAt: string;
};

export default function VendorPayoutsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/vendor/payouts", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setMsg(data?.error || "Failed to load payouts");
      setLoading(false);
      return;
    }
    setRows((data?.orders || []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      {msg && <div className="mt-2 text-sm">{msg}</div>}

      <div className="mt-2">
        <button className="text-sm underline" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="mt-4 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-10 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-3">Vendor Order</div>
          <div className="col-span-2">Status</div>
          <div>Subtotal</div>
          <div>Commission</div>
          <div>Payout</div>
          <div className="col-span-2">Created</div>
        </div>

        {rows.length === 0 && !loading ? (
          <div className="p-4 text-sm text-gray-600">No payout rows yet.</div>
        ) : null}

        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-10 gap-2 p-3 text-sm border-t">
            <div className="col-span-3">
              <div className="font-semibold">{r.id}</div>
              <div className="text-xs text-gray-600">order: {r.orderId}</div>
            </div>
            <div className="col-span-2 font-semibold">{r.status}</div>
            <div>₹{r.subtotal.toFixed(2)}</div>
            <div>₹{r.commission.toFixed(2)}</div>
            <div className="font-semibold">₹{r.payout.toFixed(2)}</div>
            <div className="col-span-2 text-xs text-gray-600">{new Date(r.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
