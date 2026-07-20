import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { z } from "zod";
import { UserTicketStatus } from "@prisma/client";
import { formatDbError } from "@/lib/dbError";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = z
    .object({
      status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
      take: z.coerce.number().int().min(1).max(200).optional(),
    })
    .safeParse({
      status: (url.searchParams.get("status") ?? undefined) as UserTicketStatus | undefined,
      take: url.searchParams.get("take") ?? undefined,
    });

  if (!parsed.success) return jsonError("Invalid query", 400);

  const take = parsed.data.take ?? 50;

  try {
    const tickets = await prisma.userTicket.findMany({
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
        priority: true,
        orderId: true,
        returnRequestId: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });

    const ticketIds = tickets.map((t) => t.id);
    const userIds = [...new Set(tickets.map((t) => t.userId))];

    const usersById = new Map<
      string,
      { id: string; email: string; name: string | null; phone: string | null }
    >();
    if (userIds.length) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true, phone: true },
        });
        for (const user of users) usersById.set(user.id, user);
      } catch (error) {
        console.warn("[api/admin/user-tickets] user lookup failed:", formatDbError(error));
      }
    }

    const latestByTicket = new Map<
      string,
      { message: string; senderRole: string; createdAt: string }
    >();
    if (ticketIds.length) {
      try {
        const messages = await prisma.userTicketMessage.findMany({
          where: { ticketId: { in: ticketIds } },
          orderBy: { createdAt: "desc" },
          select: {
            ticketId: true,
            message: true,
            senderRole: true,
            createdAt: true,
          },
        });
        for (const message of messages) {
          if (!latestByTicket.has(message.ticketId)) {
            latestByTicket.set(message.ticketId, {
              message: message.message,
              senderRole: message.senderRole,
              createdAt: message.createdAt.toISOString(),
            });
          }
        }
      } catch (error) {
        console.warn("[api/admin/user-tickets] message lookup failed:", formatDbError(error));
      }
    }

    return jsonOk({
      tickets: tickets.map((t) => ({
        id: t.id,
        category: t.category,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        orderId: t.orderId,
        returnRequestId: t.returnRequestId,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        user: usersById.get(t.userId) ?? {
          id: t.userId,
          email: "Unknown user",
          name: null,
          phone: null,
        },
        messages: latestByTicket.has(t.id) ? [latestByTicket.get(t.id)!] : [],
      })),
    });
  } catch (error) {
    console.error("[api/admin/user-tickets] GET failed:", error);
    return jsonError(`Failed to load user tickets: ${formatDbError(error)}`, 500);
  }
}
