"use client";

import Link from "next/link";
import { useState } from "react";

type WalletTxn = {
  id: string;
  type: string;
  direction: string;
  status: string;
  amountPaise: string;
  balanceAfterPaise: string;
  note: string | null;
  createdAt: string;
};

type PayoutRow = {
  id: string;
  vendorOrderId: string;
  status: string;
  amountPaise: string;
  commissionPaise: string;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  vendorOrder: {
    orderId: string;
    status: string;
    subtotal: number;
    commission: number;
    payout: number;
    createdAt: string;
  };
};

type Props = {
  initialWallet: { id: string; kind: string; balancePaise: string; balanceRupees: number };
  initialTxns: WalletTxn[];
  initialPayouts: PayoutRow[];
};

function formatRupeesFromPaise(paise: string) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return "0.00";
  return (n / 100).toFixed(2);
}

export default function VendorWalletClient({ initialWallet, initialTxns, initialPayouts }: Props) {
  const [wallet, setWallet] = useState(initialWallet);
  const [txns, setTxns] = useState(initialTxns);
  const [payouts, setPayouts] = useState(initialPayouts);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setMsg(null);

    const res = await fetch("/api/vendor/wallet", { credentials: "include" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setMsg(data?.error || "Failed to load vendor wallet");
      setLoading(false);
      return;
    }

    setWallet(data.wallet);
    setTxns(data.txns || []);
    setPayouts(data.payouts || []);
    setLoading(false);
  }

  return (
    <div>
      {msg && <div className="mt-2 text-sm">{msg}</div>}

      <div className="mt-2 flex items-center gap-3">
        <div className="text-sm">
          Balance: <span className="font-semibold">₹{formatRupeesFromPaise(wallet.balancePaise)}</span>
        </div>
        <button className="text-sm underline" onClick={refresh} disabled={loading}>
          Refresh
        </button>
        <Link className="text-sm underline" href="/api/vendor/payouts/csv">
          Download payouts CSV
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Direction</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Balance</div>
          <div className="col-span-4">Created</div>
        </div>

        {txns.length === 0 ? <div className="p-4 text-sm text-gray-600">No wallet transactions yet.</div> : null}

        {txns.map((t) => (
          <div key={t.id} className="grid grid-cols-12 gap-2 p-3 text-sm border-t">
            <div className="col-span-2 font-semibold">{t.type}</div>
            <div className="col-span-2">{t.direction}</div>
            <div className="col-span-2">₹{formatRupeesFromPaise(t.amountPaise)}</div>
            <div className="col-span-2">₹{formatRupeesFromPaise(t.balanceAfterPaise)}</div>
            <div className="col-span-4 text-xs text-gray-600">{new Date(t.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-4">Payout</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Commission</div>
          <div className="col-span-2">Created</div>
        </div>

        {payouts.length === 0 ? <div className="p-4 text-sm text-gray-600">No payout records yet.</div> : null}

        {payouts.map((p) => (
          <div key={p.id} className="grid grid-cols-12 gap-2 p-3 text-sm border-t">
            <div className="col-span-4">
              <div className="font-semibold">{p.vendorOrderId}</div>
              <div className="text-xs text-gray-600">order: {p.vendorOrder.orderId}</div>
            </div>
            <div className="col-span-2 font-semibold">{p.status}</div>
            <div className="col-span-2">₹{formatRupeesFromPaise(p.amountPaise)}</div>
            <div className="col-span-2">₹{formatRupeesFromPaise(p.commissionPaise)}</div>
            <div className="col-span-2 text-xs text-gray-600">{new Date(p.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
