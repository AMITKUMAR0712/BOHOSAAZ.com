"use client";

import Script from "next/script";
import { useMemo, useState } from "react";

type WalletTxn = {
  id: string;
  type: string;
  direction: string;
  status: string;
  amountPaise: string;
  balanceAfterPaise: string;
  note: string | null;
  createdAt: string;
  orderId?: string | null;
  vendorOrderId?: string | null;
  payoutId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
};

type WalletResponse = {
  wallet: { id: string; kind: string; updatedAt: string | Date } | null;
  balancePaise: string;
  txns: WalletTxn[];
};

type Props = {
  initialBalancePaise: string;
  initialTxns: WalletTxn[];
};

function getErrorMessage(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const rec = v as Record<string, unknown>;
  const err = rec.error;
  return typeof err === "string" ? err : null;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function formatRupeesFromPaise(paise: string) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return "0.00";
  return (n / 100).toFixed(2);
}

export default function AccountWalletClient({ initialBalancePaise, initialTxns }: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [balancePaise, setBalancePaise] = useState<string>(() => initialBalancePaise);
  const [txns, setTxns] = useState<WalletTxn[]>(() => initialTxns);

  const [topupRupees, setTopupRupees] = useState<string>("500");
  const topupPaise = useMemo(() => {
    const rupees = Number(topupRupees);
    if (!Number.isFinite(rupees) || rupees <= 0) return null;
    return Math.round(rupees * 100);
  }, [topupRupees]);

  async function load() {
    setLoading(true);
    setMsg(null);

    const res = await fetch("/api/wallet", { credentials: "include" });
    const data = (await res.json().catch(() => null)) as WalletResponse | null;

    if (!res.ok) {
      setMsg(getErrorMessage(data) || "Failed to load wallet");
      setLoading(false);
      return;
    }

    setBalancePaise(data?.balancePaise ?? "0");
    setTxns((data?.txns ?? []) as WalletTxn[]);
    setLoading(false);
  }

  async function topup() {
    setMsg(null);

    if (!topupPaise) {
      setMsg("Enter a valid amount");
      return;
    }

    const res = await fetch("/api/wallet/topup/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amountPaise: topupPaise }),
    });

    const data = (await res.json().catch(() => null)) as unknown;

    const rec = (data && typeof data === "object" ? (data as Record<string, unknown>) : null) as Record<string, unknown> | null;

    if (!res.ok || !rec || typeof rec.razorpayOrderId !== "string") {
      setMsg(getErrorMessage(data) || "Failed to create topup");
      return;
    }

    if (!window.Razorpay) {
      setMsg("Razorpay checkout script not loaded");
      return;
    }

    const options: Record<string, unknown> = {
      key: rec.keyId,
      amount: rec.amountPaise,
      currency: rec.currency,
      name: "Bohosaaz",
      description: "Wallet top up",
      order_id: rec.razorpayOrderId,
      handler: async (response: unknown) => {
        const r = (response && typeof response === "object" ? (response as Record<string, unknown>) : null) as
          | Record<string, unknown>
          | null;

        const razorpayOrderId = typeof r?.razorpay_order_id === "string" ? r.razorpay_order_id : null;
        const razorpayPaymentId = typeof r?.razorpay_payment_id === "string" ? r.razorpay_payment_id : null;
        const razorpaySignature = typeof r?.razorpay_signature === "string" ? r.razorpay_signature : null;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
          setMsg("Payment response missing required fields");
          return;
        }

        const verifyRes = await fetch("/api/wallet/topup/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
          }),
        });

        const verifyData = await verifyRes.json().catch(() => null);
        if (!verifyRes.ok) {
          setMsg(verifyData?.error || "Topup verification failed");
          return;
        }

        setMsg("Topup successful");
        await load();
      },
    };

    const rz = new window.Razorpay(options);
    rz.open();
  }

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      {msg && <div className="mt-2 text-sm">{msg}</div>}

      <div className="mt-2 flex items-center gap-3">
        <div className="text-sm">
          Balance: <span className="font-semibold">₹{formatRupeesFromPaise(balancePaise)}</span>
        </div>
        <button className="text-sm underline" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="text-sm font-semibold">Top up</div>
        <div className="mt-2 flex items-center gap-2">
          <input
            className="w-40 rounded-2xl border px-3 py-2 text-sm"
            value={topupRupees}
            onChange={(e) => setTopupRupees(e.target.value)}
            inputMode="decimal"
            placeholder="Amount (₹)"
          />
          <button className="rounded-2xl border px-3 py-2 text-sm" onClick={topup}>
            Pay
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-600">Minimum ₹10, maximum ₹2,00,000 per top up.</div>
      </div>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Direction</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Balance</div>
          <div className="col-span-4">Created</div>
        </div>

        {txns.length === 0 && !loading ? <div className="p-4 text-sm text-gray-600">No transactions yet.</div> : null}

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
    </div>
  );
}
