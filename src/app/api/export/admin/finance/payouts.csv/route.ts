import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { buildCreatedAtRange, formatInrPaise, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { PayoutStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);
  const status = (url.searchParams.get("status") || "").trim();

  const where: Prisma.PayoutWhereInput = {
    ...(range ? { createdAt: range } : {}),
  };
  if (status && status !== "ALL") {
    if ((Object.values(PayoutStatus) as string[]).includes(status)) {
      where.status = status as PayoutStatus;
    }
  }

  const db = prisma as unknown as {
    payout: { findMany(args: unknown): Promise<unknown[]> };
  };

  const payouts = await db.payout.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      vendorId: true,
      vendorOrderId: true,
      status: true,
      amountPaise: true,
      commissionPaise: true,
      createdAt: true,
      settledAt: true,
      vendor: { select: { shopName: true } },
      vendorOrder: { select: { orderId: true, status: true } },
    },
  });

  const typed = payouts as Array<
    {
      amountPaise: bigint;
      commissionPaise: bigint;
      createdAt: Date;
      settledAt: Date | null;
      vendor: { shopName: string };
      vendorOrder: { orderId: string; status: string };
    } & Record<string, unknown>
  >;

  const headers = [
    "payoutId",
    "vendorId",
    "vendorShopName",
    "vendorOrderId",
    "orderId",
    "vendorOrderStatus",
    "payoutStatus",
    "amount",
    "commission",
    "createdAt",
    "settledAt",
  ];

  const rows = typed.map((p) => ({
    payoutId: String(p.id ?? ""),
    vendorId: String(p.vendorId ?? ""),
    vendorShopName: p.vendor.shopName,
    vendorOrderId: String(p.vendorOrderId ?? ""),
    orderId: p.vendorOrder.orderId,
    vendorOrderStatus: p.vendorOrder.status,
    payoutStatus: String(p.status ?? ""),
    amount: formatInrPaise(p.amountPaise),
    commission: formatInrPaise(p.commissionPaise),
    createdAt: formatIsoDateTime(p.createdAt),
    settledAt: p.settledAt ? formatIsoDateTime(p.settledAt) : "",
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Admin_Payouts_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
