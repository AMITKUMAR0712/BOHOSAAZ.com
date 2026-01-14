import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
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
    take: 5000,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      paymentMethod: true,
      subtotal: true,
      couponCode: true,
      couponDiscount: true,
      total: true,
      fullName: true,
      phone: true,
      city: true,
      state: true,
      pincode: true,
      user: { select: { id: true, email: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  const headers = [
    "orderId",
    "createdAt",
    "updatedAt",
    "status",
    "paymentMethod",
    "itemsCount",
    "subtotal",
    "couponCode",
    "couponDiscount",
    "total",
    "userId",
    "userEmail",
    "userName",
    "shipFullName",
    "shipPhone",
    "shipCity",
    "shipState",
    "shipPincode",
  ];

  const rows = orders.map((o) => ({
    orderId: o.id,
    createdAt: formatIsoDateTime(o.createdAt),
    updatedAt: formatIsoDateTime(o.updatedAt),
    status: o.status,
    paymentMethod: o.paymentMethod,
    itemsCount: o._count.items,
    subtotal: formatInrRupees(o.subtotal),
    couponCode: o.couponCode || "",
    couponDiscount: formatInrRupees(o.couponDiscount),
    total: formatInrRupees(o.total),
    userId: o.user.id,
    userEmail: o.user.email,
    userName: o.user.name || "",
    shipFullName: o.fullName || "",
    shipPhone: o.phone || "",
    shipCity: o.city || "",
    shipState: o.state || "",
    shipPincode: o.pincode || "",
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Admin_Orders_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
