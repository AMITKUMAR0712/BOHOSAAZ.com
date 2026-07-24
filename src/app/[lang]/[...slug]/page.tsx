import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo/metadata";
import { normalizeCmsSlug } from "@/lib/cmsSlug";

type PageProps = {
  params: Promise<{ lang: string; slug: string[] }>;
};

function decodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function cmsSlugFromParams(slug: string[]) {
  return normalizeCmsSlug(slug.map(decodeSegment).join("/"));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};

  const cmsSlug = cmsSlugFromParams(slug);
  if (!cmsSlug) return {};

  const page = await prisma.cmsPage.findUnique({
    where: { slug: cmsSlug },
    select: { title: true },
  });
  if (!page) return {};

  return buildMetadata({
    title: page.title.replace(/\s*\|\s*Bohosaaz$/i, "").replace(/\s*•\s*Bohosaaz$/i, ""),
    description: `${page.title} — Bohosaaz`,
    path: `/${lang}/${cmsSlug}`,
  });
}

export default async function CmsCatchAllPage({ params }: PageProps) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) redirect("/en");

  const cmsSlug = cmsSlugFromParams(slug);
  if (!cmsSlug) notFound();

  // Hardcoded routes own these exact paths; keep catch-all out of their way.
  if (cmsSlug === "about" || cmsSlug === "terms" || cmsSlug === "privacy") {
    redirect(`/${lang}/${cmsSlug}`);
  }

  const page = await prisma.cmsPage.findUnique({
    where: { slug: cmsSlug },
    select: { title: true, content: true },
  });

  if (!page) notFound();

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[44px] border border-border/80 bg-card/75 p-6 shadow-premium backdrop-blur-xl md:p-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Page
          </div>
          <h1 className="mt-4 max-w-3xl font-heading text-4xl tracking-tight text-foreground md:text-6xl">
            {page.title}
          </h1>
          <div className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground md:text-base">
            {page.content}
          </div>
        </div>
      </div>
    </div>
  );
}
