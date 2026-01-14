import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AccountWalletClient from "@/components/account/AccountWalletClient";
import ExportDropdown from "@/components/ExportDropdown";

export default async function AccountWalletPage() {
  const me = await requireUser();
  if (!me) return null;

  const db = prisma as unknown as {
    walletAccount: { findUnique(args: unknown): Promise<{ id: string; balancePaise: bigint; kind: string; updatedAt: Date } | null> };
    walletTransaction: { findMany(args: unknown): Promise<unknown[]> };
  };

  const wallet = await db.walletAccount.findUnique({
    where: { userId: me.id },
    select: { id: true, balancePaise: true, kind: true, updatedAt: true },
  });

  const txns = wallet
    ? await db.walletTransaction.findMany({
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
          orderId: true,
          vendorOrderId: true,
          payoutId: true,
          razorpayOrderId: true,
          razorpayPaymentId: true,
        },
      })
    : [];

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
      orderId: typeof r.orderId === "string" ? r.orderId : null,
      vendorOrderId: typeof r.vendorOrderId === "string" ? r.vendorOrderId : null,
      payoutId: typeof r.payoutId === "string" ? r.payoutId : null,
      razorpayOrderId: typeof r.razorpayOrderId === "string" ? r.razorpayOrderId : null,
      razorpayPaymentId: typeof r.razorpayPaymentId === "string" ? r.razorpayPaymentId : null,
    };
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Wallet</CardTitle>
            <CardDescription>Top up your wallet and view your transaction history.</CardDescription>
          </div>
          <ExportDropdown
            filenameBase="Bohosaaz_Wallet"
            csv={{ href: "/api/export/user/wallet.csv" }}
            pdf={{ href: "/api/export/user/wallet.pdf" }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <AccountWalletClient
          initialBalancePaise={wallet ? wallet.balancePaise.toString() : "0"}
          initialTxns={initialTxns}
        />
      </CardContent>
    </Card>
  );
}
