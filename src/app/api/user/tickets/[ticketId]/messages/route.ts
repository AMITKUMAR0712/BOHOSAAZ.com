import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { NextRequest } from "next/server";
import { z } from "zod";

const CreateMessageSchema = z.object({
  message: z.string().min(1).max(4000),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const user = await requireUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { ticketId } = await params;

  const ticket = await prisma.userTicket.findFirst({
    where: { id: ticketId, userId: user.id },
    select: { id: true },
  });

  if (!ticket) return jsonError("Not found", 404);

  const messages = await prisma.userTicketMessage.findMany({
    where: { ticketId: ticket.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      senderId: true,
      senderRole: true,
      message: true,
      attachments: true,
      createdAt: true,
    },
  });

  return jsonOk({
    messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const user = await requireUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { ticketId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = CreateMessageSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const ticket = await prisma.userTicket.findFirst({
    where: { id: ticketId, userId: user.id },
    select: { id: true, status: true },
  });
  if (!ticket) return jsonError("Not found", 404);
  if (ticket.status === "CLOSED") return jsonError("Ticket is closed", 400);

  const msg = await prisma.$transaction(async (tx) => {
    const created = await tx.userTicketMessage.create({
      data: { ticketId: ticket.id, senderId: user.id, senderRole: user.role, message: parsed.data.message },
      select: { id: true },
    });
    await tx.userTicket.update({
      where: { id: ticket.id },
      data: { status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status },
      select: { id: true },
    });
    return created;
  });

  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "USER_TICKET_MESSAGE_CREATE",
    entity: "UserTicket",
    entityId: ticket.id,
    meta: { messageId: msg.id },
    ip: req.headers.get("x-forwarded-for") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return jsonOk({ messageId: msg.id }, { status: 201 });
}
