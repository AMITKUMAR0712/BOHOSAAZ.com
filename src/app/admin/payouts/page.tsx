import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import PayoutsClient from "./PayoutsClient";

export default async function AdminPayoutsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const rows = await prisma.vendorOrder.findMany({
    where: { status: "DELIVERED" },
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { id: true, shopName: true } },
      order: { select: { id: true } },
    },
  });

  return <PayoutsClient initialRows={rows} />;
}
