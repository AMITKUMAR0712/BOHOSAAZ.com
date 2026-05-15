import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  const rlKey = `vendor:product:image:add:${req.headers.get("x-forwarded-for") || "ip"}`;
  const limited = await rateLimit(rlKey);
  if (!limited.success) return Response.json({ error: "Too many requests" }, { status: 429 });

  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "VENDOR") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { productId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = z.object({ url: z.string().trim().url() }).safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid image url" }, { status: 400 });
  const url = parsed.data.url;

  // Ensure vendor owns product
  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });

  if (product.vendorId !== vendor.id) return Response.json({ error: "Forbidden" }, { status: 403 });

  const hasAny = await prisma.productImage.findFirst({ where: { productId }, select: { id: true } });
  const img = await prisma.productImage.create({
    data: { productId, url, isPrimary: !hasAny },
  });

  await audit({
    actorId: payload.sub,
    actorRole: payload.role,
    action: "VENDOR_PRODUCT_IMAGE_ADD",
    entity: "Product",
    entityId: productId,
    meta: { imageId: img.id, url },
    ip: req.headers.get("x-forwarded-for") || undefined,
  });

  return Response.json({ image: img }, { status: 201 });
}
