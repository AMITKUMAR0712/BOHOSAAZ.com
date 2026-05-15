import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { buildCreatedAtRange, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { ReturnRequestStatus, type Prisma } from "@prisma/client";

function maskName(name: string | null | undefined) {
  const n = String(name || "").trim();
  if (!n) return "";
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  if (!first) return "";
  return first.length <= 1 ? "*" : first[0] + "*".repeat(Math.min(6, first.length - 1));
}

function maskPincode(pincode: string | null | undefined) {
  const p = String(pincode || "").trim();
  if (!p) return "";
  if (p.length <= 2) return "**";
  return "*".repeat(p.length - 2) + p.slice(-2);
}

export async function GET(req: Request) {
  const me = await requireApprovedVendor();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const vendorId = me.vendor?.id;
  if (!vendorId) return new Response("Vendor not found", { status: 404 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);
  const status = (url.searchParams.get("status") || "").trim();

  const where: Prisma.ReturnRequestWhereInput = {
    vendorId,
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
      order: { select: { fullName: true, city: true, state: true, pincode: true } },
      orderItem: {
        select: {
          quantity: true,
          price: true,
          product: { select: { title: true, slug: true } },
        },
      },
    },
  });

  const headers = [
    "returnRequestId",
    "status",
    "orderId",
    "orderItemId",
    "productTitle",
    "quantity",
    "unitPrice",
    "reason",
    "customerNameMasked",
    "city",
    "state",
    "pincodeMasked",
    "pickupCourier",
    "pickupTrackingNumber",
    "requestedAt",
    "approvedAt",
    "rejectedAt",
    "pickedAt",
    "refundedAt",
    "updatedAt",
  ];

  const rows = returns.map((rr) => ({
    returnRequestId: rr.id,
    status: rr.status,
    orderId: rr.orderId,
    orderItemId: rr.orderItemId,
    productTitle: rr.orderItem.product.title,
    quantity: rr.orderItem.quantity,
    unitPrice: rr.orderItem.price,
    reason: rr.reason,
    customerNameMasked: maskName(rr.order.fullName),
    city: rr.order.city || "",
    state: rr.order.state || "",
    pincodeMasked: maskPincode(rr.order.pincode),
    pickupCourier: rr.pickupCourier || "",
    pickupTrackingNumber: rr.pickupTrackingNumber || "",
    requestedAt: formatIsoDateTime(rr.requestedAt),
    approvedAt: rr.approvedAt ? formatIsoDateTime(rr.approvedAt) : "",
    rejectedAt: rr.rejectedAt ? formatIsoDateTime(rr.rejectedAt) : "",
    pickedAt: rr.pickedAt ? formatIsoDateTime(rr.pickedAt) : "",
    refundedAt: rr.refundedAt ? formatIsoDateTime(rr.refundedAt) : "",
    updatedAt: formatIsoDateTime(rr.updatedAt),
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_VendorReturns_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
