import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const items = await prisma.orderItem.findMany({
    where: { status: "RETURN_REQUESTED" },
    include: {
      order: { select: { id: true, userId: true, createdAt: true } },
      product: { select: { id: true, title: true } },
      vendorOrder: {
        select: {
          id: true,
          vendorId: true,
          subtotal: true,
          commission: true,
          payout: true,
          status: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return jsonOk({ items });
}
