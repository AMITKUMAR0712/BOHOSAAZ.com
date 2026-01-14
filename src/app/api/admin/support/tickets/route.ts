import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { SupportTicketStatus } from "@prisma/client";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = z
    .object({
      status: z
        .enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
        .optional(),
      take: z.coerce.number().int().min(1).max(100).optional(),
    })
    .safeParse({
      status: (url.searchParams.get("status") ?? undefined) as
        | SupportTicketStatus
        | undefined,
      take: url.searchParams.get("take") ?? undefined,
    });

  if (!parsed.success) return jsonError("Invalid query", 400);

  const take = parsed.data.take ?? 50;

  const tickets = await prisma.supportTicket.findMany({
    where: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      category: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      vendor: { select: { id: true, shopName: true, status: true } },
      creator: { select: { id: true, email: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { message: true, senderRole: true, createdAt: true, isInternal: true },
      },
    },
  });

  return jsonOk({ tickets });
}
