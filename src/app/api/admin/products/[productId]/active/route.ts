import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

const schema = z.object({
  isActive: z.boolean(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { productId } = await ctx.params;
  if (!productId) return jsonError("Missing productId", 400);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const res = await prisma.product.updateMany({
    where: { id: productId, deletedAt: null },
    data: { isActive: parsed.data.isActive },
  });
  if (res.count === 0) return jsonError("Not found", 404);

  const updated = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true, updatedAt: true, vendorId: true },
  });
  if (!updated) return jsonError("Not found", 404);

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_PRODUCT_SET_ACTIVE",
    entity: "Product",
    entityId: updated.id,
    meta: { isActive: updated.isActive, vendorId: updated.vendorId },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ product: updated });
}
