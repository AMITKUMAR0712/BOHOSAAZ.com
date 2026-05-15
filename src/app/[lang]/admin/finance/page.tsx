import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { paiseToRupees } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getOrCreatePlatformWallet } from "@/lib/wallet";

function formatRupeesFromPaise(paise: string) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return "0.00";
  return (n / 100).toFixed(2);
}

export default async function AdminFinancePage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const platformWallet = await getOrCreatePlatformWallet();

  const db = prisma as unknown as {
    walletTransaction: { findMany(args: unknown): Promise<unknown[]> };
    payout: { groupBy(args: unknown): Promise<unknown[]> };
  };

  const txns = await db.walletTransaction.findMany({
    where: { walletId: platformWallet.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      direction: true,
      status: true,
      amountPaise: true,
      balanceAfterPaise: true,
      note: true,
      createdAt: true,
      orderId: true,
      vendorOrderId: true,
      payoutId: true,
    },
  });

  const txnsTyped = txns as Array<
    {
      amountPaise: bigint;
      balanceAfterPaise: bigint;
      createdAt: Date;
    } & Record<string, unknown>
  >;

  const payoutStatsRaw = await db.payout.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { amountPaise: true, commissionPaise: true },
  });

  const payoutStats = (payoutStatsRaw as Array<Record<string, unknown>>).map((r) => {
    const status = String(r.status ?? "");
    const countObj = r._count as Record<string, unknown> | undefined;
    const sumObj = r._sum as Record<string, unknown> | undefined;

    const count = typeof countObj?._all === "number" ? countObj._all : Number(countObj?._all ?? 0);
    const amountPaise = (sumObj?.amountPaise as bigint | null | undefined) ?? BigInt(0);
    const commissionPaise = (sumObj?.commissionPaise as bigint | null | undefined) ?? BigInt(0);

    return {
      status,
      count,
      amountPaise: amountPaise.toString(),
      commissionPaise: commissionPaise.toString(),
    };
  });

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Finance</CardTitle>
          <CardDescription>Platform wallet balance, payout stats, and recent ledger activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              Platform wallet balance: <span className="font-semibold">₹{paiseToRupees(platformWallet.balancePaise).toFixed(2)}</span>
            </div>
            <Link className="text-sm underline" href="/api/admin/payouts/csv">
              Download payouts CSV
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border overflow-hidden">
            <div className="grid grid-cols-12 gap-2 bg-gray-50 p-3 text-sm font-semibold">
              <div className="col-span-4">Payout status</div>
              <div className="col-span-2">Count</div>
              <div className="col-span-3">Amount</div>
              <div className="col-span-3">Commission</div>
            </div>

            {payoutStats.length === 0 ? <div className="p-4 text-sm text-gray-600">No payout stats yet.</div> : null}

            {payoutStats.map((s) => (
              <div key={s.status} className="grid grid-cols-12 gap-2 p-3 text-sm border-t">
                <div className="col-span-4 font-semibold">{s.status}</div>
                <div className="col-span-2">{s.count}</div>
                <div className="col-span-3">₹{formatRupeesFromPaise(s.amountPaise)}</div>
                <div className="col-span-3">₹{formatRupeesFromPaise(s.commissionPaise)}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border overflow-hidden">
            <div className="grid grid-cols-12 gap-2 bg-gray-50 p-3 text-sm font-semibold">
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Direction</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Balance</div>
              <div className="col-span-4">Created</div>
            </div>

            {txnsTyped.length === 0 ? <div className="p-4 text-sm text-gray-600">No platform wallet transactions yet.</div> : null}

            {txnsTyped.map((t) => {
              const r = t as Record<string, unknown>;
              return (
                <div key={String(r.id ?? "")} className="grid grid-cols-12 gap-2 p-3 text-sm border-t">
                  <div className="col-span-2 font-semibold">{String(r.type ?? "")}</div>
                  <div className="col-span-2">{String(r.direction ?? "")}</div>
                  <div className="col-span-2">₹{formatRupeesFromPaise(t.amountPaise.toString())}</div>
                  <div className="col-span-2">₹{formatRupeesFromPaise(t.balanceAfterPaise.toString())}</div>
                  <div className="col-span-4 text-xs text-gray-600">{new Date(t.createdAt).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
