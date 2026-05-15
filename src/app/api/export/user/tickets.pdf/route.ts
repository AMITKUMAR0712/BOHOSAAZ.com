import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
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
    take: 2000,
    select: {
      id: true,
      category: true,
      subject: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const rows = tickets.map((t) => ({
    ticketId: t.id,
    updatedAt: formatIsoDateTime(t.updatedAt),
    status: t.status,
    category: t.category,
    priority: t.priority,
    subject: t.subject,
  }));

  const pdf = await buildPdfBuffer(
    (doc) => {
      renderTable(
        doc,
        [
          { key: "ticketId", label: "Ticket", width: 150 },
          { key: "updatedAt", label: "Updated (ISO)", width: 150 },
          { key: "status", label: "Status", width: 70 },
          { key: "category", label: "Category", width: 70 },
          { key: "priority", label: "Priority", width: 50 },
          { key: "subject", label: "Subject", width: 90 },
        ],
        rows,
        { rowHeight: 20 }
      );
    },
    { title: "Bohosaaz — Tickets Export", subtitle: "" }
  );

  const filename = `Bohosaaz_Tickets_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
