import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { NextRequest } from "next/server";
import { z } from "zod";

const CreateSchema = z.object({
  category: z.enum(["ORDER", "PAYMENT", "RETURN", "GENERAL"]),
  subject: z.string().min(3).max(120),
  message: z.string().min(1).max(4000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  orderId: z.string().min(1).optional(),
  returnRequestId: z.string().min(1).optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("Unauthorized", 401);

  const tickets = await prisma.userTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
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
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { message: true, senderRole: true, createdAt: true },
      },
    },
  });

  return jsonOk({
    tickets: tickets.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      messages: t.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const { category, subject, message, priority, orderId, returnRequestId } = parsed.data;

  const ticket = await prisma.$transaction(async (tx) => {
    return tx.userTicket.create({
      data: {
        userId: user.id,
        category,
        subject,
        priority: priority ?? "MEDIUM",
        orderId: orderId ?? null,
        returnRequestId: returnRequestId ?? null,
        messages: {
          create: {
            senderId: user.id,
            senderRole: user.role,
            message,
          },
        },
      },
      select: { id: true },
    });
  });

  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "USER_TICKET_CREATE",
    entity: "UserTicket",
    entityId: ticket.id,
    meta: { category },
    ip: req.headers.get("x-forwarded-for") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return jsonOk({ ticketId: ticket.id }, { status: 201 });
}
