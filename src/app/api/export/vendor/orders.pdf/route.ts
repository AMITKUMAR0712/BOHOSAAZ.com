import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
import { buildCreatedAtRange, formatInrRupees, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { OrderItemStatus, OrderStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const me = await requireApprovedVendor();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const vendorId = me.vendor?.id;
  if (!vendorId) return new Response("Vendor not found", { status: 404 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);
  const status = (url.searchParams.get("status") || "").trim();

  const where: Prisma.OrderItemWhereInput = {
    product: { vendorId },
    order: {
      status: { not: "PENDING" },
      ...(range ? { createdAt: range } : {}),
    },
  };

  if (status && status !== "ALL") {
    if ((Object.values(OrderStatus) as string[]).includes(status)) {
      where.order = { ...(where.order as Prisma.OrderWhereInput), status: status as OrderStatus };
    } else if ((Object.values(OrderItemStatus) as string[]).includes(status)) {
      where.status = status as OrderItemStatus;
    }
  }

  const items = await prisma.orderItem.findMany({
    where,
    orderBy: [{ order: { createdAt: "desc" } }, { createdAt: "desc" }],
    take: 2000,
    select: {
      orderId: true,
      status: true,
      quantity: true,
      price: true,
      trackingCourier: true,
      trackingNumber: true,
      order: { select: { createdAt: true, status: true } },
      product: { select: { title: true } },
    },
  });

  const rows = items.map((it) => ({
    orderId: it.orderId,
    createdAt: formatIsoDateTime(it.order.createdAt),
    orderStatus: it.order.status,
    product: it.product.title,
    qty: it.quantity,
    lineTotal: formatInrRupees(it.price * it.quantity),
    itemStatus: it.status,
    tracking: [it.trackingCourier, it.trackingNumber].filter(Boolean).join(" • "),
  }));

  const pdf = await buildPdfBuffer(
    (doc) => {
      renderTable(
        doc,
        [
          { key: "orderId", label: "Order", width: 130 },
          { key: "createdAt", label: "Created (ISO)", width: 140 },
          { key: "orderStatus", label: "Order St", width: 60 },
          { key: "product", label: "Product", width: 170 },
          { key: "qty", label: "Qty", width: 30, align: "right" },
          { key: "lineTotal", label: "Total", width: 60, align: "right" },
          { key: "itemStatus", label: "Item St", width: 50 },
          { key: "tracking", label: "Tracking", width: 60 },
        ],
        rows,
        { rowHeight: 20 }
      );
    },
    { title: "Bohosaaz — Vendor Orders Export", subtitle: me.vendor?.shopName || "" }
  );

  const filename = `Bohosaaz_VendorOrders_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
