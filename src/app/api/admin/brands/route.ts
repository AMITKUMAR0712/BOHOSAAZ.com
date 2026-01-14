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

async function ensureUniqueBrandSlug(base: string) {
  let slug = base;
  for (let i = 0; i < 10; i++) {
    const exists = await prisma.brand.findUnique({ where: { slug } });
    if (!exists) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(191),
  slug: z.string().trim().min(1).max(191).optional(),
  logoUrl: z.string().trim().url().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const brands = await prisma.brand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return jsonOk({ brands });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const base = slugify(parsed.data.slug ? parsed.data.slug : parsed.data.name);
  if (!base) return jsonError("Invalid slug", 400);
  const slug = await ensureUniqueBrandSlug(base);

  const created = await prisma.brand.create({
    data: {
      name: parsed.data.name,
      slug,
      logoUrl: parsed.data.logoUrl ?? null,
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder,
    },
    select: { id: true, name: true, slug: true, isActive: true, sortOrder: true },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_BRAND_CREATE",
    entity: "Brand",
    entityId: created.id,
    meta: { name: created.name, slug: created.slug, isActive: created.isActive, sortOrder: created.sortOrder },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ brand: created }, { status: 201 });
}
