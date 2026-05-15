import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ticketId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { ticketId } = await ctx.params;
  if (!ticketId) return jsonError("Missing ticketId", 400);

  const ticket = await prisma.userTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      category: true,
      subject: true,
      status: true,
      priority: true,
      orderId: true,
      returnRequestId: true,
      meta: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, email: true, name: true, phone: true } },
    },
  });

  if (!ticket) return jsonError("Not found", 404);

  return jsonOk({
    ticket: {
      ...ticket,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    },
  });
}
