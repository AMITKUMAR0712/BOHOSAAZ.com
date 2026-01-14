import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const rows = await prisma.vendorOrder.findMany({
    where: { status: "DELIVERED" },
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { id: true, shopName: true } },
      order: { select: { id: true } },
    },
  });

  return jsonOk({ rows });
}
