import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import BrandsClient from "./BrandsClient";

export default async function AdminBrandsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { lang } = await params;

  const rowsRaw = await prisma.brand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const rows = rowsRaw.map((b) => ({
    ...b,
    logoUrl: b.logoUrl ?? null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  return <BrandsClient lang={lang} initialBrands={rows} />;
}
