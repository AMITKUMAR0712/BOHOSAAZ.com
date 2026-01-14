import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";
import { SupportTicketStatus } from "@prisma/client";

const schema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ticketId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { ticketId } = await ctx.params;
  if (!ticketId) return jsonError("Missing ticketId", 400);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const updated = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: parsed.data.status as SupportTicketStatus },
    select: { id: true, status: true, updatedAt: true },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_SUPPORT_TICKET_STATUS_SET",
    entity: "SupportTicket",
    entityId: updated.id,
    meta: { status: updated.status },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ ticket: updated });
}
