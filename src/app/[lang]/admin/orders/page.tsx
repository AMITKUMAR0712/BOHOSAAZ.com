import { prisma } from "@/lib/prisma";
import OrdersClient from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  try {
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
      id: o.id,
      status: o.status,
      total: Number(o.total ?? 0),
      city: o.city,
      state: o.state,
      createdAt: o.createdAt.toISOString(),
      user: o.user
        ? { id: o.user.id, email: o.user.email, name: o.user.name }
        : { id: "unknown", email: "Unknown user", name: null },
      _count: { items: o._count?.items ?? 0 },
    }));

    return <OrdersClient lang={lang} initialOrders={rows} initialError={null} />;
  } catch (error) {
    console.error("[admin/orders] failed to load orders:", error);
    return (
      <OrdersClient
        lang={lang}
        initialOrders={[]}
        initialError="Failed to load orders. Please refresh or contact support."
      />
    );
  }
}
