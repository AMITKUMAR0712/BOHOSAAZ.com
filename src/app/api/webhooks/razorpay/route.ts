import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("x-razorpay-signature") || "";

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    await prisma.webhookLog.create({
      data: {
        provider: "RAZORPAY",
        event: "missing_secret",
        payload: Prisma.DbNull,
        ok: false,
        statusCode: 500,
        error: "RAZORPAY_WEBHOOK_SECRET not configured",
      },
    });
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const sigOk = (() => {
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  })();

  let event: unknown = null;
  try {
    event = JSON.parse(body);
  } catch {
    // keep event null
  }

  const eventRecord = asRecord(event);

  if (!sigOk) {
    await prisma.webhookLog.create({
      data: {
        provider: "RAZORPAY",
        event: typeof eventRecord?.event === "string" ? eventRecord.event : "unknown",
        payload: event === null ? Prisma.DbNull : (event as Prisma.InputJsonValue),
        ok: false,
        statusCode: 400,
        error: "Invalid signature",
      },
    });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventName = typeof eventRecord?.event === "string" ? eventRecord.event : "unknown";

  try {
    if (eventName === "payment.captured" || eventName === "payment.failed") {
      const payloadRecord = asRecord(eventRecord?.payload);
      const paymentRecord = asRecord(payloadRecord?.payment);
      const payment = asRecord(paymentRecord?.entity);
      const notes = asRecord(payment?.notes);

      const orderId: string | null = typeof notes?.orderId === "string" ? notes.orderId : null;
      const razorpayOrderId: string | null = typeof payment?.order_id === "string" ? payment.order_id : null;
      const razorpayPaymentId: string | null = typeof payment?.id === "string" ? payment.id : null;

      if (orderId && razorpayOrderId) {
        await prisma.$transaction(async (tx) => {
          const op = await tx.orderPayment.findUnique({
            where: { orderId },
            select: { id: true, status: true, razorpayOrderId: true },
          });

          if (op && op.razorpayOrderId === razorpayOrderId) {
            if (eventName === "payment.captured") {
              await tx.orderPayment.update({
                where: { id: op.id },
                data: {
                  status: "PAID",
                  razorpayPaymentId: razorpayPaymentId ?? undefined,
                  capturedAt: new Date(),
                  failedAt: null,
                  failureReason: null,
                },
              });

              await tx.order.update({
                where: { id: orderId },
                data: { status: "PAID", paymentMethod: "RAZORPAY" },
              });
            } else {
              await tx.orderPayment.update({
                where: { id: op.id },
                data: {
                  status: "FAILED",
                  razorpayPaymentId: razorpayPaymentId ?? undefined,
                  failedAt: new Date(),
                  failureReason: typeof payment?.error_description === "string" ? payment.error_description : null,
                },
              });
            }
          }
        });
      }
    }

    await prisma.webhookLog.create({
      data: {
        provider: "RAZORPAY",
        event: eventName,
        payload: event === null ? Prisma.DbNull : (event as Prisma.InputJsonValue),
        ok: true,
        statusCode: 200,
      },
    });

    return Response.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Webhook handler failed";
    await prisma.webhookLog.create({
      data: {
        provider: "RAZORPAY",
        event: eventName,
        payload: event === null ? Prisma.DbNull : (event as Prisma.InputJsonValue),
        ok: false,
        statusCode: 500,
        error: message,
      },
    });
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
