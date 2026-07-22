import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "About Us — Gift Shop Noida & Delhi NCR",
  description:
    "Learn about Bohosaaz, a premium online gifting marketplace for Noida, Greater Noida, New Delhi and Delhi NCR with curated gifts and festival hampers.",
  path: "/en/about",
});

export default function AboutPage() {
  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[44px] border border-border/80 bg-card/75 p-6 shadow-premium backdrop-blur-xl md:p-10">
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-muted/60 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Our story
          </div>
          <h1 className="mt-4 max-w-3xl font-heading text-4xl tracking-tight text-foreground md:text-6xl">
          The Art of Meaningful Gifting: Moments wrapped in the warmth of love.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          At Bohosaaz, we believe gifts are more than products, they are expressions of love, gratitude, and celebration. That&apos;s why we partner with talented artisans and independent creators, helping their craftsmanship reach those seeking gifts with purpose and meaning.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Since</div>
              <div className="mt-2 font-heading text-2xl">Thoughtfully Curated</div>
              <div className="mt-1 text-sm text-muted-foreground">Handpicked gifts to make your special moments worthwhile.</div>
            </div>
            <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Vendors</div>
              <div className="mt-2 font-heading text-2xl">Verified Vendors</div>
              <div className="mt-1 text-sm text-muted-foreground">Every seller is carefully vetted to ensure authenticity and craftsmanship</div>
            </div>
            <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Trust</div>
              <div className="mt-2 font-heading text-2xl">Secure Shopping</div>
              <div className="mt-1 text-sm text-muted-foreground">seamless shopping experience backed by secure checkout and responsive support </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Multi-vendor</div>
          <div className="mt-2 font-heading text-xl">Making Every Ocassion Meaningful</div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Every collection is carefully assembled focusing on ocassions, emotions and meaningful gifting.
          </p>
        </div>

        <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Pricing</div>
          <div className="mt-2 font-heading text-xl">Effortless Gift Selection
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Refine your search by occasion, personality, budget, or recipient to find the perfect match.
          </p>
        </div>

        <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Support</div>
          <div className="mt-2 font-heading text-xl">Trusted support</div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Clear order flow, tracking and help pages keep your gifting experience stress-free.
          </p>
        </div>
      </div>
    </div>
  );
}
