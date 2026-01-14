import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = prisma as unknown as {
    walletAccount: { findUnique(args: unknown): Promise<{ id: string; balancePaise: bigint; kind: string; updatedAt: Date } | null> };
    walletTransaction: { findMany(args: unknown): Promise<unknown[]> };
  };

  const wallet = await db.walletAccount.findUnique({
    where: { userId: me.id },
    select: { id: true, balancePaise: true, kind: true, updatedAt: true },
  });

  if (!wallet) {
    return NextResponse.json({
      wallet: null,
      balancePaise: "0",
      txns: [],
    });
  }

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
    } & Record<string, unknown>
  >;

  return NextResponse.json({
    wallet: { id: wallet.id, kind: wallet.kind, updatedAt: wallet.updatedAt },
    balancePaise: wallet.balancePaise.toString(),
    txns: txnsTyped.map((t) => ({
      ...t,
      amountPaise: t.amountPaise.toString(),
      balanceAfterPaise: t.balanceAfterPaise.toString(),
    })),
  });
}
