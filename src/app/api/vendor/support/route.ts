import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { z } from "zod";
import { attachmentsOrNull, supportAttachmentsSchema } from "@/lib/supportAttachments";

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  category: z.enum(["ORDER_ISSUE", "PAYOUT_ISSUE", "PRODUCT_ISSUE", "RETURNS_ISSUE", "OTHER"]),
  message: z.string().min(10).max(2000),
  attachments: supportAttachmentsSchema,
});

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  if (payload.role !== "VENDOR") return Response.json({ error: "Forbidden" }, { status: 403 });

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor not found" }, { status: 404 });

  const tickets = await prisma.supportTicket.findMany({
    where: { vendorId: vendor.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true } },
    },
  });

  return Response.json({ ok: true, tickets });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  if (payload.role !== "VENDOR") return Response.json({ error: "Forbidden" }, { status: 403 });

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = createTicketSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { subject, category, message, attachments } = parsed.data;

  const ticket = await prisma.$transaction(async (tx) => {
    const t = await tx.supportTicket.create({
      data: {
        vendorId: vendor.id,
        createdBy: payload.sub,
        subject,
        category,
        status: "OPEN",
      },
    });

    await tx.supportTicketMessage.create({
      data: {
        ticketId: t.id,
        senderId: payload.sub,
        senderRole: "VENDOR",
        message,
        attachments: attachmentsOrNull(attachments),
      },
    });

    return t;
  });

  return Response.json({ ok: true, ticket });
}
