import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import VendorWalletClient from "@/components/vendor/VendorWalletClient";
import { requireApprovedVendor } from "@/lib/auth";
import { paiseToRupees } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getOrCreateVendorWallet } from "@/lib/wallet";
import ExportDropdown from "@/components/ExportDropdown";

export default async function VendorWalletPage() {
  const me = await requireApprovedVendor();
  if (!me) return null;

  const vendorId = me.vendor?.id;
  if (!vendorId) return null;

  const wallet = await getOrCreateVendorWallet(vendorId);

  const db = prisma as unknown as {
    walletTransaction: { findMany(args: unknown): Promise<unknown[]> };
    payout: { findMany(args: unknown): Promise<unknown[]> };
  };

  const txns = await db.walletTransaction.findMany({
    where: { walletId: wallet.id },
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
    },
  });

  const txnsTyped = txns as Array<
    {
      amountPaise: bigint;
      balanceAfterPaise: bigint;
      createdAt: Date;
    } & Record<string, unknown>
  >;

  const initialTxns = txnsTyped.map((t) => {
    const r = t as Record<string, unknown>;

    return {
      id: String(r.id ?? ""),
      type: String(r.type ?? ""),
      direction: String(r.direction ?? ""),
      status: String(r.status ?? ""),
      note: typeof r.note === "string" ? r.note : null,
      createdAt: t.createdAt.toISOString(),
      amountPaise: t.amountPaise.toString(),
      balanceAfterPaise: t.balanceAfterPaise.toString(),
    };
  });

  const payouts = await db.payout.findMany({
    where: { vendorId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      vendorOrderId: true,
      status: true,
      amountPaise: true,
      commissionPaise: true,
      settledAt: true,
      createdAt: true,
      updatedAt: true,
      vendorOrder: {
        select: {
          orderId: true,
          status: true,
          subtotal: true,
          commission: true,
          payout: true,
          createdAt: true,
        },
      },
    },
  });

  const payoutsTyped = payouts as Array<
    {
      amountPaise: bigint;
      commissionPaise: bigint;
      createdAt: Date;
      updatedAt: Date;
      settledAt: Date | null;
      vendorOrder: { createdAt: Date } & Record<string, unknown>;
    } & Record<string, unknown>
  >;

  const initialPayouts = payoutsTyped.map((p) => {
    const r = p as Record<string, unknown>;
    const vo = p.vendorOrder as Record<string, unknown>;

    return {
      id: String(r.id ?? ""),
      vendorOrderId: String(r.vendorOrderId ?? ""),
      status: String(r.status ?? ""),
      amountPaise: p.amountPaise.toString(),
      commissionPaise: p.commissionPaise.toString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      settledAt: p.settledAt ? p.settledAt.toISOString() : null,
      vendorOrder: {
        orderId: typeof vo.orderId === "string" ? vo.orderId : "",
        status: typeof vo.status === "string" ? vo.status : "",
        subtotal: typeof vo.subtotal === "number" ? vo.subtotal : Number(vo.subtotal ?? 0),
        commission: typeof vo.commission === "number" ? vo.commission : Number(vo.commission ?? 0),
        payout: typeof vo.payout === "number" ? vo.payout : Number(vo.payout ?? 0),
        createdAt: p.vendorOrder.createdAt.toISOString(),
      },
    };
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Wallet</CardTitle>
            <CardDescription>Vendor wallet balance, ledger, and payout history.</CardDescription>
          </div>
          <ExportDropdown
            filenameBase="Bohosaaz_VendorWallet"
            csv={{ href: "/api/export/vendor/wallet.csv" }}
            pdf={{ href: "/api/export/vendor/wallet.pdf" }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <VendorWalletClient
          initialWallet={{
            id: wallet.id,
            kind: String(wallet.kind),
            balancePaise: wallet.balancePaise.toString(),
            balanceRupees: paiseToRupees(wallet.balancePaise),
          }}
          initialTxns={initialTxns}
          initialPayouts={initialPayouts}
        />
      </CardContent>
    </Card>
  );
}
