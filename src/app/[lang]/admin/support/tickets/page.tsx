import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import TicketsClient from "./TicketsClient";

export default async function AdminTicketsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { lang } = await params;

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
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    messages: (t.messages || []).map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  }));

  return <TicketsClient lang={lang} initialTickets={tickets} />;
}
