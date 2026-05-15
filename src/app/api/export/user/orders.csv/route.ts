import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
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
    take: 5000,
    select: {
      id: true,
      createdAt: true,
      status: true,
      paymentMethod: true,
      subtotal: true,
      couponDiscount: true,
      total: true,
      city: true,
      state: true,
    },
  });

  const headers = [
    "orderId",
    "createdAt",
    "status",
    "paymentMethod",
    "subtotal",
    "couponDiscount",
    "total",
    "city",
    "state",
  ];

  const rows = orders.map((o) => ({
    orderId: o.id,
    createdAt: formatIsoDateTime(o.createdAt),
    status: o.status,
    paymentMethod: o.paymentMethod,
    subtotal: formatInrRupees(o.subtotal),
    couponDiscount: formatInrRupees(o.couponDiscount),
    total: formatInrRupees(o.total),
    city: o.city || "",
    state: o.state || "",
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Orders_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
