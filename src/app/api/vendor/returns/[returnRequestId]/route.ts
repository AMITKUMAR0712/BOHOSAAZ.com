import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { ReturnRequestStatus } from "@prisma/client";

const PatchSchema = z
  .object({
    action: z.enum(["approve", "reject", "schedule_pickup", "mark_picked"]),
    rejectReason: z.string().min(2).max(500).optional(),
    pickupCourier: z.string().min(2).max(80).optional(),
    pickupTrackingNumber: z.string().min(2).max(120).optional(),
    pickupScheduledAt: z.string().datetime().optional(),
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ returnRequestId: string }> }
) {
  const vendorUser = await requireApprovedVendor();
  if (!vendorUser) return jsonError("Unauthorized", 401);

  const { returnRequestId } = await params;

  const rr = await prisma.returnRequest.findFirst({
    where: { id: returnRequestId, vendorId: vendorUser.vendor!.id },
    include: {
      order: { select: { id: true, createdAt: true, status: true, city: true, state: true, pincode: true } },
      orderItem: { select: { id: true, quantity: true, price: true, status: true, product: { select: { title: true, slug: true } } } },
      trackingEvents: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!rr) return jsonError("Not found", 404);

  return jsonOk({ returnRequest: rr });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ returnRequestId: string }> }
) {
  const vendorUser = await requireApprovedVendor();
  if (!vendorUser) return jsonError("Unauthorized", 401);

  const { returnRequestId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const now = new Date();

  const rr = await prisma.returnRequest.findFirst({
    where: { id: returnRequestId, vendorId: vendorUser.vendor!.id },
    include: { orderItem: true },
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
          actorId: vendorUser.id,
          actorRole: vendorUser.role,
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
      await createEvent("APPROVED", "Approved by vendor");
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

    // mark_picked
    if (rr.status !== "PICKUP_SCHEDULED") throw new Error("Only PICKUP_SCHEDULED can be marked picked");
    const next = await tx.returnRequest.update({ where: { id: rr.id }, data: { status: "PICKED", pickedAt: now } });
    await createEvent("PICKED", "Picked up");
    return next;
  });

  await audit({
    actorId: vendorUser.id,
    actorRole: vendorUser.role,
    action: `VENDOR_RETURN_${action.toUpperCase()}`,
    entity: "ReturnRequest",
    entityId: updated.id,
    meta: { action },
    ip: req.headers.get("x-forwarded-for") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return jsonOk({ returnRequestId: updated.id });
}
