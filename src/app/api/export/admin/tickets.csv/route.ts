import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { buildCreatedAtRange, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { UserTicketStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);
  const status = (url.searchParams.get("status") || "").trim();

  const where: Prisma.UserTicketWhereInput = {
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
      userId: true,
      category: true,
      subject: true,
      status: true,
      priority: true,
      orderId: true,
      returnRequestId: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { message: true, senderRole: true, createdAt: true },
      },
    },
  });

  const headers = [
    "ticketId",
    "userId",
    "userEmail",
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
      userId: t.userId,
      userEmail: t.user.email,
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
  const filename = `Bohosaaz_Admin_Tickets_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
