import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

const querySchema = z.object({
  take: z.coerce.number().int().min(5).max(100).default(50),
  cursor: z.string().trim().optional(),
});

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    take: url.searchParams.get("take") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) return jsonError("Invalid query", 400);

  const { take, cursor } = parsed.data;

  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    select: {
      id: true,
      actorId: true,
      actorRole: true,
      action: true,
      entity: true,
      entityId: true,
      meta: true,
      ip: true,
      userAgent: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > take;
  const items = (hasMore ? rows.slice(0, take) : rows).map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  return jsonOk({ logs: items, nextCursor });
}
