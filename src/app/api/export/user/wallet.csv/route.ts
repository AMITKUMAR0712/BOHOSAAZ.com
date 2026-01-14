import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { buildCreatedAtRange, formatInrPaise, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { getOrCreateUserWallet } from "@/lib/wallet";

export async function GET(req: Request) {
  const me = await requireUser();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const wallet = await getOrCreateUserWallet(me.id);

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);

  const db = prisma as unknown as {
    walletTransaction: { findMany(args: unknown): Promise<unknown[]> };
  };

  const txns = await db.walletTransaction.findMany({
    where: {
      walletId: wallet.id,
      ...(range ? { createdAt: range } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      type: true,
      direction: true,
      status: true,
      amountPaise: true,
      balanceAfterPaise: true,
      note: true,
      createdAt: true,
      orderId: true,
      vendorOrderId: true,
      payoutId: true,
      razorpayOrderId: true,
      razorpayPaymentId: true,
    },
  });

  const typed = txns as Array<
    {
      amountPaise: bigint;
      balanceAfterPaise: bigint;
      createdAt: Date;
    } & Record<string, unknown>
  >;

  const headers = [
    "txnId",
    "createdAt",
    "type",
    "direction",
    "status",
    "amount",
    "balanceAfter",
    "note",
    "orderId",
    "vendorOrderId",
    "payoutId",
    "razorpayOrderId",
    "razorpayPaymentId",
  ];

  const rows = typed.map((t) => {
    const r = t as Record<string, unknown>;
    return {
      txnId: String(r.id ?? ""),
      createdAt: formatIsoDateTime(t.createdAt),
      type: String(r.type ?? ""),
      direction: String(r.direction ?? ""),
      status: String(r.status ?? ""),
      amount: formatInrPaise(t.amountPaise),
      balanceAfter: formatInrPaise(t.balanceAfterPaise),
      note: typeof r.note === "string" ? r.note : "",
      orderId: typeof r.orderId === "string" ? r.orderId : "",
      vendorOrderId: typeof r.vendorOrderId === "string" ? r.vendorOrderId : "",
      payoutId: typeof r.payoutId === "string" ? r.payoutId : "",
      razorpayOrderId: typeof r.razorpayOrderId === "string" ? r.razorpayOrderId : "",
      razorpayPaymentId: typeof r.razorpayPaymentId === "string" ? r.razorpayPaymentId : "",
    };
  });

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Wallet_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
