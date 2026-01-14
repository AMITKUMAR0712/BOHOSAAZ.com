import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { SupportTicketStatus } from "@prisma/client";

const createSchema = z.object({
  category: z.enum([
    "ORDER_ISSUE",
    "PAYOUT_ISSUE",
    "PRODUCT_ISSUE",
    "RETURNS_ISSUE",
    "OTHER",
  ]),
  subject: z.string().min(3).max(191),
  message: z.string().min(1).max(191),
});

async function requireVendor(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return { error: "Unauthorized" as const, status: 401 as const };

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return { error: "Unauthorized" as const, status: 401 as const };
  }

  if (payload.role !== "VENDOR") {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return { error: "Vendor profile not found" as const, status: 404 as const };
  if (vendor.status !== "APPROVED") return { error: "Vendor not approved" as const, status: 403 as const };

  return { payload, vendor } as const;
}

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const statusRaw = (url.searchParams.get("status") || "").trim();
  const status = (Object.values(SupportTicketStatus) as string[]).includes(statusRaw)
    ? (statusRaw as SupportTicketStatus)
    : undefined;
  const take = Math.min(50, Math.max(5, Number(url.searchParams.get("take") || 20)));

  const tickets = await prisma.supportTicket.findMany({
    where: {
      vendorId: auth.vendor.id,
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      category: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        where: { isInternal: false },
        select: { message: true, senderRole: true, createdAt: true },
      },
    },
  });

  return Response.json({ tickets });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(
    `vendor:support:ticket:create:${req.headers.get("x-forwarded-for") || "ip"}`
  );
  if (!limited.success) return Response.json({ error: "Too many requests" }, { status: 429 });

  const auth = await requireVendor(req);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const ticket = await prisma.supportTicket.create({
    data: {
      vendorId: auth.vendor.id,
      createdBy: auth.payload.sub,
      category: parsed.data.category,
      subject: parsed.data.subject,
      messages: {
        create: {
          senderId: auth.payload.sub,
          senderRole: auth.payload.role,
          message: parsed.data.message,
          isInternal: false,
        },
      },
    },
    select: { id: true, category: true, subject: true, status: true, createdAt: true, updatedAt: true },
  });

  await audit({
    actorId: auth.payload.sub,
    actorRole: auth.payload.role,
    action: "VENDOR_SUPPORT_TICKET_CREATE",
    entity: "SupportTicket",
    entityId: ticket.id,
    meta: { category: ticket.category, subject: ticket.subject },
    ip: req.headers.get("x-forwarded-for") || undefined,
  });

  return Response.json({ ticket }, { status: 201 });
}
