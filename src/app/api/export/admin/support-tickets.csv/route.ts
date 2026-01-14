import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { buildCreatedAtRange, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { SupportTicketStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);
  const status = (url.searchParams.get("status") || "").trim();

  const where: Prisma.SupportTicketWhereInput = {
    ...(range ? { createdAt: range } : {}),
  };
  if (status && status !== "ALL") {
    if ((Object.values(SupportTicketStatus) as string[]).includes(status)) {
      where.status = status as SupportTicketStatus;
    }
  }

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 5000,
    select: {
      id: true,
      vendorId: true,
      createdBy: true,
      category: true,
      subject: true,
      status: true,
      orderId: true,
      productId: true,
      createdAt: true,
      updatedAt: true,
      vendor: { select: { shopName: true } },
      creator: { select: { email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        where: { isInternal: false },
        select: { message: true, senderRole: true, createdAt: true },
      },
    },
  });

  const headers = [
    "ticketId",
    "vendorId",
    "vendorShopName",
    "createdByUserId",
    "createdByEmail",
    "category",
    "status",
    "subject",
    "orderId",
    "productId",
    "createdAt",
    "updatedAt",
    "lastMessage",
    "lastMessageRole",
    "lastMessageAt",
  ];

  const rows = tickets.map((t) => {
    const last = t.messages[0];
    return {
      ticketId: t.id,
      vendorId: t.vendorId,
      vendorShopName: t.vendor.shopName,
      createdByUserId: t.createdBy,
      createdByEmail: t.creator.email,
      category: t.category,
      status: t.status,
      subject: t.subject,
      orderId: t.orderId || "",
      productId: t.productId || "",
      createdAt: formatIsoDateTime(t.createdAt),
      updatedAt: formatIsoDateTime(t.updatedAt),
      lastMessage: last?.message || "",
      lastMessageRole: last?.senderRole || "",
      lastMessageAt: last?.createdAt ? formatIsoDateTime(last.createdAt) : "",
    };
  });

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Admin_SupportTickets_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
