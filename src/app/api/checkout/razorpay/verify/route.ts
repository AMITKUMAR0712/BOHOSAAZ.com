import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  orderId: z.string().min(1),
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
  if (typeof signature !== "string" || signature.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
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

  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const ok = verifySignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
    secret: keySecret,
  });

  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true, paymentMethod: true },
    });

    if (!order || order.userId !== me.id) {
      return { error: "Order not found" as const, status: 404 as const };
    }

    const payment = await tx.orderPayment.findUnique({
      where: { orderId: order.id },
      select: { id: true, status: true, razorpayOrderId: true },
    });

    if (!payment || payment.razorpayOrderId !== razorpayOrderId) {
      return { error: "Payment record not found" as const, status: 404 as const };
    }

    if (payment.status === "PAID" && order.status === "PAID") {
      return { ok: true as const, alreadyPaid: true as const };
    }

    await tx.orderPayment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        razorpayPaymentId,
        capturedAt: new Date(),
        failedAt: null,
        failureReason: null,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paymentMethod: "RAZORPAY" },
    });

    return { ok: true as const };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
