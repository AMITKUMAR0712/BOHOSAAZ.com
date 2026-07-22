import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo/metadata";
import { fitDescription } from "@/lib/seo/assert";
import { SITE } from "@/lib/seo/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = isLocale(lang) ? lang : "en";

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      coverImageUrl: true,
      isPublished: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  if (!post || !post.isPublished) {
    return buildMetadata({
      title: "Blog Post",
      description: "Gift guides and ideas from Bohosaaz.",
      path: `/${locale}/blog/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: post.title,
    description: fitDescription(post.excerpt || SITE.description),
    path: `/${locale}/blog/${slug}`,
    image: post.coverImageUrl || undefined,
    type: "article",
    dynamicOg: !post.coverImageUrl,
    ogType: "blog",
    publishedTime: post.publishedAt?.toISOString(),
    modifiedTime: post.updatedAt.toISOString(),
  });
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
    <div className="relative mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-72 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[44px] border border-border/80 bg-card/75 p-6 shadow-premium backdrop-blur-xl md:p-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative inline-flex rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Gift Journal
        </div>
        <h1 className="relative mt-4 font-heading text-3xl tracking-tight text-foreground md:text-5xl">{post.title}</h1>
        <p className="relative mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">{post.excerpt}</p>

        {post.coverImageUrl ? (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="relative mt-8 h-60 w-full rounded-[30px] border border-border object-cover shadow-[0_20px_60px_rgba(47,38,34,0.10)] md:h-96"
          />
        ) : null}
      </div>

      <div className="relative mt-8 rounded-[36px] border border-border/80 bg-card/85 p-6 shadow-[0_18px_60px_rgba(47,38,34,0.06)] backdrop-blur-xl md:p-8">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap text-sm leading-7 text-foreground md:text-base">
            {post.body}
          </div>
        </div>
      </div>
    </div>
  );
}
