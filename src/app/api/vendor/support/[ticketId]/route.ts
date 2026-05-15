import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1).max(2000),
  attachments: z.array(z.string().url()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  const { ticketId } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  // Security: only creator, vendor, or admin can view
  if (payload.role !== "ADMIN" && ticket.createdBy !== payload.sub) {
    // If it's a vendor ticket, the vendor user can view
    const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
    if (!vendor || vendor.id !== ticket.vendorId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return Response.json({ ok: true, ticket });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  const { ticketId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = messageSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid message" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  // Security: only vendor/admin can reply
  if (payload.role !== "ADMIN") {
    const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
    if (!vendor || vendor.id !== ticket.vendorId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const message = await prisma.supportTicketMessage.create({
    data: {
      ticketId,
      senderId: payload.sub,
      senderRole: payload.role,
      message: parsed.data.message,
      attachments: parsed.data.attachments ? JSON.stringify(parsed.data.attachments) : undefined,
    },
  });

  // Update ticket timestamp
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { updatedAt: new Date() },
  });

  return Response.json({ ok: true, message });
}
