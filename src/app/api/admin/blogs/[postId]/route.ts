import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

const patchSchema = z.object({
  slug: z.string().trim().min(1).max(191).optional(),
  title: z.string().trim().min(1).max(191).optional(),
  excerpt: z.string().trim().min(1).max(2000).optional(),
  body: z.string().trim().min(1).max(200000).optional(),
  coverImageUrl: z.string().trim().url().max(2048).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).optional(),
  isPublished: z.coerce.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ postId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { postId } = await ctx.params;
  if (!postId) return jsonError("Missing postId", 400);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const existing = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, isPublished: true, publishedAt: true },
  });
  if (!existing) return jsonError("Not found", 404);

  const now = new Date();
  const nextIsPublished = parsed.data.isPublished ?? existing.isPublished;
  const nextPublishedAt = nextIsPublished
    ? existing.publishedAt ?? now
    : null;

  const updated = await prisma.$transaction(async (tx) => {
    const post = await tx.blogPost.update({
      where: { id: postId },
      data: {
        slug: parsed.data.slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt,
        body: parsed.data.body,
        coverImageUrl: parsed.data.coverImageUrl,
        ...(parsed.data.tags !== undefined ? { tags: parsed.data.tags } : {}),
        isPublished: nextIsPublished,
        publishedAt: nextPublishedAt,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        body: true,
        coverImageUrl: true,
        tags: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "BLOG_UPDATE",
        entity: "BlogPost",
        entityId: post.id,
        meta: { isPublished: post.isPublished },
      },
    });

    return post;
  });

  return jsonOk({
    post: {
      ...updated,
      tags: normalizeTags(updated.tags),
      publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ postId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { postId } = await ctx.params;
  if (!postId) return jsonError("Missing postId", 400);

  const existing = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, slug: true, isPublished: true },
  });
  if (!existing) return jsonError("Not found", 404);

  await prisma.$transaction(async (tx) => {
    await tx.blogPost.delete({ where: { id: postId } });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "BLOG_DELETE",
        entity: "BlogPost",
        entityId: existing.id,
        meta: { slug: existing.slug, isPublished: existing.isPublished },
      },
    });
  });

  return jsonOk({ deleted: true });
}
