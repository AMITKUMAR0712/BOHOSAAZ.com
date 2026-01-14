import { requireApprovedVendor } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { paiseToRupees } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const me = await requireApprovedVendor();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const vendorId = me.vendor?.id;
  if (!vendorId) return new Response("Vendor not found", { status: 404 });

  const db = prisma as unknown as {
    payout: { findMany(args: unknown): Promise<unknown[]> };
  };

  const payouts = await db.payout.findMany({
    where: { vendorId },
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

  const rows = typed.map((p) => ({
    payoutId: p.id,
    vendorOrderId: p.vendorOrderId,
    orderId: p.vendorOrder.orderId,
    vendorOrderStatus: p.vendorOrder.status,
    payoutStatus: p.status,
    amountRupees: paiseToRupees(p.amountPaise).toFixed(2),
    commissionRupees: paiseToRupees(p.commissionPaise).toFixed(2),
    createdAt: p.createdAt.toISOString(),
    settledAt: p.settledAt ? p.settledAt.toISOString() : "",
  }));

  const csv = toCsv(rows as Array<Record<string, unknown>>);
  return csvResponse("vendor-payouts.csv", csv);
}
