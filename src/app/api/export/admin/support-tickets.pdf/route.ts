import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
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
    take: 2000,
    select: {
      id: true,
      category: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      vendor: { select: { shopName: true } },
    },
  });

  const rows = tickets.map((t) => ({
    ticketId: t.id,
    updatedAt: formatIsoDateTime(t.updatedAt),
    status: t.status,
    category: t.category,
    vendor: t.vendor.shopName,
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
          { key: "category", label: "Category", width: 90 },
          { key: "vendor", label: "Vendor", width: 120 },
          { key: "subject", label: "Subject", width: 130 },
        ],
        rows,
        { rowHeight: 20 }
      );
    },
    { title: "Bohosaaz — Admin Support Tickets Export", subtitle: "" }
  );

  const filename = `Bohosaaz_Admin_SupportTickets_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
