import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string; imageId: string }> }
) {
  const rlKey = `vendor:product:image:primary:${req.headers.get("x-forwarded-for") || "ip"}`;
  const limited = await rateLimit(rlKey);
  if (!limited.success) return Response.json({ error: "Too many requests" }, { status: 429 });

  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "VENDOR") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { productId, imageId } = await ctx.params;

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });
  if (product.vendorId !== vendor.id) return Response.json({ error: "Forbidden" }, { status: 403 });

  const img = await prisma.productImage.findUnique({ where: { id: imageId }, select: { id: true, productId: true } });
  if (!img || img.productId !== productId) return Response.json({ error: "Image not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.productImage.updateMany({
      where: { productId },
      data: { isPrimary: false },
    }),
    prisma.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    }),
  ]);

  await audit({
    actorId: payload.sub,
    actorRole: payload.role,
    action: "VENDOR_PRODUCT_IMAGE_PRIMARY",
    entity: "Product",
    entityId: productId,
    meta: { imageId },
    ip: req.headers.get("x-forwarded-for") || undefined,
  });

  return Response.json({ ok: true });
}
