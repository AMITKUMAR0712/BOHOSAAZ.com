import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { formatInrRupees, formatIsoDateTime } from "@/lib/export/format";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const me = await requireUser();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;

  const order = await prisma.order.findFirst({
    where: { id, userId: me.id, status: { not: "PENDING" } },
    include: {
      items: {
        include: {
          product: { select: { title: true } },
          variant: { select: { sku: true, size: true, color: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) return new Response("Not found", { status: 404 });

  const headers = [
    "orderId",
    "orderCreatedAt",
    "orderStatus",
    "paymentMethod",
    "itemId",
    "productTitle",
    "variantSku",
    "variantSize",
    "variantColor",
    "quantity",
    "unitPrice",
    "lineTotal",
    "itemStatus",
  ];

  const rows = order.items.map((it) => ({
    orderId: order.id,
    orderCreatedAt: formatIsoDateTime(order.createdAt),
    orderStatus: order.status,
    paymentMethod: order.paymentMethod,
    itemId: it.id,
    productTitle: it.product.title,
    variantSku: it.variantSku || it.variant?.sku || "",
    variantSize: it.variantSize || it.variant?.size || "",
    variantColor: it.variantColor || it.variant?.color || "",
    quantity: it.quantity,
    unitPrice: formatInrRupees(it.price),
    lineTotal: formatInrRupees(it.price * it.quantity),
    itemStatus: it.status,
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Order_${order.id}_Summary.csv`;
  return csvDownloadResponse(filename, csv);
}
