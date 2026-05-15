import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import TicketClient from "./TicketClient";

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { ticketId } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      subject: true,
      status: true,
      category: true,
      vendor: { select: { id: true, shopName: true, status: true } },
      creator: { select: { id: true, email: true, name: true } },
    },
  });

  if (!ticket) redirect("/404");

  const messagesRaw = await prisma.supportTicketMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    select: { id: true, senderRole: true, message: true, createdAt: true, isInternal: true },
  });

  const messages = messagesRaw.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  return <TicketClient ticket={ticket} initialMessages={messages} />;
}
