import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getOrCreateUserWalletTx, postWalletTxn } from "@/lib/wallet";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { ReturnRequestStatus } from "@prisma/client";

const PatchSchema = z
  .object({
    action: z.enum(["approve", "reject", "schedule_pickup", "mark_picked", "mark_refunded"]),
    rejectReason: z.string().min(2).max(500).optional(),
    pickupCourier: z.string().min(2).max(80).optional(),
    pickupTrackingNumber: z.string().min(2).max(120).optional(),
    pickupScheduledAt: z.string().datetime().optional(),
    provider: z.string().min(2).max(40).optional(),
    providerRefundId: z.string().min(2).max(120).optional(),
    refundStatus: z.enum(["PROCESSING", "COMPLETED", "FAILED"]).optional(),
    refundNote: z.string().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.action === "reject" && !v.rejectReason) {
      ctx.addIssue({ code: "custom", message: "rejectReason required", path: ["rejectReason"] });
    }
    if (v.action === "schedule_pickup") {
      if (!v.pickupCourier) ctx.addIssue({ code: "custom", message: "pickupCourier required", path: ["pickupCourier"] });
      if (!v.pickupTrackingNumber)
        ctx.addIssue({ code: "custom", message: "pickupTrackingNumber required", path: ["pickupTrackingNumber"] });
    }
  });

function amountPaiseFromRupees(amount: number) {
  return BigInt(Math.max(0, Math.round(amount * 100)));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ returnRequestId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { returnRequestId } = await params;

  const rr = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: {
      order: true,
      orderItem: { include: { product: { include: { images: true } } } },
      user: true,
      vendor: true,
      trackingEvents: { orderBy: { createdAt: "asc" } },
      refundRecord: true,
    },
  });

  if (!rr) return jsonError("Not found", 404);

  return jsonOk({ returnRequest: rr });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ returnRequestId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { returnRequestId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const now = new Date();

  const rr = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: { order: true, orderItem: true },
  });
  if (!rr) return jsonError("Not found", 404);

  const action = parsed.data.action;

  const updated = await prisma.$transaction(async (tx) => {
    const createEvent = async (status: ReturnRequestStatus, note?: string) => {
      await tx.returnTrackingEvent.create({
        data: {
          returnRequestId: rr.id,
          status,
          note: note || undefined,
          actorId: admin.id,
          actorRole: admin.role,
        },
      });
    };

    if (action === "approve") {
      if (rr.status !== "REQUESTED") throw new Error("Only REQUESTED can be approved");

      const next = await tx.returnRequest.update({
        where: { id: rr.id },
        data: { status: "APPROVED", approvedAt: now },
      });

      await tx.orderItem.update({ where: { id: rr.orderItemId }, data: { status: "RETURN_APPROVED" } });
      await createEvent("APPROVED", "Approved");
      return next;
    }

    if (action === "reject") {
      if (rr.status !== "REQUESTED") throw new Error("Only REQUESTED can be rejected");

      const next = await tx.returnRequest.update({
        where: { id: rr.id },
        data: { status: "REJECTED", rejectedAt: now, rejectReason: parsed.data.rejectReason },
      });
      await createEvent("REJECTED", parsed.data.rejectReason);
      return next;
    }

    if (action === "schedule_pickup") {
      if (rr.status !== "APPROVED") throw new Error("Only APPROVED can be scheduled");

      const next = await tx.returnRequest.update({
        where: { id: rr.id },
        data: {
          status: "PICKUP_SCHEDULED",
          pickupCourier: parsed.data.pickupCourier,
          pickupTrackingNumber: parsed.data.pickupTrackingNumber,
          pickupScheduledAt: parsed.data.pickupScheduledAt ? new Date(parsed.data.pickupScheduledAt) : now,
        },
      });
      await createEvent(
        "PICKUP_SCHEDULED",
        `Pickup scheduled (${parsed.data.pickupCourier} • ${parsed.data.pickupTrackingNumber})`
      );
      return next;
    }

    if (action === "mark_picked") {
      if (rr.status !== "PICKUP_SCHEDULED") throw new Error("Only PICKUP_SCHEDULED can be marked picked");

      const next = await tx.returnRequest.update({
        where: { id: rr.id },
        data: { status: "PICKED", pickedAt: now },
      });
      await createEvent("PICKED", "Picked up");
      return next;
    }

    // mark_refunded
    if (rr.status !== "PICKED") throw new Error("Only PICKED can be refunded");

    const amount = rr.orderItem.price * rr.orderItem.quantity;
    const method = rr.order.paymentMethod;

    let refundStatus = parsed.data.refundStatus;

    // For COD we credit wallet immediately; for online, default to PROCESSING unless explicitly completed.
    if (!refundStatus) {
      refundStatus = method === "COD" ? "COMPLETED" : parsed.data.providerRefundId ? "COMPLETED" : "PROCESSING";
    }

    let walletTxnId: string | null = null;

    if (method === "COD" && refundStatus === "COMPLETED") {
      type WalletDbClient = Parameters<typeof getOrCreateUserWalletTx>[0];
      const walletDb = tx as unknown as WalletDbClient;

      const wallet = await getOrCreateUserWalletTx(walletDb, rr.userId);
      const txn = await postWalletTxn({
        tx: walletDb,
        walletId: wallet.id,
        type: "REFUND",
        direction: "CREDIT",
        amountPaise: amountPaiseFromRupees(amount),
        idempotencyKey: `return_refund:${rr.id}`,
        note: `Refund for return ${rr.id}`,
        orderId: rr.orderId,
        meta: { returnRequestId: rr.id },
      });
      walletTxnId = (txn as { id: string }).id;
    }

    await tx.refundRecord.upsert({
      where: { returnRequestId: rr.id },
      create: {
        returnRequestId: rr.id,
        orderId: rr.orderId,
        userId: rr.userId,
        status: refundStatus,
        method,
        amount,
        provider: parsed.data.provider,
        providerRefundId: parsed.data.providerRefundId,
        walletTxnId: walletTxnId || undefined,
        meta: parsed.data.refundNote ? { note: parsed.data.refundNote } : undefined,
      },
      update: {
        status: refundStatus,
        provider: parsed.data.provider ?? undefined,
        providerRefundId: parsed.data.providerRefundId ?? undefined,
        walletTxnId: walletTxnId ?? undefined,
        meta: parsed.data.refundNote ? { note: parsed.data.refundNote } : undefined,
      },
    });

    const next = await tx.returnRequest.update({
      where: { id: rr.id },
      data: { status: "REFUNDED", refundedAt: now },
    });

    await tx.orderItem.update({ where: { id: rr.orderItemId }, data: { status: "REFUNDED" } });

    await createEvent("REFUNDED", refundStatus === "COMPLETED" ? "Refund completed" : "Refund processing");

    return next;
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: `ADMIN_RETURN_${action.toUpperCase()}`,
    entity: "ReturnRequest",
    entityId: rr.id,
    meta: { action },
    ip: req.headers.get("x-forwarded-for") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return jsonOk({ returnRequestId: updated.id });
}
