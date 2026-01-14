import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";
import { OrderStatus } from "@prisma/client";

const schema = z.object({
  status: z.enum([
    "PENDING",
    "COD_PENDING",
    "PLACED",
    "PAID",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "RETURN_REQUESTED",
    "RETURN_APPROVED",
    "REFUNDED",
  ]),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { orderId } = await ctx.params;
  if (!orderId) return jsonError("Missing orderId", 400);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: parsed.data.status as OrderStatus },
    select: { id: true, status: true, updatedAt: true },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_ORDER_STATUS_SET",
    entity: "Order",
    entityId: updated.id,
    meta: { status: updated.status },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ order: updated });
}
