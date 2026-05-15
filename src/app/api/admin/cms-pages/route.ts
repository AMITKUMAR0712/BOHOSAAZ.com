import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

const listSchema = z.object({
  take: z.coerce.number().int().min(5).max(100).default(50),
});

const createSchema = z.object({
  slug: z.string().trim().min(1).max(191),
  title: z.string().trim().min(1).max(191),
  content: z.string().trim().min(1).max(500_000),
});

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = listSchema.safeParse({ take: url.searchParams.get("take") ?? undefined });
  if (!parsed.success) return jsonError("Invalid query", 400);

  const rows = await prisma.cmsPage.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: parsed.data.take,
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

  return jsonOk({
    pages: rows.map((p) => ({
      ...p,
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

  const created = await prisma.$transaction(async (tx) => {
    const page = await tx.cmsPage.create({
      data: {
        slug: data.slug,
        title: data.title,
        content: data.content,
        version: 1,
        versions: {
          create: {
            version: 1,
            title: data.title,
            content: data.content,
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
        action: "CMS_PAGE_CREATE",
        entity: "CmsPage",
        entityId: page.id,
        meta: { slug: page.slug, version: page.version },
      },
    });

    return page;
  });

  return jsonOk(
    {
      page: {
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
