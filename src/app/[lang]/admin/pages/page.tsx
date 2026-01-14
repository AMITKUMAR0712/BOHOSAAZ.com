import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import PagesClient from "./PagesClient";

export default async function AdminPages({ params }: { params: Promise<{ lang: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { lang } = await params;

  const rowsRaw = await prisma.cmsPage.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 50,
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      version: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const rows = rowsRaw.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <PagesClient lang={lang} initialPages={rows} />;
}
