import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import OrdersClient from "./OrdersClient";

export default async function AdminOrdersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { lang } = await params;

  const rowsRaw = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      total: true,
      city: true,
      state: true,
      createdAt: true,
      user: { select: { id: true, email: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  const rows = rowsRaw.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
  }));

  return <OrdersClient lang={lang} initialOrders={rows} />;
}
