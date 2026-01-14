import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import ReturnsClient from "./ReturnsClient";

export default async function AdminReturnsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const returns = await prisma.returnRequest.findMany({
    include: {
      order: { select: { id: true, createdAt: true, status: true, paymentMethod: true } },
      user: { select: { id: true, email: true, name: true } },
      vendor: { select: { id: true, shopName: true } },
      orderItem: {
        select: {
          id: true,
          quantity: true,
          price: true,
          status: true,
          product: { select: { id: true, title: true } },
        },
      },
      refundRecord: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return <ReturnsClient initialReturns={returns} />;
}
