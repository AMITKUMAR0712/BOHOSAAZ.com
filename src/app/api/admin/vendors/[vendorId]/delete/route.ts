import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ vendorId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { vendorId } = await ctx.params;
  if (!vendorId) return jsonError("Missing vendorId", 400);

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, shopName: true, userId: true },
  });
  if (!vendor) return jsonError("Vendor not found", 404);

  try {
    await prisma.product.deleteMany({ where: { vendorId: vendor.id } });
    await prisma.vendor.delete({ where: { id: vendor.id } });
    await prisma.user.update({
      where: { id: vendor.userId },
      data: { role: "USER" },
    });

    await audit({
      actorId: admin.id,
      actorRole: admin.role,
      action: "ADMIN_VENDOR_DELETE",
      entity: "Vendor",
      entityId: vendor.id,
      meta: { shopName: vendor.shopName, userId: vendor.userId },
      ip: getIpFromRequest(req),
      userAgent: getUserAgentFromRequest(req),
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    console.error("[api/admin/vendors/[vendorId]/delete] POST failed:", error);
    return jsonError("Delete failed", 400);
  }
}
