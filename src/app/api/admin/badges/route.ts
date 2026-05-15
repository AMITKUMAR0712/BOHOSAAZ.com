import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [ordersPending, vendorsPending, payoutRequestsPending] = await Promise.all([
    prisma.order.count({
      where: {
        status: { in: ["PENDING", "COD_PENDING", "PLACED"] },
      },
    }),
    prisma.vendor.count({
      where: { status: "PENDING" },
    }),
    prisma.payout.count({
      where: { status: "PENDING" },
    }),
  ]);

  return NextResponse.json({ ordersPending, vendorsPending, payoutRequestsPending });
}
