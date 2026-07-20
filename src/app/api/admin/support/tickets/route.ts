import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { SupportTicketStatus } from "@prisma/client";
import { formatDbError } from "@/lib/dbError";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = z
    .object({
      status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
      take: z.coerce.number().int().min(1).max(100).optional(),
    })
    .safeParse({
      status: (url.searchParams.get("status") ?? undefined) as SupportTicketStatus | undefined,
      take: url.searchParams.get("take") ?? undefined,
    });

  if (!parsed.success) return jsonError("Invalid query", 400);

  const take = parsed.data.take ?? 50;

  try {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
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
        vendorId: true,
        createdBy: true,
      },
    });

    const ticketIds = tickets.map((t) => t.id);
    const vendorIds = [...new Set(tickets.map((t) => t.vendorId))];
    const creatorIds = [...new Set(tickets.map((t) => t.createdBy))];

    const vendorsById = new Map<string, { id: string; shopName: string; status: string }>();
    if (vendorIds.length) {
      try {
        const vendors = await prisma.vendor.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, shopName: true, status: true },
        });
        for (const vendor of vendors) vendorsById.set(vendor.id, vendor);
      } catch (error) {
        console.warn("[api/admin/support/tickets] vendor lookup failed:", formatDbError(error));
      }
    }

    const creatorsById = new Map<string, { id: string; email: string; name: string | null }>();
    if (creatorIds.length) {
      try {
        const creators = await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, email: true, name: true },
        });
        for (const creator of creators) creatorsById.set(creator.id, creator);
      } catch (error) {
        console.warn("[api/admin/support/tickets] creator lookup failed:", formatDbError(error));
      }
    }

    const latestByTicket = new Map<
      string,
      { message: string; senderRole: string; createdAt: string; isInternal: boolean }
    >();
    if (ticketIds.length) {
      try {
        const messages = await prisma.supportTicketMessage.findMany({
          where: { ticketId: { in: ticketIds } },
          orderBy: { createdAt: "desc" },
          select: {
            ticketId: true,
            message: true,
            senderRole: true,
            createdAt: true,
            isInternal: true,
          },
        });
        for (const message of messages) {
          if (!latestByTicket.has(message.ticketId)) {
            latestByTicket.set(message.ticketId, {
              message: message.message,
              senderRole: message.senderRole,
              createdAt: message.createdAt.toISOString(),
              isInternal: message.isInternal,
            });
          }
        }
      } catch (error) {
        console.warn("[api/admin/support/tickets] message lookup failed:", formatDbError(error));
      }
    }

    return jsonOk({
      tickets: tickets.map((t) => ({
        id: t.id,
        category: t.category,
        subject: t.subject,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        vendor: vendorsById.get(t.vendorId) ?? {
          id: t.vendorId,
          shopName: "Unknown vendor",
          status: "UNKNOWN",
        },
        creator: creatorsById.get(t.createdBy) ?? {
          id: t.createdBy,
          email: "Unknown user",
          name: null,
        },
        messages: latestByTicket.has(t.id) ? [latestByTicket.get(t.id)!] : [],
      })),
    });
  } catch (error) {
    console.error("[api/admin/support/tickets] GET failed:", error);
    return jsonError(`Failed to load support tickets: ${formatDbError(error)}`, 500);
  }
}
