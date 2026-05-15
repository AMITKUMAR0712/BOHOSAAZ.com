import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureUniqueBrandSlug(base: string, excludeId: string) {
  let slug = base;
  for (let i = 0; i < 10; i++) {
    const exists = await prisma.brand.findUnique({ where: { slug } });
    if (!exists || exists.id === excludeId) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(191).optional(),
  slug: z.string().trim().min(1).max(191).optional(),
  logoUrl: z.string().trim().url().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ brandId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { brandId } = await ctx.params;
  if (!brandId) return jsonError("Missing brandId", 400);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const b = parsed.data;

  let nextSlug: string | undefined;
  if (b.slug !== undefined) {
    const base = slugify(b.slug);
    if (!base) return jsonError("Invalid slug", 400);
    nextSlug = await ensureUniqueBrandSlug(base, brandId);
  }

  const updated = await prisma.brand.update({
    where: { id: brandId },
    data: {
      name: b.name ?? undefined,
      slug: nextSlug ?? undefined,
      logoUrl: b.logoUrl !== undefined ? b.logoUrl : undefined,
      isActive: b.isActive ?? undefined,
      sortOrder: b.sortOrder ?? undefined,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isActive: true,
      sortOrder: true,
      updatedAt: true,
    },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_BRAND_UPDATE",
    entity: "Brand",
    entityId: updated.id,
    meta: { name: updated.name, slug: updated.slug, isActive: updated.isActive, sortOrder: updated.sortOrder },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ brand: updated });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ brandId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { brandId } = await ctx.params;
  if (!brandId) return jsonError("Missing brandId", 400);

  try {
    const deleted = await prisma.brand.delete({
      where: { id: brandId },
      select: { id: true, name: true, slug: true },
    });

    await audit({
      actorId: admin.id,
      actorRole: admin.role,
      action: "ADMIN_BRAND_DELETE",
      entity: "Brand",
      entityId: deleted.id,
      meta: { name: deleted.name, slug: deleted.slug },
      ip: getIpFromRequest(req),
      userAgent: getUserAgentFromRequest(req),
    });

    return jsonOk({ deleted: true });
  } catch {
    return jsonError("Not found", 404);
  }
}
