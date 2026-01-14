import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

const createSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .transform((s) => s.toUpperCase()),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive(),
  minOrderAmount: z.number().nonnegative().optional().nullable(),
  maxDiscountAmount: z.number().nonnegative().optional().nullable(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(_req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
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
      createdAt: true,
      updatedAt: true,
    },
  });

  return jsonOk({ coupons });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const created = await prisma.coupon.create({
    data: {
      code: parsed.data.code,
      type: parsed.data.type,
      value: parsed.data.value,
      minOrderAmount: parsed.data.minOrderAmount ?? null,
      maxDiscountAmount: parsed.data.maxDiscountAmount ?? null,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : null,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
      usageLimit: parsed.data.usageLimit ?? null,
      isActive: parsed.data.isActive,
    },
    select: { id: true, code: true, isActive: true },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_COUPON_CREATE",
    entity: "Coupon",
    entityId: created.id,
    meta: { code: created.code, isActive: created.isActive },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ coupon: created }, { status: 201 });
}
