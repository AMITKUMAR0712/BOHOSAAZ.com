import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Blog | Bohosaaz",
  description: "Stories, craft notes, and curated drops from Bohosaaz.",
};

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) throw new Error("Invalid locale");

  const postsRaw = await prisma.blogPost.findMany({
    where: {
      isPublished: true,
      OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImageUrl: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  const posts = postsRaw.map((p) => ({
    ...p,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="rounded-4xl border border-border bg-card/70 backdrop-blur-xl p-6 md:p-10 shadow-premium">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Blog</div>
        <h1 className="mt-3 font-heading text-4xl md:text-5xl tracking-tight">Craft stories</h1>
        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
          Artisan spotlights, styling guides, and behind-the-scenes stories.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="mt-10 rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6 text-sm text-muted-foreground">
          No posts yet.
        </div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/${lang}/blog/${p.slug}`}
              className="group rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)] hover:shadow-[0_24px_75px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition"
            >
              {p.coverImageUrl ? (
                <img
                  src={p.coverImageUrl}
                  alt={p.title}
                  className="h-40 w-full rounded-2xl object-cover border border-border"
                />
              ) : null}
              <div className="mt-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Article</div>
              <div className="mt-2 font-heading text-xl group-hover:text-primary transition">{p.title}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {p.excerpt}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
