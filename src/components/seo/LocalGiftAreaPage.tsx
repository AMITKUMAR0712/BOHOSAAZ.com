import Link from "next/link";
import { SITE } from "@/lib/seo/config";
import { absoluteUrl } from "@/lib/seo/assert";
import { breadcrumbJsonLd, faqPageJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  LOCAL_GIFT_AREAS,
  localGiftPath,
  type LocalGiftArea,
} from "@/lib/seo/local-areas";

export function LocalGiftAreaPage({
  lang,
  area,
}: {
  lang: string;
  area: LocalGiftArea;
}) {
  const pagePath = localGiftPath(area.slug, lang);
  const otherAreas = LOCAL_GIFT_AREAS.filter((item) => item.slug !== area.slug);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <JsonLd
        data={[
          webPageJsonLd({
            name: area.headline,
            description: area.intro,
            path: pagePath,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: `/${lang}` },
            { name: `Gifts in ${area.name}`, path: pagePath },
          ]),
          faqPageJsonLd(area.faqs, absoluteUrl(pagePath)),
        ]}
      />

      <section className="relative overflow-hidden rounded-[40px] border border-border/80 bg-card/80 p-6 shadow-premium backdrop-blur-xl md:p-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Local gifting · {area.regionLabel}
          </div>
          <h1 className="mt-3 max-w-3xl font-heading text-4xl tracking-tight text-foreground md:text-6xl">
            {area.headline}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {area.intro}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/${lang}/shop`}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:-translate-y-px hover:brightness-95"
            >
              Shop gifts
            </Link>
            <Link
              href={`/${lang}/faq`}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background/70 px-6 text-sm font-semibold text-foreground transition hover:bg-muted/40"
            >
              Gift FAQs
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="font-heading text-2xl tracking-tight text-foreground md:text-3xl">
          {area.whyTitle}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
          {area.whyBody} Filter by occasion, budget and category, then checkout with clear delivery
          and return details on every product.
        </p>
        <ul className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          {area.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/${lang}/categories`}
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-background/70 px-4 text-sm font-medium hover:bg-muted/40"
          >
            Browse categories
          </Link>
          <Link
            href={`/${lang}/blog`}
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-background/70 px-4 text-sm font-medium hover:bg-muted/40"
          >
            Gift guides
          </Link>
          <Link
            href={`/${lang}/contact`}
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-background/70 px-4 text-sm font-medium hover:bg-muted/40"
          >
            Contact {SITE.name}
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl tracking-tight text-foreground md:text-3xl">
          Other service areas
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {otherAreas.map((item) => (
            <Link
              key={item.slug}
              href={localGiftPath(item.slug, lang)}
              className="inline-flex h-10 items-center rounded-2xl border border-border bg-background/70 px-4 text-sm font-medium hover:bg-muted/40"
            >
              Gifts in {item.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4">
        <h2 className="font-heading text-2xl tracking-tight text-foreground md:text-3xl">
          {area.name} gift FAQs
        </h2>
        {area.faqs.map((faq, index) => (
          <details
            key={faq.question}
            className="group rounded-[28px] border border-border/80 bg-card/80 p-5 shadow-sm backdrop-blur transition open:shadow-premium"
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="font-heading text-xl text-foreground">{faq.question}</span>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background/70 text-primary transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {faq.answer}
            </p>
          </details>
        ))}
      </section>
    </main>
  );
}
