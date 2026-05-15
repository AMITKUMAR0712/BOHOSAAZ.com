import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return { title: "Blog | Bohosaaz" };

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, isPublished: true, publishedAt: true },
  });

  if (!post || !post.isPublished) return { title: "Blog | Bohosaaz" };

  return {
    title: `${post.title} | Bohosaaz`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) throw new Error("Invalid locale");

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      body: true,
      coverImageUrl: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  if (!post || !post.isPublished) notFound();
  if (post.publishedAt && post.publishedAt > new Date()) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <div className="rounded-4xl border border-border bg-card/70 backdrop-blur-xl p-6 md:p-10 shadow-premium">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Blog</div>
        <h1 className="mt-3 font-heading text-3xl md:text-5xl tracking-tight">{post.title}</h1>
        <p className="mt-4 text-sm md:text-base text-muted-foreground">{post.excerpt}</p>

        {post.coverImageUrl ? (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="mt-6 h-56 md:h-80 w-full rounded-3xl object-cover border border-border"
          />
        ) : null}
      </div>

      <div className="mt-8 rounded-4xl border border-border bg-card/80 backdrop-blur-xl p-6 md:p-8">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {post.body}
          </div>
        </div>
      </div>
    </div>
  );
}
