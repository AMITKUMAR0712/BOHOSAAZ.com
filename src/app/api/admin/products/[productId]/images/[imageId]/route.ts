import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string; imageId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { productId, imageId } = await ctx.params;
  if (!productId || !imageId) return jsonError("Missing params", 400);

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null }, select: { id: true, vendorId: true } });
  if (!product) return jsonError("Product not found", 404);

  try {
    await prisma.productImage.delete({ where: { id: imageId } });
  } catch {
    return jsonError("Not found", 404);
  }

  // If primary deleted, ensure some primary exists.
  const remaining = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
    select: { id: true, isPrimary: true },
  });
  if (remaining.length > 0 && !remaining.some((x) => x.isPrimary)) {
    await prisma.productImage.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
  }

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_PRODUCT_IMAGE_DELETE",
    entity: "Product",
    entityId: productId,
    meta: { imageId, vendorId: product.vendorId },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ deleted: true });
}
