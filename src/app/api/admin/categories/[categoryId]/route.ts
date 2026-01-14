import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ categoryId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { categoryId } = await ctx.params;
  if (!categoryId) return jsonError("Missing categoryId", 400);

  const body = await req.json().catch(() => null);

  const parsed = z
    .object({
      name: z.string().trim().min(2).optional(),
      slug: z.string().trim().min(2).optional(),
      iconName: z.string().trim().max(128).optional(),
      iconUrl: z.string().trim().max(2048).optional(),
    })
    .safeParse(body);

  if (!parsed.success) return jsonError("Invalid input", 400);

  const wantsToClearIconName = parsed.data.iconName === "";
  const wantsToClearIconUrl = parsed.data.iconUrl === "";
  const hasIconNameChange = parsed.data.iconName !== undefined;
  const hasIconUrlChange = parsed.data.iconUrl !== undefined;

  if (
    !parsed.data.name &&
    !parsed.data.slug &&
    !hasIconNameChange &&
    !hasIconUrlChange
  ) {
    return jsonError("No changes", 400);
  }

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: {
      name: parsed.data.name ?? undefined,
      slug: parsed.data.slug ?? undefined,
      iconName: hasIconNameChange
        ? wantsToClearIconName
          ? null
          : parsed.data.iconName
        : undefined,
      iconUrl: hasIconUrlChange
        ? wantsToClearIconUrl
          ? null
          : parsed.data.iconUrl
        : undefined,
    },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_CATEGORY_UPDATE",
    entity: "Category",
    entityId: updated.id,
    meta: { name: updated.name, slug: updated.slug },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ category: updated });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ categoryId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { categoryId } = await ctx.params;
  if (!categoryId) return jsonError("Missing categoryId", 400);

  // safety: block delete if products exist
  const count = await prisma.product.count({ where: { categoryId } });
  if (count > 0) return jsonError("Category has products", 409);

  await prisma.category.delete({ where: { id: categoryId } });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_CATEGORY_DELETE",
    entity: "Category",
    entityId: categoryId,
    meta: { categoryId },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ ok: true });
}
