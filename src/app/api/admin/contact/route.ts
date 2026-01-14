import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

const querySchema = z.object({
  take: z.coerce.number().int().min(5).max(100).default(50),
  cursor: z.string().trim().optional(),
  status: z.enum(["OPEN", "NEW", "REPLIED", "CLOSED"]).optional(),
});

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    take: url.searchParams.get("take") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) return jsonError("Invalid query", 400);

  const { take, cursor, status } = parsed.data;
  const normalizedStatus = status === "OPEN" ? "NEW" : status;

  const rows = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    where: normalizedStatus ? { status: normalizedStatus } : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      message: true,
      status: true,
      adminReply: true,
      repliedAt: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > take;
  const items = (hasMore ? rows.slice(0, take) : rows).map((r) => ({
    ...r,
    repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  return jsonOk({ messages: items, nextCursor });
}
