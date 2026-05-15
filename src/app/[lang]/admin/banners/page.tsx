import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import BannersClient from "./BannersClient";

export default async function AdminBannersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { lang } = await params;

  const rowsRaw = await prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      highlightText: true,
      subtitle: true,
      imageUrl: true,
      ctaText: true,
      ctaHref: true,
      isActive: true,
      sortOrder: true,
      couponCode: true,
      startAt: true,
      endAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const rows = rowsRaw.map((b) => ({
    ...b,
    startAt: b.startAt ? b.startAt.toISOString() : null,
    endAt: b.endAt ? b.endAt.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  return <BannersClient lang={lang} initialBanners={rows} />;
}
