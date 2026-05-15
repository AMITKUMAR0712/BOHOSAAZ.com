import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";
import { rupeesToPaise } from "@/lib/money";
import { getOrCreatePlatformWalletTx, getOrCreateVendorWalletTx, postWalletTxn } from "@/lib/wallet";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await ctx.params;
  if (!id) return jsonError("Missing id", 400);

  const updated = await prisma.$transaction(async (tx) => {
    const vendorOrder = await tx.vendorOrder.findUnique({
      where: { id },
      select: {
        id: true,
        orderId: true,
        vendorId: true,
        status: true,
        payout: true,
        commission: true,
      },
    });
    if (!vendorOrder) throw new Error("Vendor order not found");

    const payoutPaise = rupeesToPaise(vendorOrder.payout);
    const commissionPaise = rupeesToPaise(vendorOrder.commission);

    // Create/ensure payout record (unique by vendorOrderId)
    const payout = await (tx as unknown as {
      payout: {
        upsert(args: unknown): Promise<{ id: string }>;
      };
    }).payout.upsert({
      where: { vendorOrderId: vendorOrder.id },
      update: {
        amountPaise: payoutPaise,
        commissionPaise,
        status: "SETTLED",
        settledAt: new Date(),
      },
      create: {
        vendorId: vendorOrder.vendorId,
        vendorOrderId: vendorOrder.id,
        amountPaise: payoutPaise,
        commissionPaise,
        status: "SETTLED",
        settledAt: new Date(),
      },
      select: { id: true },
    });

    // Ensure wallets exist.
    const walletDb = tx as unknown as Parameters<typeof getOrCreatePlatformWalletTx>[0];
    const vendorWallet = await getOrCreateVendorWalletTx(walletDb, vendorOrder.vendorId);
    const platformWallet = await getOrCreatePlatformWalletTx(walletDb);

    // Ledger postings (idempotent)
    await postWalletTxn({
      tx: walletDb,
      walletId: vendorWallet.id,
      type: "PAYOUT",
      direction: "CREDIT",
      amountPaise: payoutPaise,
      idempotencyKey: `PAYOUT:VENDORORDER:${vendorOrder.id}:VENDOR`,
      vendorOrderId: vendorOrder.id,
      payoutId: payout.id,
    });

    await postWalletTxn({
      tx: walletDb,
      walletId: platformWallet.id,
      type: "PAYOUT",
      direction: "DEBIT",
      amountPaise: payoutPaise,
      idempotencyKey: `PAYOUT:VENDORORDER:${vendorOrder.id}:PLATFORM`,
      vendorOrderId: vendorOrder.id,
      payoutId: payout.id,
    });

    const updatedVendorOrder = await tx.vendorOrder.update({
      where: { id },
      data: { status: "SETTLED" },
      select: { id: true, orderId: true, vendorId: true, status: true },
    });

    return updatedVendorOrder;
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_PAYOUT_SETTLE",
    entity: "VendorOrder",
    entityId: updated.id,
    meta: updated,
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ ok: true });
}
