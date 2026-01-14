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

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      category: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      vendor: { select: { id: true, shopName: true, status: true } },
      creator: { select: { id: true, email: true, name: true } },
      orderId: true,
      productId: true,
      meta: true,
    },
  });

  if (!ticket) return jsonError("Not found", 404);
  return jsonOk({ ticket });
}
