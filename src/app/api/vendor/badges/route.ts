import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";

export async function GET() {
  const user = await requireApprovedVendor();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendorId = user.vendor?.id;
  if (!vendorId) return NextResponse.json({ pendingPayouts: 0 });

  const pendingPayouts = await prisma.payout.count({
    where: { vendorId, status: { in: ["PENDING", "HELD"] } },
  });

  return NextResponse.json({ pendingPayouts });
}
