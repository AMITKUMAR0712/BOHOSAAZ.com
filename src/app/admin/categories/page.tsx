import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import CategoriesClient from "./CategoriesClient";

export default async function AdminCategoriesPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, iconName: true, iconUrl: true },
  });

  return <CategoriesClient initialItems={categories} />;
}
