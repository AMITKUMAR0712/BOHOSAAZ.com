import { prisma } from "@/lib/prisma";
import TicketsClient from "./TicketsClient";

export const dynamic = "force-dynamic";

export default async function AdminUserTicketsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  try {
    const ticketsRaw = await prisma.userTicket.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
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
        user: { select: { id: true, email: true, name: true, phone: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { message: true, senderRole: true, createdAt: true },
        },
      },
    });

    const tickets = ticketsRaw.map((t) => ({
      id: t.id,
      category: t.category,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      orderId: t.orderId,
      returnRequestId: t.returnRequestId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      user: t.user
        ? { id: t.user.id, email: t.user.email, name: t.user.name, phone: t.user.phone }
        : { id: "unknown", email: "Unknown user", name: null, phone: null },
      messages: (t.messages || []).map((m) => ({
        message: m.message,
        senderRole: m.senderRole,
        createdAt: m.createdAt.toISOString(),
      })),
    }));

    return <TicketsClient lang={lang} initialTickets={tickets} initialError={null} />;
  } catch (error) {
    console.error("[admin/user-tickets] failed to load tickets:", error);
    return (
      <TicketsClient
        lang={lang}
        initialTickets={[]}
        initialError="Failed to load user tickets. Please refresh or contact support."
      />
    );
  }
}
