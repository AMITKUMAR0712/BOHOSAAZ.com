import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";
import { rupeesToPaise } from "@/lib/money";
import { getOrCreatePlatformWalletTx, getOrCreateUserWalletTx, postWalletTxn } from "@/lib/wallet";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { itemId } = await ctx.params;

  let result: { orderId: string };
  try {
    result = await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({
        where: { id: itemId },
        include: { order: true, product: true, vendorOrder: true },
      });

      if (!item) throw new Error("Item not found");
      if (item.status !== "RETURN_REQUESTED") {
        throw new Error("Item is not return-requested");
      }

      // Wallet refund (always credits user wallet; platform can go negative for COD)
      const refundPaise = rupeesToPaise(item.price * item.quantity);
      const walletDb = tx as unknown as Parameters<typeof getOrCreatePlatformWalletTx>[0];
      const userWallet = await getOrCreateUserWalletTx(walletDb, item.order.userId);
      const platformWallet = await getOrCreatePlatformWalletTx(walletDb);

      await postWalletTxn({
        tx: walletDb,
        walletId: userWallet.id,
        type: "REFUND",
        direction: "CREDIT",
        amountPaise: refundPaise,
        idempotencyKey: `REFUND:ITEM:${item.id}:USER`,
        orderId: item.orderId,
      });

      await postWalletTxn({
        tx: walletDb,
        walletId: platformWallet.id,
        type: "REFUND",
        direction: "DEBIT",
        amountPaise: refundPaise,
        idempotencyKey: `REFUND:ITEM:${item.id}:PLATFORM`,
        orderId: item.orderId,
      });

      // Mark refunded
      await tx.orderItem.update({
        where: { id: item.id },
        data: { status: "REFUNDED" },
      });

    // Recompute order total
      const allItems = await tx.orderItem.findMany({ where: { orderId: item.orderId } });
      const orderTotal = allItems
        .filter((it) => it.status !== "REFUNDED")
        .reduce((sum, it) => sum + it.price * it.quantity, 0);

      await tx.order.update({
        where: { id: item.orderId },
        data: { total: orderTotal },
      });

    // Adjust vendor order (if present)
      if (item.vendorOrderId) {
        const voItems = await tx.orderItem.findMany({
          where: { vendorOrderId: item.vendorOrderId },
          include: { product: { include: { vendor: true } } },
        });

      const subtotal = voItems
        .filter((it) => it.status !== "REFUNDED")
        .reduce((sum, it) => sum + it.price * it.quantity, 0);

      const vendor = voItems[0]?.product?.vendor;
      const commissionPct = Number(vendor?.commission ?? 0);
      const rate = commissionPct > 1 ? commissionPct / 100 : commissionPct;
      const commission = +(subtotal * rate).toFixed(2);
      const payout = +(subtotal - commission).toFixed(2);

        await tx.vendorOrder.update({
          where: { id: item.vendorOrderId },
          data: { subtotal, commission, payout },
        });
      }

      return { orderId: item.orderId };
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Refund approval failed";
    const status = message === "Item not found" ? 404 : 400;
    return jsonError(message, status);
  }

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_REFUND_APPROVE",
    entity: "OrderItem",
    entityId: itemId,
    meta: result,
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk(result);
}
