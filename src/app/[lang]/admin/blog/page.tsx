import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import BlogClient from "./BlogClient";

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export default async function AdminBlogPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { lang } = await params;

  const rowsRaw = await prisma.blogPost.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 50,
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

  const rows = rowsRaw.map((p) => ({
    ...p,
    tags: normalizeTags(p.tags),
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <BlogClient lang={lang} initialPosts={rows} />;
}
