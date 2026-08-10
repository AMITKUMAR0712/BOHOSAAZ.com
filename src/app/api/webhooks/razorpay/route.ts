import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { restoreOrderStock } from "@/lib/stock";
import { bumpDashboardScopes } from "@/lib/bumpDashboard";
import { sendCapiEvent, splitName } from "@/lib/metaCapi";
import { env } from "@/lib/env";

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

      type CapiPurchase = {
        eventId: string;
        eventSourceUrl: string;
        user: Parameters<typeof sendCapiEvent>[0]["user"];
        customData: Record<string, unknown>;
      };

      if (orderId && razorpayOrderId) {
        const { bumpScopes, capiPurchase } = await prisma.$transaction(async (tx) => {
          let capiPurchase: CapiPurchase | null = null;
          const op = await tx.orderPayment.findUnique({
            where: { orderId },
            select: { id: true, status: true, razorpayOrderId: true },
          });

          const order = await tx.order.findUnique({
            where: { id: orderId },
            select: {
              id: true,
              userId: true,
              status: true,
              fullName: true,
              phone: true,
              city: true,
              total: true,
              currency: true,
              user: { select: { email: true } },
              items: { select: { productId: true, quantity: true, product: { select: { vendorId: true } } } },
            },
          });

          if (op && op.razorpayOrderId === razorpayOrderId) {
            if (eventName === "payment.captured") {
              const wasAlreadyPaid = op.status === "PAID";

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

              if (!wasAlreadyPaid && order) {
                const { firstName, lastName } = splitName(order.fullName);
                capiPurchase = {
                  eventId: order.id,
                  eventSourceUrl: `${env.NEXT_PUBLIC_APP_URL || ""}/order/${order.id}`,
                  user: {
                    email: order.user.email,
                    phone: order.phone,
                    firstName,
                    lastName,
                    city: order.city,
                    fbp: typeof notes?.fbp === "string" ? notes.fbp : undefined,
                    fbc: typeof notes?.fbc === "string" ? notes.fbc : undefined,
                  },
                  customData: {
                    value: order.total,
                    currency: order.currency,
                    content_type: "product",
                    content_ids: order.items.map((it) => it.productId),
                    num_items: order.items.reduce((n, it) => n + it.quantity, 0),
                  },
                };
              }
            } else {
              if (op.status !== "FAILED" && order?.status === "PENDING") {
                await restoreOrderStock(tx, orderId);
              }
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

          const vendorIds = Array.from(
            new Set((order?.items ?? []).map((item) => item.product.vendorId).filter((vendorId): vendorId is string => Boolean(vendorId))),
          );
          const bumpScopes = order
            ? [
                { kind: "user" as const, userId: order.userId },
                { kind: "admin" as const },
                ...vendorIds.map((vendorId) => ({ kind: "vendor" as const, vendorId })),
              ]
            : [];
          return { bumpScopes, capiPurchase };
        });
        await bumpDashboardScopes(bumpScopes);

        if (capiPurchase) {
          await sendCapiEvent({
            eventName: "Purchase",
            eventId: capiPurchase.eventId,
            eventSourceUrl: capiPurchase.eventSourceUrl,
            user: capiPurchase.user,
            customData: capiPurchase.customData,
          });
        }
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
