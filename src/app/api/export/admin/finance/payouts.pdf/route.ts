import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
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
    take: 2000,
    select: {
      id: true,
      status: true,
      amountPaise: true,
      commissionPaise: true,
      createdAt: true,
      settledAt: true,
      vendor: { select: { shopName: true } },
      vendorOrder: { select: { orderId: true } },
    },
  });

  const typed = payouts as Array<
    {
      amountPaise: bigint;
      commissionPaise: bigint;
      createdAt: Date;
      settledAt: Date | null;
      vendor: { shopName: string };
      vendorOrder: { orderId: string };
    } & Record<string, unknown>
  >;

  const rows = typed.map((p) => ({
    payoutId: String(p.id ?? ""),
    orderId: p.vendorOrder.orderId,
    vendor: p.vendor.shopName,
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
          { key: "vendor", label: "Vendor", width: 120 },
          { key: "status", label: "Status", width: 60 },
          { key: "amount", label: "Amount", width: 70, align: "right" },
          { key: "commission", label: "Comm", width: 60, align: "right" },
          { key: "createdAt", label: "Created (ISO)", width: 140 },
        ],
        rows,
        { rowHeight: 20 }
      );
    },
    { title: "Bohosaaz — Admin Payouts Export", subtitle: "" }
  );

  const filename = `Bohosaaz_Admin_Payouts_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
