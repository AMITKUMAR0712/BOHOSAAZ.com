import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserWallet } from "@/lib/wallet";

const BodySchema = z.object({
  amountPaise: z.coerce
    .number()
    .int()
    .min(1000, "Minimum topup is ₹10")
    .max(2_00_00_000, "Maximum topup is ₹2,00,000"),
});

export async function POST(req: Request) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }

  const { amountPaise } = parsed.data;

  const wallet = await getOrCreateUserWallet(me.id);

  const db = prisma as unknown as {
    razorpayTopup: { create(args: unknown): Promise<unknown> };
  };

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  // Create Razorpay order in paise.
  const order = (await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `topup_${me.id}_${Date.now()}`,
    payment_capture: true,
  })) as unknown as { id: string };

  // Persist idempotency on our side by unique razorpayOrderId.
  await db.razorpayTopup.create({
    data: {
      walletId: wallet.id,
      userId: me.id,
      amountPaise: BigInt(amountPaise),
      status: "CREATED",
      razorpayOrderId: order.id,
    },
  });

  return NextResponse.json({
    keyId,
    razorpayOrderId: order.id,
    amountPaise,
    currency: "INR",
  });
}
