import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "en";
  return buildMetadata({
    title: "Gift Guides & Blog",
    description:
      "Gift guides, craft notes and curated drops for Noida, Greater Noida, New Delhi and Delhi NCR shoppers looking for meaningful gifts.",
    path: `/${locale}/blog`,
  });
}

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
    <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-72 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[44px] border border-border/80 bg-card/75 p-6 shadow-premium backdrop-blur-xl md:p-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <div className="inline-flex rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Gift Journal</div>
            <h1 className="mt-4 font-heading text-4xl tracking-tight text-foreground md:text-6xl">Stories for meaningful gifting</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Gift guides, craft stories, styling inspiration and thoughtful ideas for celebrations.
            </p>
          </div>
          <div className="rounded-[28px] border border-border bg-background/65 p-5 shadow-sm">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Latest reads</div>
            <div className="mt-2 font-heading text-3xl text-foreground">{posts.length}</div>
            <p className="mt-1 text-sm text-muted-foreground">published gifting articles</p>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="mt-10 rounded-[34px] border border-dashed border-border bg-card/80 p-10 text-center shadow-sm">
          <div className="font-heading text-2xl text-foreground">No stories yet</div>
          <p className="mt-2 text-sm text-muted-foreground">New gifting guides and craft stories will appear here.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/${lang}/blog/${p.slug}`}
              className="group relative overflow-hidden rounded-[32px] border border-border/80 bg-card/80 p-5 shadow-[0_18px_55px_rgba(47,38,34,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:border-primary/25 hover:shadow-premium"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
              {p.coverImageUrl ? (
                <img
                  src={p.coverImageUrl}
                  alt={p.title}
                  className="relative h-44 w-full rounded-[24px] border border-border object-cover transition duration-500 group-hover:scale-[1.02]"
                />
              ) : null}
              <div className="relative mt-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Gift Guide</div>
              <div className="relative mt-2 font-heading text-xl tracking-tight text-foreground transition group-hover:text-primary">{p.title}</div>
              <div className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                {p.excerpt}
              </div>
              <div className="relative mt-5 text-sm font-semibold text-primary">Read story</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
