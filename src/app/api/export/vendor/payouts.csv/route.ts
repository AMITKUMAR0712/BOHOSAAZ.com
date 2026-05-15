import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { buildCreatedAtRange, formatInrPaise, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";

export async function GET(req: Request) {
  const me = await requireApprovedVendor();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const vendorId = me.vendor?.id;
  if (!vendorId) return new Response("Vendor not found", { status: 404 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);

  const db = prisma as unknown as {
    payout: { findMany(args: unknown): Promise<unknown[]> };
  };

  const payouts = await db.payout.findMany({
    where: { vendorId, ...(range ? { createdAt: range } : {}) },
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      vendorOrderId: true,
      status: true,
      amountPaise: true,
      commissionPaise: true,
      createdAt: true,
      settledAt: true,
      vendorOrder: { select: { orderId: true, status: true } },
    },
  });

  const typed = payouts as Array<
    {
      amountPaise: bigint;
      commissionPaise: bigint;
      createdAt: Date;
      settledAt: Date | null;
      vendorOrder: { orderId: string; status: string };
    } & Record<string, unknown>
  >;

  const headers = [
    "payoutId",
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
  const filename = `Bohosaaz_Payouts_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
