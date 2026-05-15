import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import CouponsClient from "./CouponsClient";

export default async function AdminCouponsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { lang } = await params;

  const rowsRaw = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      type: true,
      value: true,
      minOrderAmount: true,
      maxDiscountAmount: true,
      startAt: true,
      endAt: true,
      usageLimit: true,
      usedCount: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const rows = rowsRaw.map((c) => ({
    ...c,
    startAt: c.startAt ? c.startAt.toISOString() : null,
    endAt: c.endAt ? c.endAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return <CouponsClient lang={lang} initialCoupons={rows} />;
}
