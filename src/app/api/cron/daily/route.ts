import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notify";
import { rupeesToPaise } from "@/lib/money";
import { getOrCreatePlatformWalletTx, getOrCreateVendorWalletTx, postWalletTxn } from "@/lib/wallet";
import { requireCronSecret } from "@/lib/secrets";
import { bumpLiveVersion } from "@/lib/live";

export async function GET(req: Request) {
  const guard = requireCronSecret(req);
  if (guard) return guard;

  const now = new Date();

  const payoutDelay = Number(process.env.PAYOUT_DELAY_DAYS || 7);
  const refundDelay = Number(process.env.REFUND_REMINDER_DAYS || 3);

  const payoutBefore = new Date(now);
  payoutBefore.setDate(payoutBefore.getDate() - payoutDelay);

  const refundBefore = new Date(now);
  refundBefore.setDate(refundBefore.getDate() - refundDelay);

  // 1) AUTO-SETTLE PAYOUTS
  const toSettle = await prisma.vendorOrder.findMany({
    where: {
      status: "DELIVERED",
      updatedAt: { lte: payoutBefore },
    },
    include: {
      vendor: { include: { user: true } },
    },
  });

  for (const vo of toSettle) {
    await prisma.$transaction(async (tx) => {
      await tx.vendorOrder.update({
        where: { id: vo.id },
        data: { status: "SETTLED" },
      });

      const payoutPaise = rupeesToPaise(vo.payout);
      const commissionPaise = rupeesToPaise(vo.commission);

      const payout = await (tx as unknown as {
        payout: {
          upsert(args: unknown): Promise<{ id: string }>;
        };
      }).payout.upsert({
        where: { vendorOrderId: vo.id },
        update: {
          amountPaise: payoutPaise,
          commissionPaise,
          status: "SETTLED",
          settledAt: new Date(),
        },
        create: {
          vendorId: vo.vendorId,
          vendorOrderId: vo.id,
          amountPaise: payoutPaise,
          commissionPaise,
          status: "SETTLED",
          settledAt: new Date(),
        },
        select: { id: true },
      });

      const walletDb = tx as unknown as Parameters<typeof getOrCreatePlatformWalletTx>[0];
      const vendorWallet = await getOrCreateVendorWalletTx(walletDb, vo.vendorId);
      const platformWallet = await getOrCreatePlatformWalletTx(walletDb);

      await postWalletTxn({
        tx: walletDb,
        walletId: vendorWallet.id,
        type: "PAYOUT",
        direction: "CREDIT",
        amountPaise: payoutPaise,
        idempotencyKey: `PAYOUT:VENDORORDER:${vo.id}:VENDOR`,
        vendorOrderId: vo.id,
        payoutId: payout.id,
      });

      await postWalletTxn({
        tx: walletDb,
        walletId: platformWallet.id,
        type: "PAYOUT",
        direction: "DEBIT",
        amountPaise: payoutPaise,
        idempotencyKey: `PAYOUT:VENDORORDER:${vo.id}:PLATFORM`,
        vendorOrderId: vo.id,
        payoutId: payout.id,
      });
    });

    await Promise.all([
      bumpLiveVersion({ kind: "vendor", vendorId: vo.vendorId }),
      bumpLiveVersion({ kind: "admin" }),
    ]);

    // notify vendor
    if (vo.vendor.user.email) {
      await sendEmail({
        to: vo.vendor.user.email,
        subject: "Payout Settled",
        html: `<p>Your payout of ₹${vo.payout} has been settled.</p>`,
      });
    }
  }

  // 2) REFUND REMINDERS
  const pendingRefunds = await prisma.orderItem.findMany({
    where: {
      status: "RETURN_REQUESTED",
      updatedAt: { lte: refundBefore },
    },
    include: {
      order: { include: { user: true } },
      product: true,
    },
  });

  for (const it of pendingRefunds) {
    if (it.order.user.email) {
      await sendEmail({
        to: it.order.user.email,
        subject: "Refund Pending",
        html: `<p>Your refund request for <b>${it.product.title}</b> is still pending. We’ll update you soon.</p>`,
      });
    }
  }

  return Response.json({
    settled: toSettle.length,
    refundReminders: pendingRefunds.length,
  });
}
