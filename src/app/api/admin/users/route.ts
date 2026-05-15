import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);

  const parsed = z
    .object({
      q: z.string().trim().min(1).max(191).optional(),
      role: z.enum(["USER", "VENDOR", "ADMIN"]).optional(),
      blocked: z.enum(["true", "false"]).optional(),
      take: z.coerce.number().int().min(1).max(100).optional(),
      cursor: z.string().trim().min(1).optional(),
    })
    .safeParse({
      q: url.searchParams.get("q") ?? undefined,
      role: (url.searchParams.get("role") ?? undefined) as
        | "USER"
        | "VENDOR"
        | "ADMIN"
        | undefined,
      blocked: (url.searchParams.get("blocked") ?? undefined) as
        | "true"
        | "false"
        | undefined,
      take: url.searchParams.get("take") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });

  if (!parsed.success) return jsonError("Invalid query", 400);

  const take = parsed.data.take ?? 50;
  const blocked =
    parsed.data.blocked === undefined
      ? undefined
      : parsed.data.blocked === "true";

  const where = {
    ...(parsed.data.role ? { role: parsed.data.role } : {}),
    ...(blocked === undefined ? {} : { isBlocked: blocked }),
    ...(parsed.data.q
      ? {
          OR: [
            { email: { contains: parsed.data.q } },
            { name: { contains: parsed.data.q } },
          ],
        }
      : {}),
  } as const;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isBlocked: true,
      blockedReason: true,
      blockedAt: true,
      tokenVersion: true,
      createdAt: true,
      vendor: { select: { id: true, status: true, shopName: true } },
    },
  });

  const nextCursor = users.length > take ? users[take]?.id : null;
  const items = users.slice(0, take);

  return jsonOk({ users: items, nextCursor });
}
