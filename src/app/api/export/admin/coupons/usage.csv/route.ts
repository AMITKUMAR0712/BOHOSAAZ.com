import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { buildCreatedAtRange, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);
  const code = (url.searchParams.get("code") || "").trim();

  const where: Prisma.CouponRedemptionWhereInput = {
    ...(range ? { createdAt: range } : {}),
    ...(code ? { coupon: { code } } : {}),
  };

  const redemptions = await prisma.couponRedemption.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      createdAt: true,
      amountDiscounted: true,
      email: true,
      orderId: true,
      userId: true,
      coupon: { select: { code: true, type: true, value: true } },
      user: { select: { email: true } },
    },
  });

  const headers = [
    "redemptionId",
    "createdAt",
    "couponCode",
    "couponType",
    "couponValue",
    "amountDiscounted",
    "orderId",
    "userId",
    "userEmail",
    "email",
  ];

  const rows = redemptions.map((r) => ({
    redemptionId: r.id,
    createdAt: formatIsoDateTime(r.createdAt),
    couponCode: r.coupon.code,
    couponType: r.coupon.type,
    couponValue: r.coupon.value,
    amountDiscounted: r.amountDiscounted,
    orderId: r.orderId || "",
    userId: r.userId || "",
    userEmail: r.user?.email || "",
    email: r.email || "",
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Admin_CouponUsage_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
