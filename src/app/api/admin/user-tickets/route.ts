import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { z } from "zod";
import { UserTicketStatus } from "@prisma/client";

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
      user: { select: { id: true, email: true, name: true, phone: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { message: true, senderRole: true, createdAt: true },
      },
    },
  });

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
      user: t.user
        ? { id: t.user.id, email: t.user.email, name: t.user.name, phone: t.user.phone }
        : { id: "unknown", email: "Unknown user", name: null, phone: null },
      messages: t.messages.map((m) => ({
        message: m.message,
        senderRole: m.senderRole,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
  });
  } catch (error) {
    console.error("[api/admin/user-tickets] GET failed:", error);
    return jsonError("Failed to load user tickets", 500);
  }
}
