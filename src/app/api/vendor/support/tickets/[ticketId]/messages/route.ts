import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  message: z.string().min(1).max(191),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;

  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "VENDOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor profile not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });

  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, vendorId: vendor.id } });
  if (!ticket) return Response.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.supportTicketMessage.findMany({
    where: { ticketId, isInternal: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, senderRole: true, message: true, createdAt: true },
  });

  return Response.json({ messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;

  const limited = await rateLimit(
    `vendor:support:ticket:message:${req.headers.get("x-forwarded-for") || "ip"}`
  );
  if (!limited.success) return Response.json({ error: "Too many requests" }, { status: 429 });

  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "VENDOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor profile not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });

  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, vendorId: vendor.id } });
  if (!ticket) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const message = await prisma.supportTicketMessage.create({
    data: {
      ticketId,
      senderId: payload.sub,
      senderRole: payload.role,
      message: parsed.data.message,
      isInternal: false,
    },
    select: { id: true, senderRole: true, message: true, createdAt: true },
  });

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { updatedAt: new Date() },
  });

  await audit({
    actorId: payload.sub,
    actorRole: payload.role,
    action: "VENDOR_SUPPORT_TICKET_MESSAGE_CREATE",
    entity: "SupportTicket",
    entityId: ticketId,
    meta: { messageId: message.id },
    ip: req.headers.get("x-forwarded-for") || undefined,
  });

  return Response.json({ message }, { status: 201 });
}
