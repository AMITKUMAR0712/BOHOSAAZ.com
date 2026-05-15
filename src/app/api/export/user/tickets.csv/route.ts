import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { buildCreatedAtRange, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { UserTicketStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const me = await requireUser();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);
  const status = (url.searchParams.get("status") || "").trim();

  const where: Prisma.UserTicketWhereInput = {
    userId: me.id,
    ...(range ? { createdAt: range } : {}),
  };
  if (status && status !== "ALL") {
    if ((Object.values(UserTicketStatus) as string[]).includes(status)) {
      where.status = status as UserTicketStatus;
    }
  }

  const tickets = await prisma.userTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 5000,
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
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { message: true, senderRole: true, createdAt: true },
      },
    },
  });

  const headers = [
    "ticketId",
    "category",
    "priority",
    "status",
    "subject",
    "orderId",
    "returnRequestId",
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
      category: t.category,
      priority: t.priority,
      status: t.status,
      subject: t.subject,
      orderId: t.orderId || "",
      returnRequestId: t.returnRequestId || "",
      createdAt: formatIsoDateTime(t.createdAt),
      updatedAt: formatIsoDateTime(t.updatedAt),
      lastMessage: last?.message || "",
      lastMessageRole: last?.senderRole || "",
      lastMessageAt: last?.createdAt ? formatIsoDateTime(last.createdAt) : "",
    };
  });

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Tickets_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
