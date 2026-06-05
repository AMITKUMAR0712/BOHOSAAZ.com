import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Bohosaaz | Gift Products in Noida & Delhi NCR",
  description:
    "Learn about Bohosaaz, a premium online gifting marketplace for Noida, Greater Noida, New Delhi and Delhi NCR with curated birthday gifts, anniversary gifts, corporate gifts and festival hampers.",
  keywords: ["about Bohosaaz", "gift products Noida", "online gifts Delhi NCR", "premium gifting marketplace"],
};

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
            Crafted heritage, curated for meaningful gifting.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Bohosaaz brings together handcrafted pieces, premium hampers, decor and keepsakes for people who want gifts to feel thoughtful, personal and celebration-ready.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Since</div>
              <div className="mt-2 font-heading text-2xl">Curated</div>
              <div className="mt-1 text-sm text-muted-foreground">Gift-first collections for every moment.</div>
            </div>
            <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Vendors</div>
              <div className="mt-2 font-heading text-2xl">Verified</div>
              <div className="mt-1 text-sm text-muted-foreground">Trusted vendors and thoughtful quality.</div>
            </div>
            <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Trust</div>
              <div className="mt-2 font-heading text-2xl">Secure</div>
              <div className="mt-1 text-sm text-muted-foreground">Safe checkout and reliable support.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Multi-vendor</div>
          <div className="mt-2 font-heading text-xl">Built for gifting</div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Every collection is shaped around occasions, emotions and people, not just product types.
          </p>
        </div>

        <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Pricing</div>
          <div className="mt-2 font-heading text-xl">Premium discovery</div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Filters by occasion, budget, style and recipient make it easier to choose the right gift.
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

      <div className="mt-10 rounded-4xl border border-border bg-muted/15 p-6 md:p-10">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">What we stand for</div>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6">
            <div className="font-heading text-xl">Craft first</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              We prioritize authentic, handmade products and small-batch production.
            </p>
          </div>
          <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6">
            <div className="font-heading text-xl">Premium experience</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              A clean, modern storefront with role-aware panels that scale for production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
