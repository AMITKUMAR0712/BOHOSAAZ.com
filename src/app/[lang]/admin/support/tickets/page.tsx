import TicketsClient from "./TicketsClient";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return <TicketsClient lang={lang} />;
}
