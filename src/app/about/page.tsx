import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Bohosaaz",
  description: "The story behind Bohosaaz — a premium marketplace for handcrafted goods.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="relative overflow-hidden rounded-4xl border border-border bg-card/70 backdrop-blur-xl p-6 md:p-10 shadow-premium">
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-muted/60 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Our story
          </div>
          <h1 className="mt-4 font-heading text-4xl md:text-5xl tracking-tight text-foreground">
            Crafted heritage, curated for today
          </h1>
          <p className="mt-4 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
            Bohosaaz is a multi-vendor marketplace for authentic handcrafted goods — built for a premium
            shopping experience with transparent pricing, trusted sellers, and reliable fulfillment.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Since</div>
              <div className="mt-2 font-heading text-2xl">2009</div>
              <div className="mt-1 text-sm text-muted-foreground">A decade of craft-first curation.</div>
            </div>
            <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Vendors</div>
              <div className="mt-2 font-heading text-2xl">Verified</div>
              <div className="mt-1 text-sm text-muted-foreground">Role-based access + approvals.</div>
            </div>
            <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Trust</div>
              <div className="mt-2 font-heading text-2xl">Secure</div>
              <div className="mt-1 text-sm text-muted-foreground">Production-ready architecture.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Multi-vendor</div>
          <div className="mt-2 font-heading text-xl">Built for makers</div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Vendors manage products, images, variants, and fulfillment from their dashboard.
          </p>
        </div>

        <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Pricing</div>
          <div className="mt-2 font-heading text-xl">Transparent deals</div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            MRP, sale pricing, and savings are displayed clearly across product cards and pages.
          </p>
        </div>

        <div className="rounded-[28px] border border-border bg-card/80 backdrop-blur-xl p-6 shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Support</div>
          <div className="mt-2 font-heading text-xl">Reliable resolution</div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Structured workflows and support tickets keep orders and communication traceable.
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
