import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserWallet, postWalletTxn } from "@/lib/wallet";

const BodySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

function verifySignature({
  orderId,
  paymentId,
  signature,
  secret,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}) {
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: Request) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const db = prisma as unknown as {
    razorpayTopup: {
      findUnique(args: unknown): Promise<
        | {
            id: string;
            userId: string;
            status: "CREATED" | "PAID" | "FAILED";
            amountPaise: bigint;
            razorpayOrderId: string;
          }
        | null
      >;
      update(args: unknown): Promise<unknown>;
    };
  };

  const ok = verifySignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
    secret: keySecret,
  });

  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const topup = await db.razorpayTopup.findUnique({
    where: { razorpayOrderId },
  });

  if (!topup || topup.userId !== me.id) {
    return NextResponse.json({ error: "Topup not found" }, { status: 404 });
  }

  if (topup.status === "PAID") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  // Mark paid (unique paymentId makes retries safe).
  await db.razorpayTopup.update({
    where: { id: topup.id },
    data: { status: "PAID", razorpayPaymentId },
  });

  const wallet = await getOrCreateUserWallet(me.id);

  // Credit wallet once (idempotent via wallet txn key).
  await postWalletTxn({
    walletId: wallet.id,
    type: "TOPUP",
    direction: "CREDIT",
    amountPaise: topup.amountPaise,
    idempotencyKey: `TOPUP:${topup.razorpayOrderId}`,
    razorpayOrderId: topup.razorpayOrderId,
    razorpayPaymentId,
  });

  return NextResponse.json({ ok: true });
}
