import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import RefundsClient from "./RefundsClient";

export default async function AdminRefundsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const items = await prisma.orderItem.findMany({
    where: { status: "RETURN_REQUESTED" },
    select: {
      id: true,
      orderId: true,
      price: true,
      quantity: true,
      product: { select: { id: true, title: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return <RefundsClient initialItems={items} />;
}
