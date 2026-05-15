import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const user = await requireUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { ticketId } = await params;

  const ticket = await prisma.userTicket.findFirst({
    where: { id: ticketId, userId: user.id },
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
