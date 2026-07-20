import TicketClient from "./TicketClient";

export const dynamic = "force-dynamic";

export default async function AdminUserTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return <TicketClient ticketId={ticketId} />;
}
