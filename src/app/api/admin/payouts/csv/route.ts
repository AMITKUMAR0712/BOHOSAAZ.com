import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const items = await prisma.orderItem.findMany({
    where: {
      status: "DELIVERED",
      order: { status: { not: "PENDING" } },
    },
    include: { product: { include: { vendor: true } } },
  });

  type PayoutAgg = {
    vendorId: string;
    shopName: string;
    gross: number;
    items: number;
  };

  const map: Record<string, PayoutAgg> = {};
  for (const it of items) {
    const v = it.product.vendor;
    if (!v) continue;

    if (!map[v.id]) {
      map[v.id] = {
        vendorId: v.id,
        shopName: v.shopName,
        gross: 0,
        items: 0,
      };
    }
    map[v.id].gross += it.price * it.quantity;
    map[v.id].items += 1;
  }

  const rows = Object.values(map).map((x) => ({ ...x, net: +x.gross.toFixed(2) }));

  const csv = toCsv(rows as Array<Record<string, unknown>>);
  return csvResponse("payouts.csv", csv);
}
