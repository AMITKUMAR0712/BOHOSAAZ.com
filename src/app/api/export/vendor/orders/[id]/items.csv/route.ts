import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { formatInrRupees, formatIsoDateTime } from "@/lib/export/format";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireApprovedVendor();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const vendorId = me.vendor?.id;
  if (!vendorId) return new Response("Vendor not found", { status: 404 });

  const { id } = await ctx.params;

  const items = await prisma.orderItem.findMany({
    where: {
      orderId: id,
      product: { vendorId },
      order: { status: { not: "PENDING" } },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      quantity: true,
      price: true,
      trackingCourier: true,
      trackingNumber: true,
      createdAt: true,
      product: { select: { title: true, sku: true } },
      order: { select: { createdAt: true, status: true } },
    },
  });

  if (!items.length) return new Response("Not found", { status: 404 });

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
    "itemCreatedAt",
  ];

  const rows = items.map((it) => ({
    orderId: id,
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
    itemCreatedAt: formatIsoDateTime(it.createdAt),
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Order_${id}_VendorItems.csv`;
  return csvDownloadResponse(filename, csv);
}
