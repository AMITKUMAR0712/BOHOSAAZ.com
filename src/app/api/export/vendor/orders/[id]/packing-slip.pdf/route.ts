import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
import { formatInrRupees, formatIsoDateTime } from "@/lib/export/format";

function maskName(name: string | null | undefined) {
  const n = String(name || "").trim();
  if (!n) return "-";
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  if (!first) return "-";
  return first.length <= 1 ? "*" : first[0] + "*".repeat(Math.min(6, first.length - 1));
}

function maskPincode(pincode: string | null | undefined) {
  const p = String(pincode || "").trim();
  if (!p) return "-";
  if (p.length <= 2) return "**";
  return "*".repeat(p.length - 2) + p.slice(-2);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireApprovedVendor();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const vendorId = me.vendor?.id;
  if (!vendorId) return new Response("Vendor not found", { status: 404 });

  const { id } = await ctx.params;

  const order = await prisma.order.findFirst({
    where: { id, status: { not: "PENDING" } },
    select: {
      id: true,
      createdAt: true,
      status: true,
      city: true,
      state: true,
      pincode: true,
      fullName: true,
      items: {
        where: { product: { vendorId } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          quantity: true,
          price: true,
          status: true,
          product: { select: { title: true, sku: true } },
        },
      },
    },
  });

  if (!order || !order.items.length) return new Response("Not found", { status: 404 });

  const items = order.items.map((it) => ({
    product: it.product.title,
    sku: it.product.sku || "",
    qty: it.quantity,
    unitPrice: formatInrRupees(it.price),
    total: formatInrRupees(it.price * it.quantity),
    status: it.status,
  }));

  const pdf = await buildPdfBuffer(
    (doc) => {
      doc.fontSize(12).text(`Packing Slip — Order #${order.id}`);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("gray").text(`Placed: ${formatIsoDateTime(order.createdAt)} • Status: ${order.status}`);
      doc.fillColor("black");
      doc.moveDown(0.8);

      doc.fontSize(10).font("Helvetica-Bold").text("Ship To (masked)");
      doc.font("Helvetica");
      doc.text(
        [
          `Name: ${maskName(order.fullName)}`,
          `City/State: ${(order.city || "-") + (order.state ? ", " + order.state : "")}`,
          `Pincode: ${maskPincode(order.pincode)}`,
        ].join("\n")
      );
      doc.moveDown(0.8);

      doc.fontSize(10).font("Helvetica-Bold").text("Items (your products)");
      doc.font("Helvetica");
      doc.moveDown(0.4);

      renderTable(
        doc,
        [
          { key: "product", label: "Product", width: 250 },
          { key: "sku", label: "SKU", width: 70 },
          { key: "qty", label: "Qty", width: 40, align: "right" },
          { key: "unitPrice", label: "Price", width: 70, align: "right" },
          { key: "total", label: "Total", width: 70, align: "right" },
          { key: "status", label: "Status", width: 60 },
        ],
        items,
        { rowHeight: 20 }
      );
    },
    { title: "Bohosaaz", subtitle: me.vendor?.shopName || "" }
  );

  const filename = `Bohosaaz_Order_${order.id}_PackingSlip.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
