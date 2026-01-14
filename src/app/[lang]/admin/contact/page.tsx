import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import ContactClient from "./ContactClient";

export default async function AdminContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  await params;

  const rowsRaw = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      message: true,
      status: true,
      adminReply: true,
      repliedAt: true,
      createdAt: true,
    },
  });

  const rows = rowsRaw.map((r) => ({
    ...r,
    repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return <ContactClient initialMessages={rows} />;
}
