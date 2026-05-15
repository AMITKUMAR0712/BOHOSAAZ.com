import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

const addSchema = z.object({
  url: z.string().trim().url(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { productId } = await ctx.params;
  if (!productId) return jsonError("Missing productId", 400);

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null }, select: { id: true } });
  if (!product) return jsonError("Product not found", 404);

  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: { id: true, url: true, isPrimary: true, createdAt: true },
  });

  return jsonOk({ images });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { productId } = await ctx.params;
  if (!productId) return jsonError("Missing productId", 400);

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null }, select: { id: true, vendorId: true } });
  if (!product) return jsonError("Product not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const hasAny = await prisma.productImage.findFirst({ where: { productId }, select: { id: true } });

  const image = await prisma.productImage.create({
    data: {
      productId,
      url: parsed.data.url,
      isPrimary: !hasAny,
    },
    select: { id: true, url: true, isPrimary: true, createdAt: true },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_PRODUCT_IMAGE_ADD",
    entity: "Product",
    entityId: productId,
    meta: { imageId: image.id, url: image.url, vendorId: product.vendorId },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ image }, { status: 201 });
}
