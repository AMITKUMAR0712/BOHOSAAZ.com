import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { OrderStatus, type Prisma } from "@prisma/client";
import { formatDbError } from "@/lib/dbError";

const demoOrderWhere: Prisma.OrderWhereInput = {
  OR: [
    { address1: { contains: "Seed Street" } },
    { address2: { contains: "Seed Market" } },
    { user: { email: { endsWith: "@bohosaaz.test" } } },
  ],
};

function isDemoOrder(order: {
  address1: string | null;
  address2?: string | null;
  user: { email: string } | null;
}) {
  const addr1 = (order.address1 || "").toLowerCase();
  const addr2 = (order.address2 || "").toLowerCase();
  const email = (order.user?.email || "").toLowerCase();
  return (
    addr1.includes("seed street") ||
    addr2.includes("seed market") ||
    email.endsWith("@bohosaaz.test")
  );
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);

  const pageRaw = Number(searchParams.get("page") || 1);
  const pageSizeRaw = Number(searchParams.get("pageSize") || searchParams.get("take") || 10);
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(Math.floor(pageSizeRaw), 1), 100) : 10;

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
    const total = await prisma.order.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * pageSize;

    const orders = await prisma.order.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        total: true,
        city: true,
        state: true,
        address1: true,
        address2: true,
        createdAt: true,
        userId: true,
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { items: true } },
      },
    });

    return jsonOk({
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        total: Number(order.total ?? 0),
        city: order.city,
        state: order.state,
        createdAt: order.createdAt.toISOString(),
        isDemo: isDemoOrder(order),
        user: order.user ?? {
          id: order.userId,
          email: "Unknown user",
          name: null,
        },
        _count: { items: order._count.items },
      })),
      page: safePage,
      pageSize,
      total,
      totalPages,
    });
  } catch (error) {
    console.error("[api/admin/orders] GET failed:", error);
    return jsonError(`Failed to load orders: ${formatDbError(error)}`, 500);
  }
}

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1).max(200),
});

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") || "").trim();
  const id = (url.searchParams.get("id") || "").trim();

  try {
    // Permanent delete of all seeded / demo marketplace orders.
    if (scope === "demo") {
      const result = await prisma.order.deleteMany({ where: demoOrderWhere });
      return jsonOk({ deleted: true, scope: "demo", count: result.count });
    }

    // Bulk permanent delete by ids (JSON body).
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      const parsed = bulkDeleteSchema.safeParse(body);
      if (parsed.success) {
        const ids = [...new Set(parsed.data.ids)];
        const result = await prisma.order.deleteMany({
          where: { id: { in: ids } },
        });
        return jsonOk({ deleted: true, count: result.count, ids });
      }
    }

    if (!id) return jsonError("Missing order id", 400);

    await prisma.order.delete({ where: { id } });
    return jsonOk({ deleted: true, id, count: 1 });
  } catch (error) {
    console.error("[api/admin/orders] DELETE failed:", error);
    return jsonError(`Failed to delete order: ${formatDbError(error)}`, 500);
  }
}
