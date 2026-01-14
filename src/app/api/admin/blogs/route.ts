import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

const listSchema = z.object({
  take: z.coerce.number().int().min(5).max(100).default(50),
});

const createSchema = z.object({
  slug: z.string().trim().min(1).max(191),
  title: z.string().trim().min(1).max(191),
  excerpt: z.string().trim().min(1).max(2000),
  body: z.string().trim().min(1).max(200000),
  coverImageUrl: z.string().trim().url().max(2048).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).optional(),
  isPublished: z.coerce.boolean().optional().default(false),
});

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = listSchema.safeParse({ take: url.searchParams.get("take") ?? undefined });
  if (!parsed.success) return jsonError("Invalid query", 400);

  const rows = await prisma.blogPost.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: parsed.data.take,
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

  return jsonOk({
    posts: rows.map((p) => ({
      ...p,
      tags: normalizeTags(p.tags),
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const data = parsed.data;
  const now = new Date();

  const created = await prisma.$transaction(async (tx) => {
    const post = await tx.blogPost.create({
      data: {
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        body: data.body,
        coverImageUrl: data.coverImageUrl ?? null,
        tags: data.tags ?? [],
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? now : null,
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
        action: "BLOG_CREATE",
        entity: "BlogPost",
        entityId: post.id,
        meta: { slug: post.slug, isPublished: post.isPublished },
      },
    });

    return post;
  });

  return jsonOk(
    {
      post: {
        ...created,
        tags: normalizeTags(created.tags),
        publishedAt: created.publishedAt ? created.publishedAt.toISOString() : null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
