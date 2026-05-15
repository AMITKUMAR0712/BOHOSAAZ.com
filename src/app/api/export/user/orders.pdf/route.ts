import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
import { buildCreatedAtRange, formatInrRupees, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { OrderStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const me = await requireUser();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);
  const status = (url.searchParams.get("status") || "").trim();

  const where: Prisma.OrderWhereInput = {
    userId: me.id,
    status: { not: "PENDING" },
    ...(range ? { createdAt: range } : {}),
  };
  if (status && status !== "ALL") {
    if ((Object.values(OrderStatus) as string[]).includes(status)) {
      where.status = status as OrderStatus;
    }
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      id: true,
      createdAt: true,
      status: true,
      paymentMethod: true,
      total: true,
    },
  });

  const rows = orders.map((o) => ({
    orderId: o.id,
    createdAt: formatIsoDateTime(o.createdAt),
    status: o.status,
    paymentMethod: o.paymentMethod,
    total: formatInrRupees(o.total),
  }));

  const subtitleParts: string[] = [];
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (from) subtitleParts.push(`from ${from}`);
  if (to) subtitleParts.push(`to ${to}`);
  if (status) subtitleParts.push(`status ${status}`);

  const pdf = await buildPdfBuffer(
    (doc) => {
      renderTable(
        doc,
        [
          { key: "orderId", label: "Order", width: 190 },
          { key: "createdAt", label: "Created At (ISO)", width: 170 },
          { key: "status", label: "Status", width: 80 },
          { key: "paymentMethod", label: "Pay", width: 50 },
          { key: "total", label: "Total", width: 70, align: "right" },
        ],
        rows
      );
    },
    {
      title: "Bohosaaz — Orders Export",
      subtitle: subtitleParts.length ? subtitleParts.join(" • ") : "",
    }
  );

  const filename = `Bohosaaz_Orders_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
