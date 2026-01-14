import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
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
    take: 2000,
    select: {
      id: true,
      status: true,
      reason: true,
      orderId: true,
      createdAt: true,
      updatedAt: true,
      orderItem: {
        select: {
          quantity: true,
          price: true,
          product: { select: { title: true } },
        },
      },
    },
  });

  const rows = returns.map((rr) => ({
    returnId: rr.id,
    updatedAt: formatIsoDateTime(rr.updatedAt),
    status: rr.status,
    orderId: rr.orderId,
    product: rr.orderItem.product.title,
    qty: rr.orderItem.quantity,
    reason: rr.reason,
  }));

  const pdf = await buildPdfBuffer(
    (doc) => {
      renderTable(
        doc,
        [
          { key: "returnId", label: "Return", width: 150 },
          { key: "updatedAt", label: "Updated (ISO)", width: 150 },
          { key: "status", label: "Status", width: 70 },
          { key: "orderId", label: "Order", width: 110 },
          { key: "product", label: "Product", width: 160 },
          { key: "qty", label: "Qty", width: 30, align: "right" },
          { key: "reason", label: "Reason", width: 60 },
        ],
        rows,
        { rowHeight: 20 }
      );
    },
    { title: "Bohosaaz — Returns Export", subtitle: "" }
  );

  const filename = `Bohosaaz_Returns_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
