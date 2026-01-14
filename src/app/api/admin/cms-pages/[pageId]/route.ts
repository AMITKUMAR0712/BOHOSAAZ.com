import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

const patchSchema = z.object({
  slug: z.string().trim().min(1).max(191).optional(),
  title: z.string().trim().min(1).max(191).optional(),
  content: z.string().trim().min(1).max(500_000).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ pageId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { pageId } = await ctx.params;
  if (!pageId) return jsonError("Missing pageId", 400);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const existing = await prisma.cmsPage.findUnique({
    where: { id: pageId },
    select: { id: true, slug: true, title: true, content: true, version: true },
  });
  if (!existing) return jsonError("Not found", 404);

  const nextVersion = existing.version + 1;
  const nextSlug = parsed.data.slug ?? existing.slug;
  const nextTitle = parsed.data.title ?? existing.title;
  const nextContent = parsed.data.content ?? existing.content;

  const updated = await prisma.$transaction(async (tx) => {
    const page = await tx.cmsPage.update({
      where: { id: pageId },
      data: {
        slug: nextSlug,
        title: nextTitle,
        content: nextContent,
        version: nextVersion,
        versions: {
          create: {
            version: nextVersion,
            title: nextTitle,
            content: nextContent,
            createdBy: admin.id,
          },
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "CMS_PAGE_UPDATE",
        entity: "CmsPage",
        entityId: page.id,
        meta: { slug: page.slug, version: page.version },
      },
    });

    return page;
  });

  return jsonOk({
    page: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ pageId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { pageId } = await ctx.params;
  if (!pageId) return jsonError("Missing pageId", 400);

  const existing = await prisma.cmsPage.findUnique({
    where: { id: pageId },
    select: { id: true, slug: true, version: true },
  });
  if (!existing) return jsonError("Not found", 404);

  await prisma.$transaction(async (tx) => {
    await tx.cmsPage.delete({ where: { id: pageId } });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "CMS_PAGE_DELETE",
        entity: "CmsPage",
        entityId: existing.id,
        meta: { slug: existing.slug, version: existing.version },
      },
    });
  });

  return jsonOk({ deleted: true });
}
