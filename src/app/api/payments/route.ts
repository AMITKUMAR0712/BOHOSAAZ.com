import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: user.id, status: { not: "PENDING" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      total: true,
      createdAt: true,
      items: { select: { status: true } },
    },
  });

  const payments = orders.map((o) => {
    const refundedCount = o.items.filter((it) => it.status === "REFUNDED").length;
    const paymentStatus =
      refundedCount === 0
        ? "PAID"
        : refundedCount === o.items.length
          ? "REFUNDED"
          : "PARTIAL_REFUND";
    const method = o.paymentMethod === "COD" ? "COD" : "Online";
    return {
      orderId: o.id,
      amount: o.total,
      method,
      status: paymentStatus,
      date: o.createdAt,
    };
  });

  return Response.json({ payments });
}
