import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

const CreateSchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ticketId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { ticketId } = await ctx.params;
  if (!ticketId) return jsonError("Missing ticketId", 400);

  const ticket = await prisma.userTicket.findUnique({ where: { id: ticketId }, select: { id: true } });
  if (!ticket) return jsonError("Not found", 404);

  const messages = await prisma.userTicketMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    take: 400,
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
  req: Request,
  ctx: { params: Promise<{ ticketId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { ticketId } = await ctx.params;
  if (!ticketId) return jsonError("Missing ticketId", 400);

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.userTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, status: true },
    });

    if (!ticket) return { ok: false as const, error: "Not found", status: 404 as const };
    if (ticket.status === "CLOSED") {
      return { ok: false as const, error: "Ticket is closed", status: 400 as const };
    }

    const created = await tx.userTicketMessage.create({
      data: {
        ticketId,
        senderId: admin.id,
        senderRole: admin.role,
        message: parsed.data.message,
      },
      select: {
        id: true,
        senderId: true,
        senderRole: true,
        message: true,
        attachments: true,
        createdAt: true,
      },
    });

    await tx.userTicket.update({
      where: { id: ticketId },
      data: { status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status },
      select: { id: true },
    });

    return { ok: true as const, created };
  });

  if (result.ok === false) return jsonError(result.error, result.status);

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_USER_TICKET_MESSAGE_CREATE",
    entity: "UserTicket",
    entityId: ticketId,
    meta: { messageId: result.created.id },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk(
    {
      message: { ...result.created, createdAt: result.created.createdAt.toISOString() },
    },
    { status: 201 }
  );
}
