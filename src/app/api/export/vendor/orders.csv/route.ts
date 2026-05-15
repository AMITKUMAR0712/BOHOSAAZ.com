import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
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
    take: 5000,
    select: {
      id: true,
      orderId: true,
      status: true,
      quantity: true,
      price: true,
      trackingCourier: true,
      trackingNumber: true,
      createdAt: true,
      order: { select: { createdAt: true, status: true } },
      product: { select: { title: true, sku: true, slug: true } },
    },
  });

  const headers = [
    "orderId",
    "orderStatus",
    "orderCreatedAt",
    "itemId",
    "itemStatus",
    "productTitle",
    "productSku",
    "quantity",
    "unitPrice",
    "lineTotal",
    "trackingCourier",
    "trackingNumber",
  ];

  const rows = items.map((it) => ({
    orderId: it.orderId,
    orderStatus: it.order.status,
    orderCreatedAt: formatIsoDateTime(it.order.createdAt),
    itemId: it.id,
    itemStatus: it.status,
    productTitle: it.product.title,
    productSku: it.product.sku || "",
    quantity: it.quantity,
    unitPrice: formatInrRupees(it.price),
    lineTotal: formatInrRupees(it.price * it.quantity),
    trackingCourier: it.trackingCourier || "",
    trackingNumber: it.trackingNumber || "",
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_VendorOrders_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
