import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { BannerCarousel, type HomeBanner } from "@/components/BannerCarousel";
import { AdSlot } from "@/components/ads/AdSlot";
import IconByName from "@/components/IconByName";
import { DEFAULT_OCCASION_OPTIONS, DEFAULT_RECIPIENT_OPTIONS } from "@/lib/shopFilters";
import { formatPriceInCurrency } from "@/lib/currency-utils";
import { AutoScrollRow } from "@/components/AutoScrollRow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Gift Products in Noida, Greater Noida & Delhi NCR | Bohosaaz",
  description:
    "Bohosaaz is a premium online gifting store for Noida, Greater Noida, New Delhi and Delhi NCR. Shop birthday gifts, anniversary gifts, corporate gifts, festival gifts, barware, home decor and curated gift hampers.",
  keywords: [
    "gift products in Noida",
    "gift products in Greater Noida",
    "gift products in New Delhi",
    "gift products in Delhi NCR",
    "online gifts Noida",
    "birthday gifts Delhi NCR",
    "anniversary gifts Greater Noida",
    "corporate gifts New Delhi",
    "premium gift hampers Noida",
    "Bohosaaz gifts",
  ],
};

type Category = {
  id: string;
  name: string;
  slug?: string;
  position?: number;
  iconName?: string | null;
  iconUrl?: string | null;
};
type ProductImage = { url: string; isPrimary?: boolean };
type Product = {
  id: string;
  title: string;
  slug: string;
  currency: "INR" | "USD";
  mrp?: number | null;
  price: number;
  salePrice?: number | null;
  createdAt?: string;
  images?: ProductImage[];
  vendorId?: string | null;
  vendor?: { id?: string | null } | null;
};

type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandType: string;
};

/* ✅ Premium Chip */
function Chip({
  label,
  className,
  dotClassName,
}: {
  label: string;
  className?: string;
  dotClassName?: string;
}) {
  return (
    <span
      className={
        className ??
        "inline-flex items-center rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur hover:bg-background/75 transition"
      }
    >
      <span
        className={
          dotClassName ??
          "mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary/70"
        }
      />
      {label}
    </span>
  );
}

/* ✅ Filter Chip (clickable) */
function FilterChip({
  label,
  href,
  className,
  closeClassName,
}: {
  label: string;
  href: string;
  className?: string;
  closeClassName?: string;
}) {
  return (
    <a
      href={href}
      className={
        className ??
        "group inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur shadow-sm hover:shadow-md hover:bg-card/75 transition"
      }
      title="Remove filter"
    >
      {label}
      <span
        className={
          closeClassName ??
          "h-4 w-4 rounded-full grid place-items-center border border-border bg-background/70 text-[10px] opacity-70 group-hover:opacity-100 transition"
        }
      >
        ×
      </span>
    </a>
  );
}

/* ✅ Premium Divider */
function Divider({ className, glowClassName }: { className?: string; glowClassName?: string }) {
  return (
    <div className={className ?? "my-10 relative"}>
      <div className="h-px w-full bg-linear-to-r from-transparent via-border to-transparent" />
      <div className={glowClassName ?? "absolute inset-x-0 -top-6 h-12 bg-primary/5 blur-2xl opacity-70"} />
    </div>
  );
}

/* ✅ Section Header */
function SectionHeader({
  eyebrow,
  title,
  actionHref,
  actionLabel,
  eyebrowClassName,
  titleClassName,
  actionClassName,
}: {
  eyebrow: string;
  title: string;
  actionHref?: string;
  actionLabel?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  actionClassName?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div
          className={
            eyebrowClassName ??
            "text-[11px] tracking-[0.22em] uppercase text-muted-foreground"
          }
        >
          {eyebrow}
        </div>
        <h2
          className={
            titleClassName ??
            "mt-2 font-heading text-2xl md:text-3xl tracking-tight text-foreground"
          }
        >
          {title}
        </h2>
      </div>

      {actionHref && actionLabel ? (
        <a
          href={actionHref}
          className={
            actionClassName ??
            "text-sm text-muted-foreground hover:text-foreground transition underline-offset-4 hover:underline"
          }
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}

function BrandMarquee({
  title,
  eyebrow,
  href,
  brands,
  duration,
}: {
  title: string;
  eyebrow: string;
  href: string;
  brands: Brand[];
  duration: string;
}) {
  const marqueeBrands = brands.length ? [...brands, ...brands] : [];

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-border/60 bg-transparent p-0">
      <div className="relative flex flex-col items-start gap-2.5 px-4 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/75">{eyebrow}</div>
          <h3 className="mt-2 max-w-52 font-heading text-3xl leading-tight tracking-tight text-foreground sm:max-w-none sm:text-4xl lg:text-[2.65rem]">
            {title}
          </h3>
        </div>
        <Link
          href={href}
          className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-primary/15 bg-card/80 px-3 text-[11px] font-semibold text-muted-foreground shadow-sm transition hover:border-primary/30 hover:bg-background/80 hover:text-primary sm:h-8 sm:px-3"
        >
          View all
        </Link>
      </div>

      {brands.length ? (
        <AutoScrollRow
          ariaLabel={title}
          className="mt-4 rounded-[24px] py-2"
          contentClassName="gap-4 py-2 sm:gap-5 lg:gap-6"
          step={340}
          speed={duration === "28s" ? 0.22 : 0.18}
        >
            {marqueeBrands.map((brand, index) => (
              <Link
                key={`${brand.id}-${index}`}
                href={href.replace(/\/brands\/(popular|luxury)$/, `/brand/${encodeURIComponent(brand.slug)}`)}
                className="group relative grid h-56 w-60 shrink-0 place-items-center overflow-hidden rounded-[28px] border border-border/70 bg-card/75 p-4 text-center shadow-[0_14px_38px_rgba(47,38,34,0.08)] transition hover:-translate-y-1 hover:border-primary/25 hover:bg-card hover:shadow-premium sm:h-64 sm:w-72 sm:p-5 lg:h-72 lg:w-80"
              >
                <div className="relative grid h-34 w-34 place-items-center overflow-hidden rounded-[24px] border border-border/60 bg-background/80 shadow-[0_12px_35px_rgba(47,38,34,0.08)] transition group-hover:scale-105 sm:h-40 sm:w-40 lg:h-44 lg:w-44">
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brand.logoUrl} alt={brand.name} className="h-28 w-28 object-contain sm:h-34 sm:w-34 lg:h-38 lg:w-38" />
                  ) : (
                    <span className="font-heading text-3xl text-primary sm:text-4xl">
                      {brand.name.trim().slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="relative mt-4 line-clamp-2 text-lg font-bold text-foreground transition group-hover:text-primary sm:text-xl">
                  {brand.name}
                </div>
              </Link>
            ))}
        </AutoScrollRow>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          No brands yet
        </div>
      )}
    </div>
  );
}

type MarqueeProduct = {
  id: string;
  title: string;
  slug: string;
  currency?: string;
  mrp?: number | null;
  price: number;
  salePrice?: number | null;
  createdAt?: string | Date;
  images?: ProductImage[];
  vendorId?: string | null;
  vendor?: { id?: string | null } | null;
};

function normalizeProductForCard(product: MarqueeProduct) {
  return {
    id: String(product.id),
    title: String(product.title || ""),
    slug: String(product.slug || ""),
    currency: (product.currency === "USD" ? "USD" : "INR") as "INR" | "USD",
    mrp: product.mrp == null ? null : Number(product.mrp),
    price: Number(product.price || 0),
    salePrice: product.salePrice == null ? null : Number(product.salePrice),
    createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt,
    images: Array.isArray(product.images) ? product.images : [],
    vendorId: product.vendorId ?? product.vendor?.id ?? null,
  };
}

function ProductMarquee({
  products,
  lang,
  duration,
  wrapperClassName,
}: {
  products: MarqueeProduct[];
  lang: string;
  duration: string;
  wrapperClassName?: string;
}) {
  const marqueeProducts = products.length ? [...products, ...products] : [];

  return (
    <AutoScrollRow
      ariaLabel={duration === "32s" ? "Featured products" : "Trending products"}
      className="mt-5 rounded-[30px] sm:mt-7"
      contentClassName="gap-3 py-2 sm:gap-5"
      step={300}
      speed={duration === "32s" ? 0.2 : 0.18}
      arrowClassName="top-[42%] sm:top-1/2"
    >
        {marqueeProducts.map((p, index) => (
          <div
            key={`${p.id}-${index}`}
            className={`w-[220px] shrink-0 sm:w-[255px] lg:w-[272px] ${
              wrapperClassName ?? "transition hover:-translate-y-1 hover:shadow-lg"
            }`}
          >
            <ProductCard
              langPrefix={`/${lang}`}
              enableImageSwipe
              product={normalizeProductForCard(p)}
            />
          </div>
        ))}
    </AutoScrollRow>
  );
}

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    redirect("/en");
  }

  const homeTheme = await (async () => {
    try {
      const s = await prisma.setting.findUnique({
        where: { key: "homeTheme" },
        select: { value: true },
      });
      const raw = s?.value;
      const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
      return v === "studio" ||
        v === "market" ||
        v === "commerce" ||
        v === "noir" ||
        v === "atlas" ||
        v === "heritage" ||
        v === "mono"
        ? v
        : "studio";
    } catch {
      return "studio";
    }
  })();

  const rootClassName =
    homeTheme === "studio"
      ? "min-h-screen bg-background overflow-hidden bg-linear-to-b from-background via-background to-muted/15"
      : homeTheme === "market"
        ? "min-h-screen bg-background overflow-hidden bg-linear-to-b from-primary/6 via-background to-muted/25"
        : homeTheme === "commerce"
          ? "min-h-screen bg-background overflow-hidden bg-linear-to-b from-muted/18 via-background to-muted/12"
          : homeTheme === "noir"
            ? "min-h-screen bg-background overflow-hidden bg-linear-to-b from-background via-background to-muted/40"
            : homeTheme === "atlas"
              ? "min-h-screen bg-background overflow-hidden"
              : homeTheme === "heritage"
                ? "min-h-screen bg-background overflow-hidden bg-linear-to-b from-primary/5 via-background to-muted/20"
                : "min-h-screen bg-background overflow-hidden bg-linear-to-b from-muted/20 via-background to-background";

  const heroBackdropClass =
    homeTheme === "studio"
      ? "absolute inset-0 bg-linear-to-b from-muted/35 via-background to-background"
      : homeTheme === "market"
        ? "absolute inset-0 bg-linear-to-b from-primary/16 via-background to-muted/30"
        : homeTheme === "commerce"
          ? "absolute inset-0 bg-linear-to-b from-muted/35 via-background to-background"
          : homeTheme === "noir"
            ? "absolute inset-0 bg-linear-to-b from-muted/65 via-background to-background"
            : homeTheme === "atlas"
              ? "absolute inset-0 bg-linear-to-b from-background via-background to-background"
              : homeTheme === "heritage"
                ? "absolute inset-0 bg-linear-to-b from-primary/14 via-background to-muted/25"
                : "absolute inset-0 bg-linear-to-b from-muted/45 via-background to-background";

  const heroTopBlobClass =
    homeTheme === "atlas"
      ? "hidden"
      : homeTheme === "mono"
        ? "absolute -top-44 left-1/2 h-110 w-110 -translate-x-1/2 rounded-full bg-muted/45 blur-3xl animate-[pulse_7s_ease-in-out_infinite]"
        : homeTheme === "commerce"
          ? "absolute -top-44 left-1/2 h-110 w-110 -translate-x-1/2 rounded-full bg-primary/18 blur-3xl animate-[pulse_7s_ease-in-out_infinite]"
          : homeTheme === "market"
            ? "absolute -top-44 left-1/2 h-110 w-110 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl animate-[pulse_7s_ease-in-out_infinite]"
            : homeTheme === "noir"
              ? "absolute -top-44 left-1/2 h-110 w-110 -translate-x-1/2 rounded-full bg-muted/55 blur-3xl animate-[pulse_7s_ease-in-out_infinite]"
              : homeTheme === "heritage"
                ? "absolute -top-44 left-1/2 h-110 w-110 -translate-x-1/2 rounded-full bg-primary/22 blur-3xl animate-[pulse_7s_ease-in-out_infinite]"
                : "absolute -top-44 left-1/2 h-110 w-110 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl animate-[pulse_7s_ease-in-out_infinite]";

  const heroBottomLeftBlobClass =
    homeTheme === "atlas"
      ? "hidden"
      : homeTheme === "studio"
        ? "absolute -bottom-48 -left-40 h-110 w-110 rounded-full bg-muted/45 blur-3xl animate-[pulse_8s_ease-in-out_infinite]"
        : homeTheme === "commerce"
          ? "absolute -bottom-48 -left-40 h-110 w-110 rounded-full bg-muted/55 blur-3xl animate-[pulse_8s_ease-in-out_infinite]"
          : homeTheme === "market"
            ? "absolute -bottom-48 -left-40 h-110 w-110 rounded-full bg-primary/12 blur-3xl animate-[pulse_8s_ease-in-out_infinite]"
            : homeTheme === "mono"
              ? "absolute -bottom-48 -left-40 h-110 w-110 rounded-full bg-muted/55 blur-3xl animate-[pulse_8s_ease-in-out_infinite]"
              : homeTheme === "heritage"
                ? "absolute -bottom-48 -left-40 h-110 w-110 rounded-full bg-muted/60 blur-3xl animate-[pulse_8s_ease-in-out_infinite]"
                : "absolute -bottom-48 -left-40 h-110 w-110 rounded-full bg-muted/70 blur-3xl animate-[pulse_8s_ease-in-out_infinite]";

  const heroDotsClass =
    homeTheme === "atlas"
      ? "absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[24px_24px]"
      : homeTheme === "mono"
        ? "absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[18px_18px]"
        : homeTheme === "commerce"
          ? "absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[16px_16px]"
          : homeTheme === "noir"
            ? "absolute inset-0 opacity-[0.09] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[22px_22px]"
            : "absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[22px_22px]";

  const heroRightCardClass =
    homeTheme === "studio"
      ? "rounded-[42px] border border-border bg-background/65 backdrop-blur-xl p-7 md:p-10 shadow-[0_26px_75px_rgba(0,0,0,0.10)]"
      : homeTheme === "market"
        ? "rounded-[22px] border border-border/70 bg-card/80 backdrop-blur-2xl p-7 md:p-10 shadow-[0_40px_130px_rgba(0,0,0,0.18)]"
        : homeTheme === "commerce"
          ? "rounded-2xl border-2 border-border bg-background p-7 md:p-10 shadow-sm"
          : homeTheme === "noir"
            ? "rounded-[42px] border border-border bg-foreground p-7 md:p-10 shadow-[0_42px_140px_rgba(0,0,0,0.22)]"
            : homeTheme === "atlas"
              ? "rounded-[16px] border-2 border-border bg-background p-7 md:p-10 shadow-sm"
              : homeTheme === "heritage"
                ? "rounded-[52px] border border-border bg-card/75 backdrop-blur-2xl p-7 md:p-10 shadow-[0_34px_110px_rgba(0,0,0,0.12)]"
                : "rounded-[18px] border border-border bg-card/70 backdrop-blur-xl p-7 md:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.12)]";

  const theme = (() => {
    type Tokens = {
      chip?: string;
      chipDot?: string;
      heroTitle?: string;
      heroSubtitle?: string;
      heroPrimaryCta?: string;
      heroSecondaryCta?: string;
      heroRightGlow?: string;
      heroRightRing?: string;
      heroCardEyebrow?: string;
      heroCardTitle?: string;
      heroCardBody?: string;
      heroStatCard?: string;
      heroStatValue?: string;
      heroStatLabel?: string;
      heroHighlightBox?: string;
      heroHighlightLine2?: string;
      heroSaleCta?: string;
      categorySection?: string;
      categoryPill?: string;
      filterSection?: string;
      filterShell?: string;
      filterSummaryHint?: string;
      filterInput?: string;
      filterSelect?: string;
      filterChip?: string;
      filterChipClose?: string;
      sectionEyebrow?: string;
      sectionTitle?: string;
      sectionAction?: string;
      dividerShell?: string;
      dividerGlow?: string;
      productWrapper?: string;
      brandsShell?: string;
      brandsGlow?: string;
      brandsDot?: string;
      emptyStateShell?: string;
    };

    const base: Tokens = {
      sectionEyebrow: "text-[11px] tracking-[0.22em] uppercase text-muted-foreground",
      sectionTitle: "mt-2 font-heading text-2xl md:text-3xl tracking-tight text-foreground",
      sectionAction:
        "text-sm text-muted-foreground hover:text-foreground transition underline-offset-4 hover:underline",
    };

    // Studio (editorial): round, airy, clean
    if (homeTheme === "studio") {
      return {
        ...base,
        chip:
          "inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-muted-foreground backdrop-blur hover:bg-background/80 transition",
        chipDot: "mr-2 inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40",
        heroTitle:
          "mt-7 font-heading text-4xl md:text-6xl tracking-tight text-foreground leading-[1.02]",
        heroSubtitle:
          "mt-5 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed",
        heroPrimaryCta:
          "h-12 inline-flex items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-[0_18px_45px_rgba(0,0,0,0.10)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.14)] hover:-translate-y-px transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroSecondaryCta:
          "h-12 inline-flex items-center justify-center rounded-full border border-border bg-background/75 px-8 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/30 hover:-translate-y-px transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroRightGlow:
          "absolute inset-0 -z-10 rounded-[56px] bg-linear-to-br from-muted/35 via-transparent to-muted/55 blur-2xl",
        heroRightRing: "absolute inset-0 -z-10 rounded-[56px] ring-1 ring-border/60",
        heroStatCard:
          "rounded-full border border-border bg-background/60 px-4 py-4 shadow-sm hover:shadow-md transition",
        categorySection: "mx-auto max-w-6xl px-4 py-9",
        categoryPill:
          "inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background/70 px-4 text-sm text-foreground hover:bg-muted/25 transition",
        filterShell:
          "group rounded-[44px] border border-border bg-card/65 backdrop-blur-2xl shadow-[0_18px_65px_rgba(0,0,0,0.06)]",
        brandsShell:
          "relative overflow-hidden rounded-[56px] border border-border bg-card/55 backdrop-blur-2xl shadow-[0_22px_90px_rgba(0,0,0,0.08)]",
      };
    }

    // Market (promo-first): tighter, squarer, stronger shadows
    if (homeTheme === "market") {
      return {
        ...base,
        chip:
          "inline-flex items-center rounded-xl border border-border bg-card/65 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur shadow-sm hover:bg-card/80 transition",
        chipDot: "mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary/70",
        heroPrimaryCta:
          "h-12 inline-flex items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-[0_18px_45px_rgba(0,0,0,0.14)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.18)] hover:-translate-y-px transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroSecondaryCta:
          "h-12 inline-flex items-center justify-center rounded-xl border border-border bg-background/75 px-8 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/40 hover:-translate-y-px transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroRightGlow:
          "absolute inset-0 -z-10 rounded-[22px] bg-linear-to-br from-primary/20 via-transparent to-muted/55 blur-2xl",
        heroRightRing: "absolute inset-0 -z-10 rounded-[22px] ring-1 ring-border/60",
        heroStatCard:
          "rounded-xl border border-border bg-background/65 px-4 py-4 shadow-sm hover:shadow-md hover:-translate-y-px transition",
        categoryPill:
          "inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/75 px-4 text-sm text-foreground shadow-sm hover:bg-muted/35 hover:-translate-y-px transition",
        filterShell:
          "group rounded-3xl border border-border bg-card/75 backdrop-blur-2xl shadow-[0_18px_65px_rgba(0,0,0,0.08)]",
        filterChip:
          "group inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground shadow-sm hover:shadow-md hover:bg-muted/35 transition",
        filterChipClose:
          "h-4 w-4 rounded-full grid place-items-center border border-border bg-background/70 text-[10px] opacity-70 group-hover:opacity-100 transition",
        productWrapper:
          "transition hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(0,0,0,0.18)]",
        brandsShell:
          "relative overflow-hidden rounded-[22px] border border-border bg-card/60 backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.08)]",
        brandsGlow: "absolute inset-0 bg-linear-to-br from-primary/8 via-transparent to-muted/30",
        brandsDot:
          "absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[22px_22px]",
      };
    }

    // Commerce (retail/catalog): boxed surfaces, compact controls, shopping-first
    if (homeTheme === "commerce") {
      return {
        ...base,
        chip:
          "inline-flex items-center rounded-md border border-border bg-muted/20 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-muted/30 transition",
        chipDot: "mr-2 inline-block h-1.5 w-1.5 rounded-sm bg-primary/80",
        heroTitle:
          "mt-6 font-heading text-3xl md:text-5xl tracking-tight text-foreground leading-[1.06]",
        heroSubtitle:
          "mt-4 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed",
        heroPrimaryCta:
          "h-12 inline-flex items-center justify-center rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroSecondaryCta:
          "h-12 inline-flex items-center justify-center rounded-lg border border-border bg-background px-8 text-sm font-semibold text-foreground hover:bg-muted/25 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroRightGlow:
          "absolute inset-0 -z-10 rounded-2xl bg-linear-to-br from-muted/35 via-transparent to-muted/55 blur-2xl",
        heroRightRing: "absolute inset-0 -z-10 rounded-2xl ring-1 ring-border/60",
        heroStatCard:
          "rounded-xl border border-border bg-background/85 px-4 py-4 shadow-sm hover:shadow-md transition",
        categorySection: "mx-auto max-w-6xl px-4 py-8",
        categoryPill:
          "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm text-foreground shadow-sm hover:shadow-md hover:bg-muted/15 transition",
        filterShell:
          "group rounded-2xl border-2 border-border bg-background shadow-sm",
        filterInput:
          "mt-2 h-12 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring transition",
        filterSelect:
          "mt-2 h-12 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring transition",
        filterChip:
          "group inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-muted/20 transition",
        filterChipClose:
          "h-4 w-4 rounded-sm grid place-items-center border border-border bg-background text-[10px] opacity-70 group-hover:opacity-100 transition",
        productWrapper: "transition hover:shadow-lg",
        brandsShell:
          "relative overflow-hidden rounded-2xl border-2 border-border bg-background shadow-sm",
        brandsDot:
          "absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[16px_16px]",
      };
    }
    // Noir (high-contrast): dark hero card + stronger textures
    if (homeTheme === "noir") {
      return {
        ...base,
        chip:
          "inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur hover:bg-background/65 transition",
        chipDot: "mr-2 inline-block h-1.5 w-1.5 rounded-full bg-foreground/45",
        heroRightGlow:
          "absolute inset-0 -z-10 rounded-[42px] bg-linear-to-br from-foreground/35 via-transparent to-muted/60 blur-2xl",
        heroRightRing: "absolute inset-0 -z-10 rounded-[42px] ring-1 ring-border/60",
        heroCardEyebrow: "text-[11px] tracking-[0.28em] uppercase text-background/70",
        heroCardTitle: "mt-2 font-heading text-2xl md:text-4xl tracking-tight text-background",
        heroCardBody: "mt-3 text-sm md:text-base text-background/75 leading-relaxed",
        heroStatCard:
          "rounded-2xl border border-background/10 bg-background/5 px-4 py-4 shadow-sm hover:bg-background/8 transition",
        heroStatValue: "font-heading text-xl text-background",
        heroStatLabel:
          "mt-1 text-[11px] uppercase tracking-[0.2em] text-background/70",
        heroHighlightBox:
          "mt-8 rounded-2xl border border-background/10 bg-background/6 px-4 py-3 text-center text-sm text-background/75 backdrop-blur",
        heroHighlightLine2: "mt-1 text-xs uppercase tracking-[0.18em] text-background",
        heroSaleCta:
          "mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-background/10 bg-background/8 px-6 py-3 text-sm font-semibold text-background hover:bg-background/12 hover:-translate-y-px transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        categorySection:
          "mx-auto max-w-6xl px-4 py-8 rounded-[44px] border border-border bg-background/50 backdrop-blur-xl",
        categoryPill:
          "inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-card/55 px-4 text-sm text-foreground hover:bg-muted/40 hover:-translate-y-px transition",
        filterShell:
          "group rounded-4xl border border-border bg-card/80 backdrop-blur-2xl shadow-[0_18px_65px_rgba(0,0,0,0.10)]",
        filterChip:
          "group inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur shadow-sm hover:shadow-md hover:bg-card/85 transition",
        filterChipClose:
          "h-4 w-4 rounded-full grid place-items-center border border-border bg-background/70 text-[10px] opacity-70 group-hover:opacity-100 transition",
        dividerGlow: "absolute inset-x-0 -top-6 h-12 bg-foreground/10 blur-2xl opacity-70",
        productWrapper:
          "transition hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(0,0,0,0.22)]",
        brandsShell:
          "relative overflow-hidden rounded-[44px] border border-border bg-card/70 backdrop-blur-2xl shadow-[0_22px_90px_rgba(0,0,0,0.12)]",
        brandsGlow: "absolute inset-0 bg-linear-to-br from-foreground/10 via-transparent to-muted/40",
        brandsDot:
          "absolute inset-0 opacity-[0.09] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[22px_22px]",
        emptyStateShell:
          "mt-20 rounded-[42px] border border-border bg-card/80 backdrop-blur-2xl p-12 text-center shadow-[0_18px_70px_rgba(0,0,0,0.12)]",
      };
    }

    // Atlas (catalog): sharp corners, dense typography, grid-like feel
    if (homeTheme === "atlas") {
      return {
        ...base,
        chip:
          "inline-flex items-center rounded-lg border-2 border-border bg-background px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-foreground shadow-none hover:bg-muted/20 transition",
        chipDot: "mr-2 inline-block h-1.5 w-1.5 rounded-sm bg-foreground/60",
        heroTitle:
          "mt-6 font-heading text-4xl md:text-6xl tracking-[-0.02em] text-foreground leading-[1.02]",
        heroSubtitle:
          "mt-4 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed",
        heroPrimaryCta:
          "h-12 inline-flex items-center justify-center rounded-lg bg-foreground px-8 text-sm font-semibold text-background shadow-sm hover:bg-foreground/92 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroSecondaryCta:
          "h-12 inline-flex items-center justify-center rounded-lg border-2 border-border bg-background px-8 text-sm font-semibold text-foreground hover:bg-muted/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroRightGlow: "absolute inset-0 -z-10 rounded-[16px] bg-muted/35 blur-2xl",
        heroRightRing: "absolute inset-0 -z-10 rounded-[16px] ring-2 ring-border/70",
        heroStatCard:
          "rounded-lg border-2 border-border bg-background px-4 py-4 shadow-none hover:bg-muted/15 transition",
        heroStatValue: "font-heading text-xl text-foreground",
        heroStatLabel:
          "mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground",
        categoryPill:
          "inline-flex h-10 items-center gap-2 rounded-lg border-2 border-border bg-background px-4 text-sm text-foreground hover:bg-muted/20 transition",
        filterShell: "group rounded-2xl border-2 border-border bg-background shadow-sm",
        filterInput:
          "mt-2 h-12 w-full rounded-lg border-2 border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring transition",
        filterSelect:
          "mt-2 h-12 w-full rounded-lg border-2 border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring transition",
        filterChip:
          "group inline-flex items-center gap-2 rounded-lg border-2 border-border bg-background px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-foreground hover:bg-muted/20 transition",
        filterChipClose:
          "h-4 w-4 rounded-md grid place-items-center border-2 border-border bg-background text-[10px] opacity-70 group-hover:opacity-100 transition",
        dividerGlow: "absolute inset-x-0 -top-6 h-12 bg-muted/25 blur-2xl opacity-60",
        productWrapper: "transition hover:-translate-y-px hover:shadow-md",
        brandsShell: "relative overflow-hidden rounded-2xl border-2 border-border bg-background shadow-sm",
        brandsGlow: "absolute inset-0 bg-linear-to-br from-muted/20 via-transparent to-muted/30",
        brandsDot:
          "absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[18px_18px]",
        emptyStateShell: "mt-20 rounded-2xl border-2 border-border bg-background p-12 text-center shadow-sm",
      };
    }

    // Heritage (luxury): more ornament, rounder, softer highlights
    if (homeTheme === "heritage") {
      return {
        ...base,
        chip:
          "inline-flex items-center rounded-full border border-border/70 bg-card/55 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-muted-foreground backdrop-blur shadow-sm hover:bg-card/70 transition",
        chipDot: "mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary/75",
        heroTitle:
          "mt-7 font-heading text-4xl md:text-6xl tracking-tight text-foreground leading-[1.02]",
        heroSubtitle:
          "mt-5 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed",
        heroPrimaryCta:
          "h-12 inline-flex items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-[0_20px_60px_rgba(0,0,0,0.12)] hover:shadow-[0_28px_80px_rgba(0,0,0,0.14)] hover:-translate-y-px transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroSecondaryCta:
          "h-12 inline-flex items-center justify-center rounded-full border border-border bg-background/75 px-8 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/30 hover:-translate-y-px transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroRightGlow:
          "absolute inset-0 -z-10 rounded-[52px] bg-linear-to-br from-primary/22 via-transparent to-muted/55 blur-2xl",
        heroRightRing: "absolute inset-0 -z-10 rounded-[52px] ring-1 ring-border/60",
        heroStatCard:
          "rounded-2xl border border-border bg-background/60 px-4 py-4 shadow-sm hover:shadow-md hover:-translate-y-px transition",
        categorySection: "mx-auto max-w-6xl px-4 py-9",
        categoryPill:
          "inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card/55 px-4 text-sm text-foreground backdrop-blur hover:bg-muted/30 hover:-translate-y-px transition",
        filterShell:
          "group rounded-[44px] border border-border bg-card/70 backdrop-blur-2xl shadow-[0_18px_65px_rgba(0,0,0,0.06)]",
        productWrapper: "transition hover:-translate-y-1 hover:shadow-lg",
        brandsShell:
          "relative overflow-hidden rounded-[52px] border border-border bg-card/60 backdrop-blur-2xl shadow-[0_22px_90px_rgba(0,0,0,0.08)]",
      };
    }

    // Mono (utilitarian): compact type, squared UI, more numeric feel
    if (homeTheme === "mono") {
      return {
        ...base,
        chip:
          "inline-flex items-center rounded-md border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur hover:bg-muted/25 transition",
        chipDot: "mr-2 inline-block h-1.5 w-1.5 rounded-sm bg-foreground/35",
        heroTitle:
          "mt-6 font-heading font-numeric tabular-nums text-4xl md:text-6xl tracking-[-0.01em] text-foreground leading-[1.02]",
        heroSubtitle:
          "mt-4 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed",
        heroPrimaryCta:
          "h-12 inline-flex items-center justify-center rounded-md bg-foreground px-8 text-sm font-semibold text-background shadow-sm hover:bg-foreground/92 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroSecondaryCta:
          "h-12 inline-flex items-center justify-center rounded-md border border-border bg-background/75 px-8 text-sm font-semibold text-foreground hover:bg-muted/25 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        heroRightGlow:
          "absolute inset-0 -z-10 rounded-[18px] bg-muted/45 blur-2xl",
        heroRightRing: "absolute inset-0 -z-10 rounded-[18px] ring-1 ring-border/60",
        heroStatCard:
          "rounded-md border border-border bg-background/70 px-4 py-4 shadow-sm hover:bg-muted/20 transition",
        heroStatValue: "font-heading font-numeric tabular-nums text-xl text-foreground",
        heroStatLabel:
          "mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground",
        categoryPill:
          "inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background/75 px-4 text-sm text-foreground hover:bg-muted/25 transition",
        filterShell:
          "group rounded-xl border border-border bg-background/70 shadow-sm",
        filterInput:
          "mt-2 h-12 w-full rounded-md border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring transition",
        filterSelect:
          "mt-2 h-12 w-full rounded-md border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring transition",
        filterChip:
          "group inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-muted/25 transition",
        filterChipClose:
          "h-4 w-4 rounded-md grid place-items-center border border-border bg-background text-[10px] opacity-70 group-hover:opacity-100 transition",
        productWrapper: "transition hover:-translate-y-px hover:shadow-md",
        brandsShell: "relative overflow-hidden rounded-xl border border-border bg-background/70 shadow-sm",
        brandsDot:
          "absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[18px_18px]",
      };
    }

    // Fallback: Studio
    return {
      ...base,
    };
  })();

  const sp = (await searchParams) ?? {};

  const toBool = (v: unknown) => {
    if (typeof v !== "string") return false;
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "on";
  };

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const category = typeof sp.category === "string" ? sp.category.trim() : "";
  const occasion = typeof sp.occasion === "string" ? sp.occasion.trim() : "";
  const recipient = typeof sp.recipient === "string" ? sp.recipient.trim() : "";
  const budget = typeof sp.budget === "string" ? sp.budget.trim() : "";
  const availability = typeof sp.availability === "string" ? sp.availability.trim() : "";
  const size = typeof sp.size === "string" ? sp.size.trim() : "";
  const color = typeof sp.color === "string" ? sp.color.trim() : "";
  const minPrice = typeof sp.minPrice === "string" ? sp.minPrice.trim() : "";
  const maxPrice = typeof sp.maxPrice === "string" ? sp.maxPrice.trim() : "";
  const sort = typeof sp.sort === "string" ? sp.sort.trim() : "latest";
  const inStock = toBool(sp.inStock);
  const discountOnly = toBool(sp.discountOnly);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Helper: build href with updated search params
  const buildHref = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (category) next.set("category", category);
    if (occasion) next.set("occasion", occasion);
    if (recipient) next.set("recipient", recipient);
    if (budget) next.set("budget", budget);
    if (availability) next.set("availability", availability);
    if (size) next.set("size", size);
    if (color) next.set("color", color);
    if (minPrice) next.set("minPrice", minPrice);
    if (maxPrice) next.set("maxPrice", maxPrice);
    if (inStock) next.set("inStock", "1");
    if (discountOnly) next.set("discountOnly", "1");
    if (sort) next.set("sort", sort);

    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }

    // keep your existing backend mapping (offer => mode=offers)
    const qs2 = new URLSearchParams();
    const q2 = next.get("q") || "";
    const c2 = next.get("category") || "";
    const occasion2 = next.get("occasion") || "";
    const recipient2 = next.get("recipient") || "";
    const budget2 = next.get("budget") || "";
    const availability2 = next.get("availability") || "";
    const s2 = next.get("size") || "";
    const col2 = next.get("color") || "";
    const min2 = next.get("minPrice") || "";
    const max2 = next.get("maxPrice") || "";
    const inStock2 = next.get("inStock") || "";
    const discountOnly2 = next.get("discountOnly") || "";
    const sort2 = next.get("sort") || "latest";

    if (q2) qs2.set("q", q2);
    if (c2) qs2.set("category", c2);
    if (occasion2) qs2.set("occasion", occasion2);
    if (recipient2) qs2.set("recipient", recipient2);
    if (budget2) qs2.set("budget", budget2);
    if (availability2) qs2.set("availability", availability2);
    if (s2) qs2.set("size", s2);
    if (col2) qs2.set("color", col2);
    if (min2) qs2.set("minPrice", min2);
    if (max2) qs2.set("maxPrice", max2);
    if (inStock2) qs2.set("inStock", inStock2);
    if (discountOnly2) qs2.set("discountOnly", discountOnly2);

    if (sort2 === "offer") qs2.set("mode", "offers");
    else if (sort2 && sort2 !== "latest") qs2.set("sort", sort2);

    return `/${lang}${qs2.toString() ? `?${qs2}` : ""}`;
  };

  // Fetch products
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (category) qs.set("category", category);
  if (occasion) qs.set("occasion", occasion);
  if (recipient) qs.set("recipient", recipient);
  if (budget) qs.set("budget", budget);
  if (availability) qs.set("availability", availability);
  if (size) qs.set("size", size);
  if (color) qs.set("color", color);
  if (minPrice) qs.set("minPrice", minPrice);
  if (maxPrice) qs.set("maxPrice", maxPrice);
  if (inStock) qs.set("inStock", "1");
  if (discountOnly) qs.set("discountOnly", "1");
  if (sort === "offer") qs.set("mode", "offers");
  else if (sort && sort !== "latest") qs.set("sort", sort);

  const res = await fetch(
    `${baseUrl}/api/products${qs.toString() ? `?${qs}` : ""}`,
    { cache: "no-store" }
  );
  const data = await res.json().catch(() => ({}));
  const products: Product[] = Array.isArray(data?.products)
    ? (data.products as Product[])
    : [];

  const catRes = await fetch(`${baseUrl}/api/categories`, { cache: "no-store" });
  const catData = await catRes.json().catch(() => ({}));
  const categories: Category[] = Array.isArray(catData?.categories)
    ? (catData.categories as Category[])
    : [];

  const hasFilters =
    Boolean(
      q ||
      category ||
      occasion ||
      recipient ||
      budget ||
      availability ||
      size ||
      color ||
      minPrice ||
      maxPrice ||
      inStock ||
      discountOnly
    ) ||
    sort !== "latest";

  const appliedCount =
    (q ? 1 : 0) +
    (category ? 1 : 0) +
    (occasion ? 1 : 0) +
    (recipient ? 1 : 0) +
    (budget ? 1 : 0) +
    (availability ? 1 : 0) +
    (size ? 1 : 0) +
    (color ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (inStock ? 1 : 0) +
    (discountOnly ? 1 : 0) +
    (sort !== "latest" ? 1 : 0);

  const showHomeSections = !hasFilters;

  const activeBanners: HomeBanner[] = showHomeSections
    ? await (async () => {
      try {
        const now = new Date();
        const rows = await prisma.banner.findMany({
          where: {
            isActive: true,
            AND: [
              { OR: [{ startAt: null }, { startAt: { lte: now } }] },
              { OR: [{ endAt: null }, { endAt: { gte: now } }] },
            ],
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            highlightText: true,
            subtitle: true,
            imageUrl: true,
            videoUrl: true,
            ctaText: true,
            ctaHref: true,
            sortOrder: true,
            couponCode: true,
            coupon: {
              select: {
                code: true,
                type: true,
                value: true,
              },
            },
          },
        });

        const normalized: HomeBanner[] = rows
          .map((b) => ({
            id: b.id,
            title: b.title,
            highlightText: b.highlightText,
            subtitle: b.subtitle,
            imageUrl: b.imageUrl,
            videoUrl: b.videoUrl,
            ctaText: b.ctaText,
            ctaHref: b.ctaHref,
            sortOrder: b.sortOrder,
            couponCode: b.couponCode,
            coupon: b.coupon
              ? {
                code: b.coupon.code,
                type: b.coupon.type,
                value: b.coupon.value,
              }
              : null,
          }))
          .filter((b) => Boolean(b.id && b.title && b.imageUrl));

        return normalized;
      } catch {
        return [];
      }
    })()
    : [];

  const [featured, trending, brands] = showHomeSections
    ? await Promise.all([
        prisma.product.findMany({
          where: { isActive: true, status: "PUBLISHED", isFeatured: true, deletedAt: null },
          take: 12,
          include: {
            category: true,
            vendor: true,
            images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
          },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        }),
        prisma.product.findMany({
          where: { isActive: true, status: "PUBLISHED", isTrending: true, deletedAt: null },
          take: 12,
          include: {
            category: true,
            vendor: true,
            images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
          },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        }),
        // Brands
        prisma.brand.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          take: 40,
          select: { id: true, name: true, slug: true, logoUrl: true, brandType: true },
        }),
      ])
    : await Promise.all([
        Promise.resolve([]),
        fetch(`${baseUrl}/api/products?limit=12`, { cache: "no-store" })
          .then((r) => r.json().catch(() => ({})))
          .then((d) => (Array.isArray(d?.products) ? (d.products as Product[]) : [])),
        fetch(`${baseUrl}/api/brands?limit=40`, { cache: "no-store" })
          .then((r) => r.json().catch(() => ({})))
          .then((d) => (Array.isArray(d?.brands) ? (d.brands as Brand[]) : [])),
      ]);

  type FilterOption = readonly [string, string];
  type ColorFilterOption = readonly [string, string, string];
  const cookieStore = await cookies();
  const selectedCurrency = cookieStore.get("bohosaaz_currency")?.value === "USD" ? "USD" : "INR";
  const mergeFilterOptions = (...groups: readonly FilterOption[][]): FilterOption[] => {
    const seen = new Set<string>();
    const merged: FilterOption[] = [];
    for (const group of groups) {
      for (const option of group) {
        if (seen.has(option[0])) continue;
        seen.add(option[0]);
        merged.push(option);
      }
    }
    return merged;
  };

  const popularBrands = brands.filter((brand) => brand.brandType !== "LUXURY");
  const luxuryBrands = brands.filter((brand) => brand.brandType === "LUXURY");

  const toTitleCase = (text: string) =>
    text
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  const parseGroupedTag = (name: string, slug: string) => {
    const nameMatch = name.match(/^\s*([^:|/]+)\s*[:|/]\s*(.+?)\s*$/);
    if (nameMatch) {
      return {
        group: nameMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
        label: nameMatch[2].trim(),
        value: slug,
      };
    }

    const slugMatch = slug.match(/^(occasion|recipient|availability)-(.+)$/);
    if (!slugMatch) return null;
    return {
      group: slugMatch[1].replace("-", "_"),
      label: toTitleCase(slugMatch[2]),
      value: slug,
    };
  };

  const tagRows = await prisma.tag.findMany({
    where: { products: { some: { product: { isActive: true, status: "PUBLISHED", deletedAt: null } } } },
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });

  const groupedTagOptions = tagRows.reduce<Record<string, FilterOption[]>>((acc, tag) => {
    const parsed = parseGroupedTag(tag.name, tag.slug);
    if (!parsed) return acc;
    acc[parsed.group] = acc[parsed.group] ?? [];
    acc[parsed.group].push([parsed.value, parsed.label]);
    return acc;
  }, {});

  const defaultOccasionOptions: FilterOption[] = DEFAULT_OCCASION_OPTIONS.map((option) => [option.value, option.label]);
  const defaultRecipientOptions: FilterOption[] = DEFAULT_RECIPIENT_OPTIONS.map((option) => [option.value, option.label]);
  const occasionOptions = mergeFilterOptions(defaultOccasionOptions, groupedTagOptions.occasion ?? []);
  const recipientOptions = mergeFilterOptions(defaultRecipientOptions, groupedTagOptions.recipient ?? []);
  const tagAvailabilityOptions = groupedTagOptions.availability ?? [];

  const priceStats = await prisma.product.aggregate({
    where: { isActive: true, status: "PUBLISHED" },
    _min: { price: true },
    _max: { price: true },
  });
  const minProductPrice = Math.max(0, Math.floor(Number(priceStats._min.price ?? 0)));
  const maxProductPrice = Math.ceil(Number(priceStats._max.price ?? 0));
  const budgetOptions: FilterOption[] = (() => {
    if (!Number.isFinite(maxProductPrice) || maxProductPrice <= 0) return [];
    const step = Math.max(500, Math.ceil((maxProductPrice - minProductPrice + 1) / 4 / 100) * 100);
    const ranges: FilterOption[] = [];
    let start = minProductPrice;
    for (let i = 0; i < 4 && start <= maxProductPrice; i++) {
      const end = Math.min(maxProductPrice, start + step - 1);
      ranges.push([
        `${start}-${end}`,
        start === 0
          ? `Under ${formatPriceInCurrency(end, "INR", selectedCurrency)}`
          : `${formatPriceInCurrency(start, "INR", selectedCurrency)} - ${formatPriceInCurrency(end, "INR", selectedCurrency)}`,
      ]);
      start = end + 1;
    }
    if (start <= maxProductPrice) ranges.push([`${start}-`, `${formatPriceInCurrency(start, "INR", selectedCurrency)}+`]);
    return ranges;
  })();

  const variantColors = await prisma.productVariant.findMany({
    where: { isActive: true, color: { not: null }, product: { isActive: true, status: "PUBLISHED", deletedAt: null } },
    distinct: ["color"],
    select: { color: true },
    orderBy: { color: "asc" },
    take: 24,
  });
  const colorFromProducts = await prisma.product.findMany({
    where: { isActive: true, status: "PUBLISHED", deletedAt: null, colorOptions: { not: null } },
    distinct: ["colorOptions"],
    select: { colorOptions: true },
    take: 100,
  });
  const colorValues = Array.from(
    new Set([
      ...variantColors.map((row) => row.color).filter((v): v is string => Boolean(v)),
      ...colorFromProducts.flatMap((row) =>
        (row.colorOptions ?? "")
          .split(/[,|/]/g)
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ]),
  ).slice(0, 24);
  const swatchClassForColor = (value: string) => {
    const v = value.toLowerCase();
    if (v.includes("white")) return "bg-white";
    if (v.includes("black")) return "bg-black";
    if (v.includes("gold")) return "bg-[#d4af37]";
    if (v.includes("maroon")) return "bg-[#800000]";
    if (v.includes("beige")) return "bg-[#d8c3a5]";
    if (v.includes("multi")) return "bg-linear-to-br from-rose-400 via-amber-300 to-sky-400";
    if (v.includes("pastel")) return "bg-[#f7c8e0]";
    return "bg-muted";
  };
  const colorOptions: ColorFilterOption[] = colorValues.map((value) => [
    value,
    toTitleCase(value),
    swatchClassForColor(value),
  ]);

  const newArrivalSince = new Date();
  newArrivalSince.setDate(newArrivalSince.getDate() - 30);
  const [inStockCount, discountedCount, newArrivalCount] = await Promise.all([
    prisma.product.count({
      where: {
        isActive: true,
        status: "PUBLISHED",
        deletedAt: null,
        OR: [{ stock: { gt: 0 } }, { variants: { some: { isActive: true, stock: { gt: 0 } } } }],
      },
    }),
    prisma.product.count({ where: { isActive: true, status: "PUBLISHED", deletedAt: null, salePrice: { not: null } } }),
    prisma.product.count({ where: { isActive: true, status: "PUBLISHED", deletedAt: null, createdAt: { gte: newArrivalSince } } }),
  ]);
  const availabilityOptions: FilterOption[] = [
    ...(inStockCount > 0 ? [["in_stock", "In Stock"] as const] : []),
    ...(newArrivalCount > 0 ? [["new_arrivals", "New Arrivals"] as const] : []),
    ...(discountedCount > 0 ? [["discounted", "Discounted"] as const] : []),
    ...tagAvailabilityOptions,
  ].filter((option, index, all) => all.findIndex(([value]) => value === option[0]) === index);

  const sortOptions = [
    ["featured", "Featured"],
    ["best_selling", "Best Selling"],
    ["trending", "Trending"],
    ["new_arrivals", "New Arrivals"],
    ["price_asc", "Price: Low to High"],
    ["price_desc", "Price: High to Low"],
  ] as const;

  const optionLabel = (items: readonly (readonly [string, string, ...unknown[]])[], value: string) =>
    items.find(([v]) => v === value)?.[1] ?? value.replace(/[_-]+/g, " ");
  const premiumFilterFieldClass =
    "mt-2 h-12 w-full rounded-2xl border border-primary/15 bg-background/80 px-4 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_30px_rgba(47,38,34,0.04)] outline-none transition focus:border-primary/35 focus:bg-background focus:ring-4 focus:ring-primary/10";

  return (
    <div className={rootClassName} data-home-theme={homeTheme}>
      {showHomeSections ? (
        <div className="mx-auto max-w-6xl px-4 mt-6">
          <AdSlot placement="HOME_TOP" langPrefix={`/${lang}`} />
        </div>
      ) : null}

      {/* ✅ HERO (Luxury Editorial - upgraded) */}
      <section className="relative border-b border-border">
        <div className={heroBackdropClass} />
        <div className={heroTopBlobClass} />
        <div className={heroBottomLeftBlobClass} />
        <div className={heroDotsClass} />

        <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-16">
          <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] md:items-center">
            {/* LEFT */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip label="Thoughtful Gifts" className={theme.chip} dotClassName={theme.chipDot} />
                <Chip label="Handcrafted" className={theme.chip} dotClassName={theme.chipDot} />
                <Chip label="Made with Love" className={theme.chip} dotClassName={theme.chipDot} />
              </div>

              <h1
                className={
                  theme.heroTitle ??
                  "mt-6 font-heading text-4xl md:text-6xl tracking-tight text-foreground leading-[1.02]"
                }
              >
                Bohosaaz Editions
              </h1>

              <p
                className={
                  theme.heroSubtitle ??
                  "mt-4 font-heading text-xl md:text-2xl tracking-tight text-primary/90 max-w-xl leading-snug"
                }
              >
                Elevate your gifting experience with Bohosaaz&apos;s gifting editions.
              </p>

              <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
                Each gift is handpicked with care so that every gift resonates with your emotions
                and narrates a story of its own.
              </p>

              <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
                Click on &quot;Shop Now&quot; to discover the perfect gift.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={`/${lang}/shop`}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-9 text-sm font-semibold text-primary-foreground shadow-[0_18px_45px_rgba(0,0,0,0.12)] transition hover:-translate-y-px hover:shadow-[0_24px_60px_rgba(0,0,0,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Shop Now
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <span className="rounded-full border border-border bg-background/65 px-3 py-1 backdrop-blur">
                  Gift-Ready Packaging
                </span>
                <span className="rounded-full border border-border bg-background/65 px-3 py-1 backdrop-blur">
                  Artisan Crafted
                </span>
              </div>
            </div>

            {/* RIGHT CARD */}
            <div className="relative">
              <div
                className={
                  theme.heroRightGlow ??
                  "absolute inset-0 -z-10 rounded-[42px] bg-linear-to-br from-primary/30 via-transparent to-muted/50 blur-2xl"
                }
              />
              <div
                className={
                  theme.heroRightRing ??
                  "absolute inset-0 -z-10 rounded-[42px] ring-1 ring-border/60"
                }
              />

              {activeBanners.length ? (
                <BannerCarousel
                  lang={lang}
                  banners={activeBanners}
                  homeTheme={homeTheme}
                  compact
                />
              ) : (
                <div
                  className={`${heroRightCardClass} relative overflow-hidden`}
                  style={{
                    background:
                      "linear-gradient(145deg, color-mix(in srgb, var(--card) 92%, white), color-mix(in srgb, var(--bg) 76%, var(--primary) 8%))",
                    boxShadow: "0 28px 90px rgba(47, 38, 34, 0.14)",
                  }}
                >
                  <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-amber-500/12 blur-3xl" />
                  <div className="pointer-events-none absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[18px_18px]" />
                  <div className="grid gap-3">
                    {[
                      "Personalised picks for every celebration",
                      "Authentic artisan craftsmanship",
                      "Packaging Designed to Delight and Elevate the Unboxing Experience",
                    ].map((line) => (
                      <div
                        key={line}
                        className="relative flex items-start gap-3 rounded-2xl bg-card/72 px-4 py-3 text-sm leading-relaxed text-muted-foreground shadow-[0_12px_34px_rgba(47,38,34,0.08)] backdrop-blur md:text-base"
                      >
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <AdSlot placement="HOME_SIDEBAR" langPrefix={`/${lang}`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Category Quick Links */}
      <section className="mx-auto max-w-6xl px-4 py-9">
        <div className="relative overflow-hidden rounded-[34px] border border-primary/15 bg-linear-to-br from-primary/10 via-card/80 to-amber-500/10 p-5 shadow-[0_22px_70px_rgba(47,38,34,0.08)] backdrop-blur-xl md:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] tracking-[0.24em] uppercase text-primary/80">
              Categories
            </div>
            <div className="mt-1 font-heading text-2xl tracking-tight text-foreground md:text-3xl">
              Quick picks
            </div>
          </div>
          <a
            href={`/${lang}/categories`}
            className="rounded-full border border-border bg-background/75 px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-px hover:border-primary/30 hover:text-primary"
          >
            View all
          </a>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-3 pb-1">
          {categories.slice(0, 12).map((c) => (
            <a
              key={c.id}
              href={`/${lang}?category=${encodeURIComponent(c.id)}`}
              className="quick-pick-chip group inline-flex h-12 items-center gap-2 rounded-2xl border border-primary/18 bg-background/80 px-4 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-md"
            >
              {c.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.iconUrl ?? undefined}
                  alt=""
                  width={16}
                  height={16}
                  className="h-5 w-5 rounded-lg bg-card object-contain opacity-90 transition group-hover:scale-110"
                />
              ) : (
                <IconByName name={c.iconName ?? undefined} className="h-5 w-5 text-primary/80 transition group-hover:scale-110" aria-hidden />
              )}
              {c.name}
            </a>
          ))}
        </div>
        </div>
      </section>

      {/* ✅ FILTER PANEL */}
      <section
        className="sticky top-17.5 z-40 border-y border-primary/10 bg-background/70 backdrop-blur-2xl"
      >
        <div className="mx-auto max-w-6xl px-4 py-6">
          <details
            open
            className="group overflow-hidden rounded-[36px] border border-primary/15 bg-card/80 shadow-[0_24px_80px_rgba(47,38,34,0.10)] backdrop-blur-2xl"
          >
            <summary className="relative cursor-pointer list-none px-6 py-5 flex items-center justify-between">
              <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-primary/8 via-transparent to-amber-500/8" />
              <div>
                <div className="relative text-[11px] uppercase tracking-[0.26em] text-primary/80">
                  Filters
                </div>
                <div className="relative mt-1 text-base font-semibold text-foreground">
                  Refine your results{" "}
                  {hasFilters ? (
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      • {appliedCount} applied
                    </span>
                  ) : null}
                </div>
              </div>

              <span className="relative rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground group-open:hidden">
                Tap to open
              </span>
              <span className="relative hidden rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground group-open:block">
                Tap to close
              </span>
            </summary>

            <div className="px-6 pb-6">
              <form method="GET" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-start">
                <div className="rounded-[30px] border border-primary/15 bg-linear-to-br from-background/90 via-card/75 to-primary/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_18px_55px_rgba(47,38,34,0.06)] lg:col-start-1">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Search</label>
                    <input
                      name="q"
                      defaultValue={q}
                      placeholder="Search thoughtful gifts..."
                      className={premiumFilterFieldClass}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Occasion</label>
                    <select name="occasion" defaultValue={occasion} className={premiumFilterFieldClass}>
                      <option value="">Any occasion</option>
                      {occasionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Recipient</label>
                    <select name="recipient" defaultValue={recipient} className={premiumFilterFieldClass}>
                      <option value="">For anyone</option>
                      {recipientOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Budget</label>
                    <select name="budget" defaultValue={budget} className={premiumFilterFieldClass}>
                      <option value="">Any budget</option>
                      {budgetOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Sort</label>
                    <select name="sort" defaultValue={sort} className={premiumFilterFieldClass}>
                      <option value="latest">Latest</option>
                      {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <div className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Category</div>
                      <select name="category" defaultValue={category} className={premiumFilterFieldClass}>
                        <option value="">All categories</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <div className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Availability</div>
                      <select name="availability" defaultValue={availability} className={premiumFilterFieldClass}>
                        <option value="">Any status</option>
                        {availabilityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  </div>

                  {colorOptions.length ? (
                    <div className="mt-4 rounded-[24px] border border-border/70 bg-background/45 p-3">
                      <div className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Color</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {colorOptions.map(([value, label, swatch]) => (
                          <a key={value} href={buildHref({ color: color === value ? null : value })} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition hover:-translate-y-px ${color === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card/70 hover:bg-muted/40"}`}>
                            <span className={`h-4 w-4 rounded-full border border-border ${swatch}`} aria-hidden />
                            {label}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {availability === "in_stock" ? <input type="hidden" name="inStock" value="1" /> : null}
                {availability === "discounted" ? <input type="hidden" name="discountOnly" value="1" /> : null}

                <div className="flex flex-col rounded-[30px] border border-primary/15 bg-linear-to-br from-primary/12 via-card/85 to-background/80 p-4 shadow-[0_18px_55px_rgba(47,38,34,0.08)] lg:col-start-2 lg:row-start-1">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-primary/80">Ready</div>
                    <div className="mt-1 font-heading text-2xl tracking-tight text-foreground">Apply filters</div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Build a cleaner shortlist with your selected gifting preferences.
                    </p>
                  </div>

                  <div className="pt-5">
                    <button className="h-12 w-full rounded-2xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-[0_18px_45px_rgba(0,0,0,0.10)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.14)] hover:-translate-y-px active:translate-y-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      Find Gifts
                    </button>

                    <a href={`/${lang}`} className="mt-3 h-12 w-full rounded-2xl border border-border bg-background/65 px-8 text-sm font-semibold inline-flex items-center justify-center hover:bg-muted/40 hover:-translate-y-px active:translate-y-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      Reset
                    </a>
                  </div>
                </div>

                {/* Active chips (removable) */}
                {hasFilters ? (
                  <div className="flex flex-wrap gap-2 rounded-[26px] border border-border/70 bg-background/55 p-3 pt-3 shadow-inner lg:col-span-2">
                    {q ? (
                      <FilterChip label={`Search: ${q}`} href={buildHref({ q: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {category ? (
                      <FilterChip label={`Category`} href={buildHref({ category: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {occasion ? (
                      <FilterChip label={`Occasion: ${optionLabel(occasionOptions, occasion)}`} href={buildHref({ occasion: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {recipient ? (
                      <FilterChip label={`Recipient: ${optionLabel(recipientOptions, recipient)}`} href={buildHref({ recipient: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {budget ? (
                      <FilterChip label={`Budget: ${optionLabel(budgetOptions, budget)}`} href={buildHref({ budget: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {availability ? (
                      <FilterChip label={`Availability: ${optionLabel(availabilityOptions, availability)}`} href={buildHref({ availability: null, inStock: null, discountOnly: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {!availability && inStock ? (
                      <FilterChip label="In stock" href={buildHref({ inStock: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {!availability && discountOnly ? (
                      <FilterChip label="Discounted" href={buildHref({ discountOnly: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {minPrice ? (
                      <FilterChip label={`Min ₹${minPrice}`} href={buildHref({ minPrice: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {maxPrice ? (
                      <FilterChip label={`Max ₹${maxPrice}`} href={buildHref({ maxPrice: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {color ? (
                      <FilterChip label={`Color: ${optionLabel(colorOptions, color)}`} href={buildHref({ color: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {sort !== "latest" ? (
                      <FilterChip label={`Sort: ${optionLabel(sortOptions, sort)}`} href={buildHref({ sort: "latest" })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                  </div>
                ) : null}
              </form>
            </div>
          </details>
        </div>
      </section>

      {/* ✅ Home Sections (no filters) */}
      {showHomeSections ? (
        <>
          <div className="mx-auto max-w-7xl px-4 py-12">
            <AdSlot placement="HOME_BETWEEN_SECTIONS" langPrefix={`/${lang}`} />
          </div>

          {/* Featured */}
          {featured.length ? (
            <section className="mx-auto max-w-6xl px-4 pb-12">
              <SectionHeader
                eyebrow="Featured"
                title="Featured Products"
                actionHref={`/${lang}/shop?sort=featured`}
                actionLabel="Browse all"
                eyebrowClassName={theme.sectionEyebrow}
                titleClassName={theme.sectionTitle}
                actionClassName={theme.sectionAction}
              />

              <ProductMarquee
                products={featured}
                lang={lang}
                duration="32s"
                wrapperClassName={theme.productWrapper}
              />
            </section>
          ) : null}

          {/* Trending */}
          {trending.length ? (
            <section className="mx-auto max-w-6xl px-4 pb-12">
              <SectionHeader
                eyebrow="Trending"
                title="Trending Products"
                actionHref={`/${lang}/shop?sort=trending`}
                actionLabel="Browse all"
                eyebrowClassName={theme.sectionEyebrow}
                titleClassName={theme.sectionTitle}
                actionClassName={theme.sectionAction}
              />

              <ProductMarquee
                products={trending}
                lang={lang}
                duration="36s"
                wrapperClassName={theme.productWrapper}
              />
            </section>
          ) : null}

          {/* Brands */}
          <section className="mx-auto max-w-6xl px-4 py-14">
            <SectionHeader
              eyebrow="Brands"
              title="The BohoSaaz Collection"
              eyebrowClassName={theme.sectionEyebrow}
              titleClassName={theme.sectionTitle}
              actionClassName={theme.sectionAction}
            />

            <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground md:text-sm">
              Discover our distinctive collections from celebrated makers and premium brands, curated to inspire thoughtful gifting.
            </p>

            <div className="mt-5 grid gap-8 sm:mt-7">
              <BrandMarquee
                title="Popular Collection"
                eyebrow="Top Sellers"
                href={`/${lang}/brands/popular`}
                brands={popularBrands}
                duration="28s"
              />
              <BrandMarquee
                title="Luxury Collection"
                eyebrow="Premium Picks"
                href={`/${lang}/brands/luxury`}
                brands={luxuryBrands}
                duration="34s"
              />
            </div>
          </section>

        </>
      ) : null}

      {!showHomeSections ? (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex justify-end text-sm text-muted-foreground">
            {products.length} items found
          </div>

          <Divider className={theme.dividerShell} glowClassName={theme.dividerGlow} />

          {q ? (
            <div className="mt-6">
              <AdSlot placement="SEARCH_TOP" langPrefix={`/${lang}`} />
            </div>
          ) : null}

          <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.map((p) => (
              <div
                key={p.id}
                className={
                  theme.productWrapper ??
                  "h-full transition hover:-translate-y-1 hover:shadow-lg"
                }
              >
                <ProductCard
                  langPrefix={`/${lang}`}
                  enableImageSwipe
                  product={{
                    id: String(p.id),
                    title: String(p.title || ""),
                    slug: String(p.slug || ""),
                    currency: (p.currency === "USD" ? "USD" : "INR") as "INR" | "USD",
                    mrp: p.mrp == null ? null : Number(p.mrp),
                    price: Number(p.price || 0),
                    salePrice: p.salePrice == null ? null : Number(p.salePrice),
                    createdAt: p.createdAt,
                    images: Array.isArray(p.images) ? p.images : [],
                    vendorId: p.vendorId ?? p.vendor?.id ?? null,
                  }}
                />
              </div>
            ))}
          </div>

          {products.length === 0 ? (
            <div
              className={
                theme.emptyStateShell ??
                "mt-20 rounded-[42px] border border-border bg-card/70 backdrop-blur-2xl p-12 text-center shadow-[0_18px_70px_rgba(0,0,0,0.08)]"
              }
            >
              <div className="font-heading text-2xl md:text-3xl text-foreground">
                No products found
              </div>
              <p className="mt-2 text-sm md:text-base text-muted-foreground">
                Try adjusting filters or reset to explore all products.
              </p>

              <a
                href={`/${lang}`}
                className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-8 text-sm font-semibold text-primary-foreground
                shadow-[0_18px_45px_rgba(0,0,0,0.10)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.14)] hover:-translate-y-px active:translate-y-0 transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Reset Filters
              </a>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

