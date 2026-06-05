import Link from "next/link";
import Image from "next/image";
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

const categoryArtFallbacks = [
  "/category-art/gift-hampers.webp",
  "/category-art/home-decor.webp",
  "/category-art/handmade.webp",
  "/category-art/lifestyle.webp",
  "/category-art/hospitality.webp",
  "/category-art/default-gift.webp",
];

function categoryArtFor(category: CategoryGridItem, index: number) {
  const key = `${category.name} ${category.slug}`.toLowerCase();

  if (/(jigger|stirrer|spoon|bar|cocktail|peg|measure)/.test(key)) return "/category-art/bar-tools.webp";
  if (/(copper|jug|pitcher|mug|serveware)/.test(key)) return "/category-art/copperware.webp";
  if (/(diya|diwali|festive|festival|pooja|aarti|decorative)/.test(key)) return "/category-art/festive-diya.webp";
  if (/(decor|vase|home|showpiece|candle|lamp)/.test(key)) return "/category-art/home-decor.webp";
  if (/(hamper|basket|combo|gift)/.test(key)) return "/category-art/gift-hampers.webp";
  if (/(handmade|artisan|craft|brass|wood|ethnic)/.test(key)) return "/category-art/handmade.webp";
  if (/(hospitality|hotel|restaurant|tray|table)/.test(key)) return "/category-art/hospitality.webp";
  if (/(lifestyle|beauty|wellness|perfume|personal)/.test(key)) return "/category-art/lifestyle.webp";

  return categoryArtFallbacks[index % categoryArtFallbacks.length];
}

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
      {categories.map((category, index) => {
        const art = categoryArtFor(category, index);

        return (
          <Link
            key={category.id}
            href={`${langPrefix}/c/${encodeURIComponent(category.slug)}`}
            className={`group relative min-h-68 overflow-hidden rounded-[26px] border border-border/80 bg-linear-to-br ${
              accents[index % accents.length]
            } shadow-[0_22px_70px_rgba(47,38,34,0.10)] backdrop-blur transition duration-500 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-premium sm:min-h-88 sm:rounded-[34px]`}
          >
            <Image
              src={art}
              alt={`${category.name} collection`}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-b from-black/0 via-black/6 to-[#2f1f18]/72" />
            <div className="absolute inset-0 bg-linear-to-br from-white/18 via-transparent to-primary/14 opacity-80" />
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/25 blur-3xl transition group-hover:bg-primary/25" />
            <div className="absolute inset-x-5 bottom-0 h-px bg-linear-to-r from-transparent via-primary-foreground/55 to-transparent opacity-0 transition group-hover:opacity-100" />

            <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-3 sm:left-5 sm:right-5 sm:top-5">
              <div className="rounded-2xl bg-background/78 p-1 shadow-sm ring-1 ring-white/45 backdrop-blur-xl">
                <CategoryIcon category={category} />
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-background/80 text-primary shadow-sm ring-1 ring-white/45 backdrop-blur-xl transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-primary group-hover:text-primary-foreground">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-3 text-primary-foreground sm:p-5">
              <div className="rounded-[22px] bg-background/88 p-3 text-foreground shadow-[0_16px_50px_rgba(0,0,0,0.16)] ring-1 ring-white/35 backdrop-blur-2xl sm:rounded-[28px] sm:p-4">
                <div className="font-heading text-base tracking-tight transition group-hover:text-primary sm:text-xl">
                  {category.name}
                </div>
                <div className="mt-2 hidden text-sm leading-relaxed text-muted-foreground sm:block">
                  Explore curated gifts selected for celebrations, memories and premium moments.
                </div>
                <div className="mt-3 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-primary sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
                  Shop collection
                </div>
              </div>
            </div>
          </Link>
        );
      })}
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
          <div className="relative min-h-88 overflow-hidden rounded-[34px] border border-border bg-background/65 p-4 shadow-[0_22px_70px_rgba(47,38,34,0.08)] backdrop-blur">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative grid h-full grid-cols-[0.82fr_1fr] gap-3">
              <div className="relative mt-10 overflow-hidden rounded-[28px] shadow-premium ring-1 ring-white/50">
                <Image
                  src="/category-art/festive-diya.webp"
                  alt="Festive gifting collection"
                  fill
                  sizes="280px"
                  className="object-cover"
                />
              </div>
              <div className="grid gap-3">
                <div className="relative min-h-40 overflow-hidden rounded-[28px] shadow-premium ring-1 ring-white/50">
                  <Image
                    src="/category-art/gift-hampers.webp"
                    alt="Premium gift hamper collection"
                    fill
                    sizes="360px"
                    className="object-cover"
                  />
                </div>
                <div className="relative min-h-36 overflow-hidden rounded-[28px] shadow-premium ring-1 ring-white/50">
                  <Image
                    src="/category-art/home-decor.webp"
                    alt="Home decor gift collection"
                    fill
                    sizes="360px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
