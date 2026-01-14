import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
import { buildCreatedAtRange, formatInrRupees, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { OrderStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);
  const status = (url.searchParams.get("status") || "").trim();
  const q = (url.searchParams.get("q") || "").trim();

  const where: Prisma.OrderWhereInput = {
    ...(range ? { createdAt: range } : {}),
  };

  if (status && status !== "ALL") {
    if ((Object.values(OrderStatus) as string[]).includes(status)) {
      where.status = status as OrderStatus;
    }
  }
  if (q) {
    where.OR = [
      { id: { contains: q } },
      { user: { email: { contains: q } } },
      { user: { name: { contains: q } } },
    ];
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
      user: { select: { email: true } },
      _count: { select: { items: true } },
    },
  });

  const rows = orders.map((o) => ({
    orderId: o.id,
    createdAt: formatIsoDateTime(o.createdAt),
    status: o.status,
    pay: o.paymentMethod,
    items: o._count.items,
    userEmail: o.user.email,
    total: formatInrRupees(o.total),
  }));

  const subtitleParts: string[] = [];
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (from) subtitleParts.push(`from ${from}`);
  if (to) subtitleParts.push(`to ${to}`);
  if (status) subtitleParts.push(`status ${status}`);
  if (q) subtitleParts.push(`q ${q}`);

  const pdf = await buildPdfBuffer(
    (doc) => {
      renderTable(
        doc,
        [
          { key: "orderId", label: "Order", width: 140 },
          { key: "createdAt", label: "Created (ISO)", width: 150 },
          { key: "status", label: "Status", width: 70 },
          { key: "pay", label: "Pay", width: 40 },
          { key: "items", label: "Items", width: 40, align: "right" },
          { key: "userEmail", label: "User", width: 120 },
          { key: "total", label: "Total", width: 60, align: "right" },
        ],
        rows,
        { rowHeight: 20 }
      );
    },
    {
      title: "Bohosaaz — Admin Orders Export",
      subtitle: subtitleParts.join(" • "),
    }
  );

  const filename = `Bohosaaz_Admin_Orders_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
