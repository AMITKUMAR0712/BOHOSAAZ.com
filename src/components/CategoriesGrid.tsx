import Link from "next/link";
import IconByName from "@/components/IconByName";
import { ArrowUpRight, Gift, Sparkles } from "lucide-react";

export type CategoryGridItem = {
  id: string;
  name: string;
  slug: string;
  iconName?: string | null;
  iconUrl?: string | null;
};

const accents = [
  "from-primary/15 via-background to-muted/30",
  "from-amber-500/10 via-background to-muted/25",
  "from-rose-500/10 via-background to-muted/25",
  "from-emerald-500/10 via-background to-muted/25",
  "from-violet-500/10 via-background to-muted/25",
  "from-sky-500/10 via-background to-muted/25",
];

function CategoryIcon({ category }: { category: CategoryGridItem }) {
  if (category.iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={category.iconUrl}
        alt=""
        className="h-10 w-10 rounded-2xl bg-background/80 object-contain p-1.5 shadow-sm"
        loading="lazy"
      />
    );
  }

  return (
    <div className="h-12 w-12 rounded-2xl border border-border bg-background/80 grid place-items-center shadow-sm">
      <IconByName name={category.iconName ?? undefined} className="h-5 w-5 text-primary" />
    </div>
  );
}

export function CategoriesGrid({
  langPrefix,
  categories,
}: {
  langPrefix: string;
  categories: CategoryGridItem[];
}) {
  if (!categories.length) {
    return (
      <div className="rounded-[34px] border border-dashed border-border bg-card/80 px-6 py-12 text-center text-muted-foreground shadow-sm">
        No gift collections are available yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {categories.map((category, index) => (
        <Link
          key={category.id}
          href={`${langPrefix}/c/${encodeURIComponent(category.slug)}`}
          className={`group relative min-h-36 overflow-hidden rounded-[24px] border border-border/80 bg-linear-to-br ${
            accents[index % accents.length]
          } p-3 shadow-[0_18px_55px_rgba(47,38,34,0.06)] backdrop-blur transition duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-premium sm:min-h-48 sm:rounded-[32px] sm:p-5`}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
          <div className="absolute inset-x-5 bottom-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent opacity-0 transition group-hover:opacity-100" />
          <div className="relative flex items-start justify-between gap-3">
            <CategoryIcon category={category} />
            <div className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background/70 text-muted-foreground transition group-hover:border-primary/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="relative mt-4 font-heading text-base tracking-tight text-foreground group-hover:text-primary transition sm:mt-6 sm:text-xl">
            {category.name}
          </div>
          <div className="relative mt-2 hidden text-sm leading-relaxed text-muted-foreground sm:block">
            Explore curated gifts selected for celebrations, memories and premium moments.
          </div>
          <div className="relative mt-4 inline-flex items-center rounded-full bg-background/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-primary sm:mt-5 sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
            Shop collection
          </div>
        </Link>
      ))}
    </div>
  );
}

export function CategoriesPageHero() {
  return (
    <section className="relative overflow-hidden rounded-[42px] border border-border/80 bg-linear-to-br from-primary/10 via-card to-muted/25 p-6 shadow-premium md:p-12">
      <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -right-14 bottom-0 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_34%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
            <Gift className="h-3.5 w-3.5 text-primary" aria-hidden />
            Art of meaningful gifting
          </div>
          <h1 className="mt-4 font-heading text-3xl md:text-5xl tracking-tight text-foreground">
            Shop by Category
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Explore every collection in one place: personalized gifts, festive picks, decor, keepsakes and premium hampers curated for moments that matter.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              Artisan made
            </span>
            <span className="rounded-full border border-border bg-background/70 px-3 py-1">Gift ready</span>
            <span className="rounded-full border border-border bg-background/70 px-3 py-1">Premium quality</span>
          </div>
        </div>
        <div className="relative hidden lg:block">
          <div className="rounded-[34px] border border-border bg-background/65 p-6 shadow-[0_22px_70px_rgba(47,38,34,0.08)] backdrop-blur">
            <div className="grid gap-3">
              {["Explore curated collections", "Find premium handmade gifts", "Choose by style and occasion"].map((item) => (
                <div key={item} className="rounded-2xl border border-border bg-card/75 px-4 py-3 text-sm font-medium text-foreground">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
