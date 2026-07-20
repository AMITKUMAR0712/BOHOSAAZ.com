import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { formatDbError } from "@/lib/dbError";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ticketId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { ticketId } = await ctx.params;
  if (!ticketId) return jsonError("Missing ticketId", 400);

  try {
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
        userId: true,
      },
    });

    if (!ticket) return jsonError("Not found", 404);

    let user = {
      id: ticket.userId,
      email: "Unknown user",
      name: null as string | null,
      phone: null as string | null,
    };
    try {
      const row = await prisma.user.findUnique({
        where: { id: ticket.userId },
        select: { id: true, email: true, name: true, phone: true },
      });
      if (row) user = row;
    } catch (error) {
      console.warn("[api/admin/user-tickets/[ticketId]] user lookup failed:", formatDbError(error));
    }

    return jsonOk({
      ticket: {
        id: ticket.id,
        category: ticket.category,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        orderId: ticket.orderId,
        returnRequestId: ticket.returnRequestId,
        meta: ticket.meta,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        user,
      },
    });
  } catch (error) {
    console.error("[api/admin/user-tickets/[ticketId]] GET failed:", error);
    return jsonError(`Failed to load user ticket: ${formatDbError(error)}`, 500);
  }
}
