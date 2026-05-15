import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

const patchSchema = z.object({
  percent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  if (!id) return jsonError("Missing id", 400);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const existing = await prisma.commissionPlan.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);

  const updated = await prisma.commissionPlan.update({
    where: { id },
    data: {
      percent: parsed.data.percent ?? undefined,
      isActive: parsed.data.isActive ?? undefined,
      note: parsed.data.note !== undefined ? parsed.data.note : undefined,
      createdBy: admin.id,
    },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_COMMISSION_PLAN_UPDATE",
    entity: "CommissionPlan",
    entityId: updated.id,
    meta: {
      before: { percent: existing.percent, isActive: existing.isActive, note: existing.note },
      after: { percent: updated.percent, isActive: updated.isActive, note: updated.note },
    },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ plan: updated });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  if (!id) return jsonError("Missing id", 400);

  const existing = await prisma.commissionPlan.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);

  // Prefer soft-delete to preserve historical references.
  const updated = await prisma.commissionPlan.update({
    where: { id },
    data: { isActive: false, createdBy: admin.id },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_COMMISSION_PLAN_DISABLE",
    entity: "CommissionPlan",
    entityId: updated.id,
    meta: { scope: updated.scope, vendorId: updated.vendorId, categoryId: updated.categoryId },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ plan: updated });
}
