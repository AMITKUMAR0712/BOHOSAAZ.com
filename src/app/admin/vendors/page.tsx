import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import VendorsClient from "./VendorsClient";

export default async function AdminVendorsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const vendors = await prisma.vendor.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      shopName: true,
      status: true,
      logoUrl: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
  });

  const initialVendors = vendors.map((v) => ({
    id: v.id,
    shopName: v.shopName,
    status: v.status,
    logoUrl: v.logoUrl ?? null,
    createdAt: v.createdAt.toISOString(),
    user: v.user,
  }));

  return <VendorsClient initialVendors={initialVendors} />;
}
