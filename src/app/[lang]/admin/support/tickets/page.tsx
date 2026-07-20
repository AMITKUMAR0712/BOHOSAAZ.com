import { prisma } from "@/lib/prisma";
import TicketsClient from "./TicketsClient";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  try {
    const ticketsRaw = await prisma.supportTicket.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        category: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        vendor: { select: { id: true, shopName: true, status: true } },
        creator: { select: { id: true, email: true, name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { message: true, senderRole: true, createdAt: true, isInternal: true },
        },
      },
    });

    const tickets = ticketsRaw.map((t) => ({
      id: t.id,
      category: t.category,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      vendor: t.vendor
        ? { id: t.vendor.id, shopName: t.vendor.shopName, status: t.vendor.status }
        : { id: "unknown", shopName: "Unknown vendor", status: "UNKNOWN" },
      creator: t.creator
        ? { id: t.creator.id, email: t.creator.email, name: t.creator.name }
        : { id: "unknown", email: "Unknown user", name: null },
      messages: (t.messages || []).map((m) => ({
        message: m.message,
        senderRole: m.senderRole,
        createdAt: m.createdAt.toISOString(),
        isInternal: m.isInternal,
      })),
    }));

    return <TicketsClient lang={lang} initialTickets={tickets} initialError={null} />;
  } catch (error) {
    console.error("[admin/support/tickets] failed to load tickets:", error);
    return (
      <TicketsClient
        lang={lang}
        initialTickets={[]}
        initialError="Failed to load support tickets. Please refresh or contact support."
      />
    );
  }
}
