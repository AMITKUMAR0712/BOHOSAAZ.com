import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
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
    take: 2000,
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

  const rows = typed.map((p) => ({
    payoutId: String(p.id ?? ""),
    orderId: p.vendorOrder.orderId,
    status: String(p.status ?? ""),
    amount: formatInrPaise(p.amountPaise),
    commission: formatInrPaise(p.commissionPaise),
    createdAt: formatIsoDateTime(p.createdAt),
    settledAt: p.settledAt ? formatIsoDateTime(p.settledAt) : "",
  }));

  const pdf = await buildPdfBuffer(
    (doc) => {
      renderTable(
        doc,
        [
          { key: "payoutId", label: "Payout", width: 140 },
          { key: "orderId", label: "Order", width: 120 },
          { key: "status", label: "Status", width: 60 },
          { key: "amount", label: "Amount", width: 70, align: "right" },
          { key: "commission", label: "Comm", width: 70, align: "right" },
          { key: "createdAt", label: "Created (ISO)", width: 150 },
          { key: "settledAt", label: "Settled", width: 70 },
        ],
        rows,
        { rowHeight: 20 }
      );
    },
    { title: "Bohosaaz — Payouts Export", subtitle: me.vendor?.shopName || "" }
  );

  const filename = `Bohosaaz_Payouts_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
