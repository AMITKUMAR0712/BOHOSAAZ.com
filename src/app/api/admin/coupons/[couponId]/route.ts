import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

const patchSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .transform((s) => s.toUpperCase())
    .optional(),
  type: z.enum(["PERCENT", "FIXED"]).optional(),
  value: z.number().positive().optional(),
  minOrderAmount: z.number().nonnegative().optional().nullable(),
  maxDiscountAmount: z.number().nonnegative().optional().nullable(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ couponId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { couponId } = await ctx.params;
  if (!couponId) return jsonError("Missing couponId", 400);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const updated = await prisma.coupon.update({
    where: { id: couponId },
    data: {
      code: parsed.data.code ?? undefined,
      type: parsed.data.type ?? undefined,
      value: parsed.data.value ?? undefined,
      minOrderAmount:
        parsed.data.minOrderAmount !== undefined ? parsed.data.minOrderAmount : undefined,
      maxDiscountAmount:
        parsed.data.maxDiscountAmount !== undefined ? parsed.data.maxDiscountAmount : undefined,
      startAt:
        parsed.data.startAt === undefined
          ? undefined
          : parsed.data.startAt
            ? new Date(parsed.data.startAt)
            : null,
      endAt:
        parsed.data.endAt === undefined
          ? undefined
          : parsed.data.endAt
            ? new Date(parsed.data.endAt)
            : null,
      usageLimit:
        parsed.data.usageLimit !== undefined ? parsed.data.usageLimit : undefined,
      isActive: parsed.data.isActive ?? undefined,
    },
    select: {
      id: true,
      code: true,
      type: true,
      value: true,
      minOrderAmount: true,
      maxDiscountAmount: true,
      startAt: true,
      endAt: true,
      usageLimit: true,
      usedCount: true,
      isActive: true,
      updatedAt: true,
    },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_COUPON_UPDATE",
    entity: "Coupon",
    entityId: updated.id,
    meta: { code: updated.code },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ coupon: updated });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ couponId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { couponId } = await ctx.params;
  if (!couponId) return jsonError("Missing couponId", 400);

  try {
    const deleted = await prisma.coupon.delete({
      where: { id: couponId },
      select: { id: true, code: true },
    });

    await audit({
      actorId: admin.id,
      actorRole: admin.role,
      action: "ADMIN_COUPON_DELETE",
      entity: "Coupon",
      entityId: deleted.id,
      meta: { code: deleted.code },
      ip: getIpFromRequest(req),
      userAgent: getUserAgentFromRequest(req),
    });

    return jsonOk({ deleted: true });
  } catch {
    return jsonError("Not found", 404);
  }
}
