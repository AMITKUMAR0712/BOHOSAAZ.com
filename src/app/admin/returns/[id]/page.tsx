import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import ReturnDetailClient from "./ReturnDetailClient";

export default async function AdminReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { id } = await params;

  const rr = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      order: true,
      orderItem: { include: { product: { include: { images: true } } } },
      user: { select: { id: true, email: true, name: true, phone: true } },
      vendor: { select: { id: true, shopName: true } },
      trackingEvents: { orderBy: { createdAt: "asc" } },
      refundRecord: true,
    },
  });

  if (!rr) redirect("/admin/returns");

  return <ReturnDetailClient initialReturn={rr} />;
}
