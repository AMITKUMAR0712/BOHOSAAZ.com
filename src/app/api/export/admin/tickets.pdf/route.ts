import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
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
    take: 2000,
    select: {
      id: true,
      category: true,
      subject: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { email: true } },
    },
  });

  const rows = tickets.map((t) => ({
    ticketId: t.id,
    updatedAt: formatIsoDateTime(t.updatedAt),
    status: t.status,
    category: t.category,
    priority: t.priority,
    userEmail: t.user.email,
    subject: t.subject,
  }));

  const pdf = await buildPdfBuffer(
    (doc) => {
      renderTable(
        doc,
        [
          { key: "ticketId", label: "Ticket", width: 140 },
          { key: "updatedAt", label: "Updated (ISO)", width: 150 },
          { key: "status", label: "Status", width: 60 },
          { key: "category", label: "Category", width: 70 },
          { key: "priority", label: "Priority", width: 50 },
          { key: "userEmail", label: "User", width: 120 },
          { key: "subject", label: "Subject", width: 110 },
        ],
        rows,
        { rowHeight: 20 }
      );
    },
    { title: "Bohosaaz — Admin Tickets Export", subtitle: "" }
  );

  const filename = `Bohosaaz_Admin_Tickets_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
