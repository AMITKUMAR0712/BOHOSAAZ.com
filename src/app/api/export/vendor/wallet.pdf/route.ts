import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
import { buildCreatedAtRange, formatInrPaise, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { getOrCreateVendorWallet } from "@/lib/wallet";

export async function GET(req: Request) {
  const me = await requireApprovedVendor();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const vendorId = me.vendor?.id;
  if (!vendorId) return new Response("Vendor not found", { status: 404 });

  const wallet = await getOrCreateVendorWallet(vendorId);
  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);

  const db = prisma as unknown as {
    walletTransaction: { findMany(args: unknown): Promise<unknown[]> };
  };

  const txns = await db.walletTransaction.findMany({
    where: { walletId: wallet.id, ...(range ? { createdAt: range } : {}) },
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      type: true,
      direction: true,
      status: true,
      amountPaise: true,
      balanceAfterPaise: true,
      note: true,
      createdAt: true,
    },
  });

  const typed = txns as Array<
    {
      amountPaise: bigint;
      balanceAfterPaise: bigint;
      createdAt: Date;
    } & Record<string, unknown>
  >;

  const rows = typed.map((t) => {
    const r = t as Record<string, unknown>;
    return {
      createdAt: formatIsoDateTime(t.createdAt),
      type: String(r.type ?? ""),
      direction: String(r.direction ?? ""),
      amount: formatInrPaise(t.amountPaise),
      balanceAfter: formatInrPaise(t.balanceAfterPaise),
      status: String(r.status ?? ""),
      note: typeof r.note === "string" ? r.note : "",
    };
  });

  const pdf = await buildPdfBuffer(
    (doc) => {
      renderTable(
        doc,
        [
          { key: "createdAt", label: "Created (ISO)", width: 160 },
          { key: "type", label: "Type", width: 80 },
          { key: "direction", label: "Dir", width: 40 },
          { key: "amount", label: "Amount", width: 70, align: "right" },
          { key: "balanceAfter", label: "Balance", width: 70, align: "right" },
          { key: "status", label: "Status", width: 60 },
          { key: "note", label: "Note", width: 90 },
        ],
        rows,
        { rowHeight: 20 }
      );
    },
    { title: "Bohosaaz — Vendor Wallet Export", subtitle: me.vendor?.shopName || "" }
  );

  const filename = `Bohosaaz_VendorWallet_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
