import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";

export async function GET() {
  const me = await requireApprovedVendor();
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const vendorId = me.vendor?.id;
  if (!vendorId) return Response.json({ error: "Vendor not found" }, { status: 404 });

  const orders = await prisma.vendorOrder.findMany({
    where: { vendorId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      orderId: true,
      status: true,
      subtotal: true,
      commission: true,
      payout: true,
      payoutRecord: {
        select: {
          id: true,
          status: true,
          amountPaise: true,
          commissionPaise: true,
          createdAt: true,
          updatedAt: true,
          settledAt: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json({
    orders: orders.map((o) => ({
      ...o,
      payoutRecord: o.payoutRecord
        ? {
            ...o.payoutRecord,
            amountPaise: o.payoutRecord.amountPaise.toString(),
            commissionPaise: o.payoutRecord.commissionPaise.toString(),
            createdAt: o.payoutRecord.createdAt.toISOString(),
            updatedAt: o.payoutRecord.updatedAt.toISOString(),
            settledAt: o.payoutRecord.settledAt ? o.payoutRecord.settledAt.toISOString() : null,
          }
        : null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
  });
}
