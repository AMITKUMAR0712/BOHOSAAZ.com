import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return jsonOk({ categories });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = z
    .object({
      name: z.string().trim().min(2),
      slug: z.string().trim().min(2).optional(),
      iconName: z.string().trim().max(128).optional(),
      iconUrl: z.string().trim().url().max(2048).optional(),
    })
    .safeParse(body);

  if (!parsed.success) return jsonError("Invalid input", 400);

  const name = parsed.data.name;
  const slug = parsed.data.slug ? parsed.data.slug : slugify(name);

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      iconName: parsed.data.iconName || undefined,
      iconUrl: parsed.data.iconUrl || undefined,
    },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_CATEGORY_CREATE",
    entity: "Category",
    entityId: category.id,
    meta: { name: category.name, slug: category.slug },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ category }, { status: 201 });
}
