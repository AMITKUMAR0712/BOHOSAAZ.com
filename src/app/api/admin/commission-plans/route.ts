import { z } from "zod";
import { NextRequest } from "next/server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

const listQuerySchema = z.object({
  scope: z.enum(["DEFAULT", "VENDOR", "CATEGORY"]).optional(),
  vendorId: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  active: z.enum(["true", "false"]).optional(),
});

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    scope: url.searchParams.get("scope") ?? undefined,
    vendorId: url.searchParams.get("vendorId") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    active: url.searchParams.get("active") ?? undefined,
  });

  const where: Record<string, unknown> = {};
  if (parsed.success) {
    if (parsed.data.scope) where.scope = parsed.data.scope;
    if (parsed.data.vendorId) where.vendorId = parsed.data.vendorId;
    if (parsed.data.categoryId) where.categoryId = parsed.data.categoryId;
    if (parsed.data.active) where.isActive = parsed.data.active === "true";
  }

  const plans = await prisma.commissionPlan.findMany({
    where,
    orderBy: [{ scope: "asc" }, { updatedAt: "desc" }],
    include: {
      vendor: { select: { id: true, shopName: true, status: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  return jsonOk({ plans });
}

const createSchema = z
  .object({
    scope: z.enum(["DEFAULT", "VENDOR", "CATEGORY"]),
    percent: z.number().min(0).max(100),
    vendorId: z.string().trim().min(1).optional().nullable(),
    categoryId: z.string().trim().min(1).optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((v, ctx) => {
    const vendorId = v.vendorId ?? null;
    const categoryId = v.categoryId ?? null;

    if (v.scope === "DEFAULT") {
      if (vendorId || categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "DEFAULT scope must not set vendorId/categoryId",
        });
      }
    }

    if (v.scope === "VENDOR") {
      if (!vendorId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "VENDOR scope requires vendorId" });
      }
      if (categoryId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "VENDOR scope must not set categoryId" });
      }
    }

    if (v.scope === "CATEGORY") {
      if (!categoryId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CATEGORY scope requires categoryId" });
      }
      if (vendorId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CATEGORY scope must not set vendorId" });
      }
    }
  });

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const { scope, percent, vendorId, categoryId, note, isActive } = parsed.data;

  if (vendorId) {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
    if (!vendor) return jsonError("Vendor not found", 400);
  }

  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!category) return jsonError("Category not found", 400);
  }

  const where: Prisma.CommissionPlanWhereInput = {
    scope,
    vendorId: vendorId ?? null,
    categoryId: categoryId ?? null,
  };

  const existing = await prisma.commissionPlan.findFirst({
    where,
    select: { id: true },
  });

  const updateData: Prisma.CommissionPlanUpdateInput = {
    percent,
    isActive,
    note: note ?? null,
    createdBy: admin.id,
  };

  const createData: Prisma.CommissionPlanUncheckedCreateInput = {
    scope,
    percent,
    vendorId: vendorId ?? null,
    categoryId: categoryId ?? null,
    isActive,
    note: note ?? null,
    createdBy: admin.id,
  };

  const plan = existing
    ? await prisma.commissionPlan.update({
        where: { id: existing.id },
        data: updateData,
      })
    : await prisma.commissionPlan.create({
        data: createData,
      });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_COMMISSION_PLAN_UPSERT",
    entity: "CommissionPlan",
    entityId: plan.id,
    meta: {
      scope,
      percent,
      vendorId: vendorId ?? null,
      categoryId: categoryId ?? null,
      isActive,
    },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ plan }, { status: 201 });
}
