import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") || 30);

  const from = new Date();
  from.setDate(from.getDate() - days);

  const rows = await prisma.vendorOrder.findMany({
    where: {
      createdAt: { gte: from },
      status: { in: ["DELIVERED", "SETTLED"] },
    },
    include: {
      vendor: { select: { id: true, shopName: true } },
    },
  });

  const gmv = rows.reduce((s, r) => s + r.subtotal, 0);
  const commission = rows.reduce((s, r) => s + r.commission, 0);
  const payout = rows.reduce((s, r) => s + r.payout, 0);

  type VendorAgg = {
    vendorId: string;
    shopName: string;
    orders: number;
    gmv: number;
    commission: number;
    payout: number;
  };

  const vendorMap: Record<string, VendorAgg> = {};
  for (const r of rows) {
    if (!vendorMap[r.vendorId]) {
      vendorMap[r.vendorId] = {
        vendorId: r.vendorId,
        shopName: r.vendor.shopName,
        orders: 0,
        gmv: 0,
        commission: 0,
        payout: 0,
      };
    }
    vendorMap[r.vendorId].orders += 1;
    vendorMap[r.vendorId].gmv += r.subtotal;
    vendorMap[r.vendorId].commission += r.commission;
    vendorMap[r.vendorId].payout += r.payout;
  }

  const leaderboard = Object.values(vendorMap).sort((a, b) => b.gmv - a.gmv);

  return jsonOk({
    summary: { gmv, commission, payout, orders: rows.length },
    leaderboard,
  });
}
