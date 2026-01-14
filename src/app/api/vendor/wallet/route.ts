import { NextResponse } from "next/server";

import { requireApprovedVendor } from "@/lib/auth";
import { paiseToRupees } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getOrCreateVendorWallet } from "@/lib/wallet";

export async function GET() {
  const me = await requireApprovedVendor();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendorId = me.vendor?.id;
  if (!vendorId) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

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
      orderId: true,
      vendorOrderId: true,
      payoutId: true,
      razorpayOrderId: true,
      razorpayPaymentId: true,
    },
  });

  const txnsTyped = txns as Array<
    {
      amountPaise: bigint;
      balanceAfterPaise: bigint;
      createdAt: Date;
    } & Record<string, unknown>
  >;

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

  return NextResponse.json({
    wallet: {
      id: wallet.id,
      kind: wallet.kind,
      balancePaise: wallet.balancePaise.toString(),
      balanceRupees: paiseToRupees(wallet.balancePaise),
    },
    txns: txnsTyped.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      amountPaise: t.amountPaise.toString(),
      balanceAfterPaise: t.balanceAfterPaise.toString(),
    })),
    payouts: payoutsTyped.map((p) => ({
      ...p,
      amountPaise: p.amountPaise.toString(),
      commissionPaise: p.commissionPaise.toString(),
      settledAt: p.settledAt ? p.settledAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      vendorOrder: {
        ...p.vendorOrder,
        createdAt: p.vendorOrder.createdAt.toISOString(),
      },
    })),
  });
}
