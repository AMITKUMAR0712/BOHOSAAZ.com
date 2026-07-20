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
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        category: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        vendorId: true,
        createdBy: true,
        orderId: true,
        productId: true,
        meta: true,
      },
    });

    if (!ticket) return jsonError("Not found", 404);

    let vendor = { id: ticket.vendorId, shopName: "Unknown vendor", status: "UNKNOWN" };
    try {
      const row = await prisma.vendor.findUnique({
        where: { id: ticket.vendorId },
        select: { id: true, shopName: true, status: true },
      });
      if (row) vendor = row;
    } catch (error) {
      console.warn("[api/admin/support/tickets/[ticketId]] vendor lookup failed:", formatDbError(error));
    }

    let creator = { id: ticket.createdBy, email: "Unknown user", name: null as string | null };
    try {
      const row = await prisma.user.findUnique({
        where: { id: ticket.createdBy },
        select: { id: true, email: true, name: true },
      });
      if (row) creator = row;
    } catch (error) {
      console.warn("[api/admin/support/tickets/[ticketId]] creator lookup failed:", formatDbError(error));
    }

    return jsonOk({
      ticket: {
        id: ticket.id,
        category: ticket.category,
        subject: ticket.subject,
        status: ticket.status,
        orderId: ticket.orderId,
        productId: ticket.productId,
        meta: ticket.meta,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        vendor,
        creator,
      },
    });
  } catch (error) {
    console.error("[api/admin/support/tickets/[ticketId]] GET failed:", error);
    return jsonError(`Failed to load support ticket: ${formatDbError(error)}`, 500);
  }
}
