import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo/metadata";
import { STOREFRONT_FAQS } from "@/lib/seo/faqs";
import { faqPageJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/seo/assert";
import { JsonLd } from "@/components/seo/JsonLd";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "en";
  return buildMetadata({
    title: "FAQ — Gift Delivery & Orders",
    description:
      "Answers about gift products, online gifting in Noida, Greater Noida, New Delhi and Delhi NCR, shipping, returns, orders and seller support.",
    path: `/${locale}/faq`,
  });
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return notFound();

  const faqs = STOREFRONT_FAQS.map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <JsonLd data={faqPageJsonLd(faqs, absoluteUrl(`/${lang}/faq`))} />

      <section className="relative overflow-hidden rounded-[40px] border border-border/80 bg-card/80 p-6 shadow-premium backdrop-blur-xl md:p-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Help Center</div>
          <h1 className="mt-3 max-w-3xl font-heading text-4xl tracking-tight text-foreground md:text-6xl">
            Frequently asked questions.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Quick answers for gifting in Noida & Delhi NCR, shipping, returns, order tracking and seller support.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/${lang}/shop`}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:-translate-y-px hover:brightness-95"
            >
              Shop Gifts
            </Link>
            <Link
              href={`/${lang}/contact`}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background/70 px-6 text-sm font-semibold text-foreground transition hover:bg-muted/40"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4">
        {faqs.map((faq, index) => (
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
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">{faq.answer}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
