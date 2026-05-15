import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
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
        },
        orderBy: { createdAt: "asc" },
      },
      coupon: { select: { code: true } },
    },
  });

  if (!order) return new Response("Not found", { status: 404 });

  const lineRows = order.items.map((it) => ({
    itemId: it.id,
    product: it.product.title,
    qty: it.quantity,
    price: formatInrRupees(it.price),
    lineTotal: formatInrRupees(it.price * it.quantity),
    status: it.status,
  }));

  const pdf = await buildPdfBuffer(
    (doc) => {
      doc.fontSize(12).text(`Invoice for Order #${order.id}`);
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor("gray").text(`Placed: ${formatIsoDateTime(order.createdAt)}`);
      doc.fillColor("black");
      doc.moveDown(0.8);

      doc.fontSize(10).font("Helvetica-Bold").text("Shipping");
      doc.font("Helvetica");
      const addr = [
        order.fullName,
        order.phone,
        [order.address1, order.address2].filter(Boolean).join(", "),
        [order.city, order.state, order.pincode].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join("\n");
      doc.fontSize(10).text(addr || "-");
      doc.moveDown(0.8);

      doc.fontSize(10).font("Helvetica-Bold").text("Items");
      doc.font("Helvetica");
      doc.moveDown(0.4);
      renderTable(
        doc,
        [
          { key: "product", label: "Product", width: 240 },
          { key: "qty", label: "Qty", width: 40, align: "right" },
          { key: "price", label: "Price", width: 80, align: "right" },
          { key: "lineTotal", label: "Total", width: 80, align: "right" },
          { key: "status", label: "Status", width: 70 },
        ],
        lineRows
      );

      doc.moveDown(0.8);
      doc.fontSize(10).font("Helvetica-Bold").text("Totals", { continued: false });
      doc.font("Helvetica");
      const totals = [
        `Subtotal: ${formatInrRupees(order.subtotal)}`,
        order.couponCode || order.coupon?.code ? `Coupon: ${order.couponCode || order.coupon?.code}` : "",
        order.couponDiscount ? `Discount: ${formatInrRupees(order.couponDiscount)}` : "",
        `Total: ${formatInrRupees(order.total)}`,
        `Status: ${order.status}`,
      ].filter(Boolean);
      doc.text(totals.join("\n"));
    },
    { title: "Bohosaaz", subtitle: `Order ${order.id}` }
  );

  const filename = `Bohosaaz_Order_${order.id}_Invoice.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
