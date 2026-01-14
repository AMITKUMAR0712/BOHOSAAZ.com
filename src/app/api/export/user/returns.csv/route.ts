import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { buildCreatedAtRange, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { ReturnRequestStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const me = await requireUser();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);
  const status = (url.searchParams.get("status") || "").trim();

  const where: Prisma.ReturnRequestWhereInput = {
    userId: me.id,
    ...(range ? { createdAt: range } : {}),
  };
  if (status && status !== "ALL") {
    if ((Object.values(ReturnRequestStatus) as string[]).includes(status)) {
      where.status = status as ReturnRequestStatus;
    }
  }

  const returns = await prisma.returnRequest.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 5000,
    select: {
      id: true,
      status: true,
      reason: true,
      notes: true,
      orderId: true,
      orderItemId: true,
      pickupCourier: true,
      pickupTrackingNumber: true,
      requestedAt: true,
      approvedAt: true,
      rejectedAt: true,
      pickedAt: true,
      refundedAt: true,
      createdAt: true,
      updatedAt: true,
      orderItem: {
        select: {
          quantity: true,
          price: true,
          status: true,
          product: { select: { title: true } },
        },
      },
    },
  });

  const headers = [
    "returnRequestId",
    "status",
    "reason",
    "notes",
    "orderId",
    "orderItemId",
    "productTitle",
    "quantity",
    "unitPrice",
    "pickupCourier",
    "pickupTrackingNumber",
    "requestedAt",
    "approvedAt",
    "rejectedAt",
    "pickedAt",
    "refundedAt",
    "createdAt",
    "updatedAt",
  ];

  const rows = returns.map((rr) => ({
    returnRequestId: rr.id,
    status: rr.status,
    reason: rr.reason,
    notes: rr.notes || "",
    orderId: rr.orderId,
    orderItemId: rr.orderItemId,
    productTitle: rr.orderItem.product.title,
    quantity: rr.orderItem.quantity,
    unitPrice: rr.orderItem.price,
    pickupCourier: rr.pickupCourier || "",
    pickupTrackingNumber: rr.pickupTrackingNumber || "",
    requestedAt: formatIsoDateTime(rr.requestedAt),
    approvedAt: rr.approvedAt ? formatIsoDateTime(rr.approvedAt) : "",
    rejectedAt: rr.rejectedAt ? formatIsoDateTime(rr.rejectedAt) : "",
    pickedAt: rr.pickedAt ? formatIsoDateTime(rr.pickedAt) : "",
    refundedAt: rr.refundedAt ? formatIsoDateTime(rr.refundedAt) : "",
    createdAt: formatIsoDateTime(rr.createdAt),
    updatedAt: formatIsoDateTime(rr.updatedAt),
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Returns_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
