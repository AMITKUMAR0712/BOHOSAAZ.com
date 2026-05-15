import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
import { buildCreatedAtRange, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { ReturnRequestStatus, type Prisma } from "@prisma/client";

function maskName(name: string | null | undefined) {
  const n = String(name || "").trim();
  if (!n) return "-";
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  if (!first) return "-";
  return first.length <= 1 ? "*" : first[0] + "*".repeat(Math.min(6, first.length - 1));
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
    take: 2000,
    select: {
      id: true,
      status: true,
      reason: true,
      orderId: true,
      updatedAt: true,
      order: { select: { fullName: true, city: true, state: true } },
      orderItem: { select: { quantity: true, product: { select: { title: true } } } },
    },
  });

  const rows = returns.map((rr) => ({
    returnId: rr.id,
    updatedAt: formatIsoDateTime(rr.updatedAt),
    status: rr.status,
    orderId: rr.orderId,
    customer: maskName(rr.order.fullName),
    city: rr.order.city || "-",
    product: rr.orderItem.product.title,
    qty: rr.orderItem.quantity,
    reason: rr.reason,
  }));

  const pdf = await buildPdfBuffer(
    (doc) => {
      renderTable(
        doc,
        [
          { key: "returnId", label: "Return", width: 130 },
          { key: "updatedAt", label: "Updated (ISO)", width: 140 },
          { key: "status", label: "Status", width: 60 },
          { key: "orderId", label: "Order", width: 110 },
          { key: "customer", label: "Customer", width: 60 },
          { key: "city", label: "City", width: 60 },
          { key: "product", label: "Product", width: 150 },
          { key: "qty", label: "Qty", width: 30, align: "right" },
          { key: "reason", label: "Reason", width: 50 },
        ],
        rows,
        { rowHeight: 20 }
      );
    },
    { title: "Bohosaaz — Vendor Returns Export", subtitle: me.vendor?.shopName || "" }
  );

  const filename = `Bohosaaz_VendorReturns_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
