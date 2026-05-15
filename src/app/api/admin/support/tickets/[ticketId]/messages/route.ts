import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

const createSchema = z.object({
  message: z.string().trim().min(1).max(191),
  isInternal: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ticketId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { ticketId } = await ctx.params;
  if (!ticketId) return jsonError("Missing ticketId", 400);

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return jsonError("Not found", 404);

  const messages = await prisma.supportTicketMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderRole: true,
      message: true,
      createdAt: true,
      isInternal: true,
    },
  });

  return jsonOk({ messages });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ticketId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { ticketId } = await ctx.params;
  if (!ticketId) return jsonError("Missing ticketId", 400);

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return jsonError("Not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const created = await prisma.supportTicketMessage.create({
    data: {
      ticketId,
      senderId: admin.id,
      senderRole: admin.role,
      message: parsed.data.message,
      isInternal: parsed.data.isInternal ?? false,
    },
    select: { id: true, senderRole: true, message: true, createdAt: true, isInternal: true },
  });

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { updatedAt: new Date() },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_SUPPORT_TICKET_MESSAGE_CREATE",
    entity: "SupportTicket",
    entityId: ticketId,
    meta: { messageId: created.id, isInternal: created.isInternal },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ message: created }, { status: 201 });
}
