import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { OrderStatus, type Prisma } from "@prisma/client";

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
      updatedAt: true,
      user: { select: { id: true, email: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  let nextCursor: string | null = null;
  let orders = rows;
  if (rows.length > take) {
    const next = rows.pop();
    nextCursor = next?.id || null;
    orders = rows;
  }

  return jsonOk({ orders, nextCursor });
}
