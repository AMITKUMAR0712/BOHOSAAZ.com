import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string; imageId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { productId, imageId } = await ctx.params;
  if (!productId || !imageId) return jsonError("Missing params", 400);

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null }, select: { id: true, vendorId: true } });
  if (!product) return jsonError("Product not found", 404);

  const img = await prisma.productImage.findUnique({ where: { id: imageId }, select: { id: true, productId: true } });
  if (!img || img.productId !== productId) return jsonError("Image not found", 404);

  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
    prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
  ]);

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_PRODUCT_IMAGE_PRIMARY",
    entity: "Product",
    entityId: productId,
    meta: { imageId, vendorId: product.vendorId },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ ok: true });
}
