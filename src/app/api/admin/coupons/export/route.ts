import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      code: true,
      type: true,
      value: true,
      minOrderAmount: true,
      maxDiscountAmount: true,
      startAt: true,
      endAt: true,
      usageLimit: true,
      usedCount: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const rows = coupons.map((c) => ({
    code: c.code,
    type: c.type,
    value: c.value,
    minOrderAmount: c.minOrderAmount ?? "",
    maxDiscountAmount: c.maxDiscountAmount ?? "",
    startAt: c.startAt ? c.startAt.toISOString() : "",
    endAt: c.endAt ? c.endAt.toISOString() : "",
    usageLimit: c.usageLimit ?? "",
    usedCount: c.usedCount,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  const csv = toCsv(rows);
  const filename = `coupons_${new Date().toISOString().slice(0, 10)}.csv`;
  return csvResponse(filename, csv);
}
