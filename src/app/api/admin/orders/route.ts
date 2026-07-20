import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { OrderStatus, type Prisma } from "@prisma/client";
import { formatDbError } from "@/lib/dbError";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const takeRaw = Number(searchParams.get("take") || 50);
  const take = Number.isFinite(takeRaw) ? Math.min(Math.max(takeRaw, 1), 100) : 50;

  const cursor = searchParams.get("cursor") || undefined;
  const q = (searchParams.get("q") || "").trim();
  const status = (searchParams.get("status") || "").trim();

  const where: Prisma.OrderWhereInput = {};

  if (status && status !== "ALL") {
    if ((Object.values(OrderStatus) as string[]).includes(status)) {
      where.status = status as OrderStatus;
    }
  }

  if (q) {
    where.OR = [
      { id: { contains: q } },
      { user: { email: { contains: q } } },
      { user: { name: { contains: q } } },
    ];
  }

  try {
    const rows = await prisma.order.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        total: true,
        city: true,
        state: true,
        createdAt: true,
        userId: true,
      },
    });

    let nextCursor: string | null = null;
    let orders = rows;
    if (rows.length > take) {
      const next = rows.pop();
      nextCursor = next?.id || null;
      orders = rows;
    }

    const orderIds = orders.map((o) => o.id);
    const userIds = [...new Set(orders.map((o) => o.userId).filter(Boolean))];

    const usersById = new Map<string, { id: string; email: string; name: string | null }>();
    if (userIds.length) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        });
        for (const user of users) usersById.set(user.id, user);
      } catch (error) {
        console.warn("[api/admin/orders] user lookup failed:", formatDbError(error));
      }
    }

    const itemCounts = new Map<string, number>();
    if (orderIds.length) {
      try {
        const grouped = await prisma.orderItem.groupBy({
          by: ["orderId"],
          where: { orderId: { in: orderIds } },
          _count: { _all: true },
        });
        for (const row of grouped) itemCounts.set(row.orderId, row._count._all);
      } catch (error) {
        console.warn("[api/admin/orders] item count failed:", formatDbError(error));
      }
    }

    return jsonOk({
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        total: Number(order.total ?? 0),
        city: order.city,
        state: order.state,
        createdAt: order.createdAt.toISOString(),
        user: usersById.get(order.userId) ?? {
          id: order.userId,
          email: "Unknown user",
          name: null,
        },
        _count: { items: itemCounts.get(order.id) ?? 0 },
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("[api/admin/orders] GET failed:", error);
    return jsonError(`Failed to load orders: ${formatDbError(error)}`, 500);
  }
}
