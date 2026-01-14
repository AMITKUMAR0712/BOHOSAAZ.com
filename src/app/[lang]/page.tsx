import { dict } from "@/lib/dict";
import { isLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { BrandCarousel } from "@/components/BrandCarousel";
import { BannerCarousel, type HomeBanner } from "@/components/BannerCarousel";
import { AdSlot } from "@/components/ads/AdSlot";
import IconByName from "@/components/IconByName";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function renderNumericRuns(text: string) {
  const parts = String(text).split(/(\d[\d,\.]*)/g);
  return parts
    .filter((p) => p.length > 0)
    .map((part, i) =>
      /\d/.test(part) ? (
        <span key={i} className="font-numeric tabular-nums">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
}

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
};

type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
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

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) throw new Error("Invalid locale");

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
  const size = typeof sp.size === "string" ? sp.size.trim() : "";
  const color = typeof sp.color === "string" ? sp.color.trim() : "";
  const minPrice = typeof sp.minPrice === "string" ? sp.minPrice.trim() : "";
  const maxPrice = typeof sp.maxPrice === "string" ? sp.maxPrice.trim() : "";
  const sort = typeof sp.sort === "string" ? sp.sort.trim() : "latest";
  const inStock = toBool(sp.inStock);
  const discountOnly = toBool(sp.discountOnly);

  const t = dict[lang];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Helper: build href with updated search params
  const buildHref = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (category) next.set("category", category);
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
    const s2 = next.get("size") || "";
    const col2 = next.get("color") || "";
    const min2 = next.get("minPrice") || "";
    const max2 = next.get("maxPrice") || "";
    const inStock2 = next.get("inStock") || "";
    const discountOnly2 = next.get("discountOnly") || "";
    const sort2 = next.get("sort") || "latest";

    if (q2) qs2.set("q", q2);
    if (c2) qs2.set("category", c2);
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
    Boolean(q || category || size || color || minPrice || maxPrice || inStock || discountOnly) ||
    sort !== "latest";

  const appliedCount =
    (q ? 1 : 0) +
    (category ? 1 : 0) +
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
        const fallback: HomeBanner[] = [
          {
            id: "fallback-1",
            title: "Handcrafted Luxury",
            highlightText: "New arrivals",
            subtitle: "Discover artisan-made pieces with timeless elegance.",
            imageUrl: "/s1.jpg",
            ctaText: "Shop latest",
            ctaHref: `/${lang}?sort=latest`,
            sortOrder: 1,
            couponCode: null,
            coupon: null,
          },
          {
            id: "fallback-2",
            title: "Premium Offers",
            highlightText: "Limited time",
            subtitle: "Save on selected styles from trusted vendors.",
            imageUrl: "/s2.jpg",
            ctaText: "Shop offers",
            ctaHref: `/${lang}?sort=offer`,
            sortOrder: 2,
            couponCode: null,
            coupon: null,
          },
          {
            id: "fallback-3",
            title: "Curated Collections",
            highlightText: "Editor picks",
            subtitle: "Explore categories designed for every occasion.",
            imageUrl: "/s3.jpg",
            ctaText: "Explore",
            ctaHref: `/${lang}?sort=latest`,
            sortOrder: 3,
            couponCode: null,
            coupon: null,
          },
        ];

        try {
          const r = await fetch(`${baseUrl}/api/banners/active`, { cache: "no-store" });
          const j = await r.json().catch(() => ({} as unknown));
          const rows: unknown[] = (() => {
            if (typeof j !== "object" || j === null) return [];
            const banners = (j as Record<string, unknown>).banners;
            return Array.isArray(banners) ? banners : [];
          })();

          const normalized: HomeBanner[] = rows
            .map((b) => {
              const bb = (typeof b === "object" && b !== null ? (b as Record<string, unknown>) : {}) as Record<
                string,
                unknown
              >;
              const couponRaw = bb.coupon;
              const couponObj =
                typeof couponRaw === "object" && couponRaw !== null
                  ? (couponRaw as Record<string, unknown>)
                  : null;

              const couponTypeRaw = couponObj ? couponObj["type"] : null;
              const couponType =
                couponTypeRaw === "PERCENT" || couponTypeRaw === "FIXED" ? couponTypeRaw : "PERCENT";

              return {
                id: String(bb.id ?? ""),
                title: String(bb.title ?? ""),
                highlightText: (bb.highlightText as string | null | undefined) ?? null,
                subtitle: (bb.subtitle as string | null | undefined) ?? null,
                imageUrl: String(bb.imageUrl ?? ""),
                ctaText: (bb.ctaText as string | null | undefined) ?? null,
                ctaHref: (bb.ctaHref as string | null | undefined) ?? null,
                sortOrder: Number(bb.sortOrder ?? 0),
                couponCode: (bb.couponCode as string | null | undefined) ?? null,
                coupon: couponObj
                  ? {
                      code: String(couponObj["code"] ?? ""),
                      type: couponType,
                      value: Number(couponObj["value"] ?? 0),
                    }
                  : null,
              } satisfies HomeBanner;
            })
            .filter((b) => Boolean(b.id && b.title && b.imageUrl));

          return normalized.length ? normalized : fallback;
        } catch {
          return fallback;
        }
      })()
    : [];

  const highlightCoupon = await (async () => {
    const now = new Date();
    return prisma.coupon.findFirst({
      where: {
        isActive: true,
        isHighlighted: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      select: { code: true, type: true, value: true },
      orderBy: { updatedAt: "desc" },
    });
  })();
  const highlightCode = highlightCoupon?.code ?? null;
  const highlightDiscount = (() => {
    if (!highlightCoupon) return null;

    if (highlightCoupon.type === "PERCENT") {
      const pct = Math.round(Number(highlightCoupon.value));
      return { kind: "percent" as const, label: `${pct}% OFF` };
    }

    const amount = Math.round(Number(highlightCoupon.value));
    const formatted = `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} OFF`;
    return { kind: "fixed" as const, label: formatted };
  })();

  const [trending, offers, latest, brands] = showHomeSections
    ? await Promise.all([
        fetch(`${baseUrl}/api/products?mode=trending&limit=8`, {
          cache: "no-store",
        })
          .then((r) => r.json().catch(() => ({})))
          .then((d) =>
            Array.isArray(d?.products) ? (d.products as Product[]) : []
          ),
        fetch(`${baseUrl}/api/products?mode=offers&limit=8`, {
          cache: "no-store",
        })
          .then((r) => r.json().catch(() => ({})))
          .then((d) =>
            Array.isArray(d?.products) ? (d.products as Product[]) : []
          ),
        fetch(`${baseUrl}/api/products?mode=latest&limit=8`, {
          cache: "no-store",
        })
          .then((r) => r.json().catch(() => ({})))
          .then((d) =>
            Array.isArray(d?.products) ? (d.products as Product[]) : []
          ),
        fetch(`${baseUrl}/api/brands?limit=12`, { cache: "no-store" })
          .then((r) => r.json().catch(() => ({})))
          .then((d) => (Array.isArray(d?.brands) ? (d.brands as Brand[]) : [])),
      ])
    : [[], [], [], []];

  return (
    <div className={rootClassName} data-home-theme={homeTheme}>
      {showHomeSections ? (
        <div className="pt-8">
          <BannerCarousel lang={lang} banners={activeBanners} homeTheme={homeTheme} />
        </div>
      ) : null}

      {showHomeSections ? (
        <div className="mx-auto max-w-6xl px-4 mt-6">
          <AdSlot placement="HOME_TOP" />
        </div>
      ) : null}

      {/* ✅ HERO (Luxury Editorial - upgraded) */}
      <section className="relative border-b border-border">
        <div className={heroBackdropClass} />
        <div className={heroTopBlobClass} />
        <div className={heroBottomLeftBlobClass} />
        <div className={heroDotsClass} />

        <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-16">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            {/* LEFT */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip label="Handcrafted" className={theme.chip} dotClassName={theme.chipDot} />
                <Chip label="Luxury Feel" className={theme.chip} dotClassName={theme.chipDot} />
                <Chip label="Trusted Vendors" className={theme.chip} dotClassName={theme.chipDot} />
              </div>

              <h1
                className={
                  theme.heroTitle ??
                  "mt-6 font-heading text-4xl md:text-6xl tracking-tight text-foreground leading-[1.02]"
                }
              >
                {t.home.title}
              </h1>

              <p
                className={
                  theme.heroSubtitle ??
                  "mt-4 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed"
                }
              >
                {t.home.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={`/${lang}?sort=latest`}
                  className={
                    theme.heroPrimaryCta ??
                    "h-12 inline-flex items-center justify-center rounded-2xl bg-primary px-8 text-sm font-semibold text-primary-foreground\n                  shadow-[0_18px_45px_rgba(0,0,0,0.10)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.14)] hover:-translate-y-px active:translate-y-0 transition\n                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  }
                >
                  Explore Latest
                </a>

                <a
                  href={`/${lang}?sort=offer`}
                  className={
                    theme.heroSecondaryCta ??
                    "h-12 inline-flex items-center justify-center rounded-2xl border border-border bg-background/75 px-8 text-sm font-semibold text-foreground\n                  shadow-sm hover:bg-muted/40 hover:-translate-y-px active:translate-y-0 transition\n                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  }
                >
                  Shop Offers
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <span className="rounded-full border border-border bg-background/65 px-3 py-1 backdrop-blur">
                  Free Shipping ₹999+
                </span>
                <span className="rounded-full border border-border bg-background/65 px-3 py-1 backdrop-blur">
                  Easy Returns
                </span>
                <span className="rounded-full border border-border bg-background/65 px-3 py-1 backdrop-blur">
                  Premium Quality
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

              <div className={heroRightCardClass}>
                <div
                  className={
                    theme.heroCardEyebrow ??
                    "text-[11px] tracking-[0.22em] uppercase text-muted-foreground"
                  }
                >
                  Seasonal Collection
                </div>

                <div
                  className={
                    theme.heroCardTitle ??
                    "mt-2 font-heading text-2xl md:text-4xl tracking-tight text-foreground"
                  }
                >
                  Classic Handmade Luxury
                </div>

                <p
                  className={
                    theme.heroCardBody ??
                    "mt-3 text-sm md:text-base text-muted-foreground leading-relaxed"
                  }
                >
                  Discover sarees, shawls, handcrafted decor & artisan creations —
                  designed with timeless elegance.
                </p>

                <div className="mt-8 grid grid-cols-3 gap-3 text-center">
                  {[
                    { k: "40%", v: "Sale Deals" },
                    { k: "100+", v: "Vendors" },
                    { k: "Top", v: "Quality" },
                  ].map((x) => (
                    <div
                      key={x.v}
                      className={
                        theme.heroStatCard ??
                        "rounded-2xl border border-border bg-background/60 px-4 py-4 shadow-sm\n                      hover:shadow-lg hover:-translate-y-px transition"
                      }
                    >
                      <div
                        className={
                          theme.heroStatValue ??
                          "font-heading text-xl text-primary"
                        }
                      >
                        {renderNumericRuns(x.k)}
                      </div>
                      <div
                        className={
                          theme.heroStatLabel ??
                          "mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
                        }
                      >
                        {x.v}
                      </div>
                    </div>
                  ))}
                </div>

                {highlightCode ? (
                  <div
                    className={
                      theme.heroHighlightBox ??
                      "mt-8 rounded-2xl border border-border bg-background/55 px-4 py-3 text-center text-sm text-muted-foreground backdrop-blur"
                    }
                  >
                    <div>
                      <span className="font-semibold text-primary">Use Code:</span>{" "}
                      <span className="font-numeric tabular-nums">{highlightCode}</span> • Limited Offer
                    </div>
                    {highlightDiscount ? (
                      <div
                        className={
                          theme.heroHighlightLine2 ??
                          "mt-1 text-xs uppercase tracking-[0.18em] text-foreground"
                        }
                      >
                        {renderNumericRuns(highlightDiscount.label)}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <a
                  href={`/${lang}/offers${
                    highlightCode
                      ? `?coupon=${encodeURIComponent(highlightCode)}`
                      : ""
                  }`}
                  className={
                    theme.heroSaleCta ??
                    "mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-border bg-primary/10 px-6 py-3 text-sm font-semibold text-primary\n                  shadow-sm hover:shadow-md hover:bg-primary/15 hover:-translate-y-px active:translate-y-0 transition\n                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  }
                >
                  View Sale Collection →
                </a>
              </div>

              <div className="mt-6">
                <AdSlot placement="HOME_SIDEBAR" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Category Quick Links */}
      <section className={theme.categorySection ?? "mx-auto max-w-6xl px-4 py-7"}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className={theme.sectionEyebrow ?? "text-[11px] tracking-[0.22em] uppercase text-muted-foreground"}>
              Categories
            </div>
            <div className={theme.sectionTitle ? theme.sectionTitle.replace("mt-2", "mt-1").replace("text-2xl md:text-3xl", "text-lg") : "mt-1 font-heading text-lg tracking-tight text-foreground"}>
              Quick picks
            </div>
          </div>
          <a
            href={`/${lang}`}
            className={theme.sectionAction ?? "text-sm text-muted-foreground hover:text-foreground transition underline-offset-4 hover:underline"}
          >
            View all
          </a>
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 mask-[linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          {categories.slice(0, 12).map((c) => (
            <a
              key={c.id}
              href={`/${lang}?category=${encodeURIComponent(c.id)}`}
              className={
                theme.categoryPill ??
                "inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-card/60 px-4 text-sm text-foreground\n              hover:bg-muted/40 hover:-translate-y-px transition"
              }
            >
              {c.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.iconUrl ?? undefined}
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 opacity-80"
                />
              ) : (
                <IconByName name={c.iconName ?? undefined} className="h-4 w-4 opacity-80" aria-hidden />
              )}
              {c.name}
            </a>
          ))}
        </div>
      </section>

      {/* ✅ FILTER PANEL */}
      <section
        className={
          theme.filterSection ??
          "border-b border-border bg-background/65 backdrop-blur-xl sticky top-17.5 z-40"
        }
      >
        <div className="mx-auto max-w-6xl px-4 py-6">
          <details
            open
            className={
              theme.filterShell ??
              "group rounded-4xl border border-border bg-card/70 backdrop-blur-2xl shadow-[0_18px_65px_rgba(0,0,0,0.06)]"
            }
          >
            <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Filters
                </div>
                <div className="text-sm font-semibold text-foreground">
                  Refine your results{" "}
                  {hasFilters ? (
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      • {appliedCount} applied
                    </span>
                  ) : null}
                </div>
              </div>

              <span className={theme.filterSummaryHint ?? "text-xs text-muted-foreground group-open:hidden"}>
                Tap to open
              </span>
              <span className={theme.filterSummaryHint ?? "text-xs text-muted-foreground hidden group-open:block"}>
                Tap to close
              </span>
            </summary>

            <div className="px-6 pb-6">
              <form method="GET" className="grid gap-4">
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5">
                    <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
                      Search
                    </label>
                    <input
                      name="q"
                      defaultValue={q}
                      placeholder="Search products…"
                      className={
                        theme.filterInput ??
                        "mt-2 h-12 w-full rounded-2xl border border-border bg-background/65 px-4 text-sm outline-none\n                      focus:ring-2 focus:ring-ring focus:bg-background transition"
                      }
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
                      Category
                    </label>
                    <select
                      name="category"
                      defaultValue={category}
                      className={
                        theme.filterSelect ??
                        theme.filterInput ??
                        "mt-2 h-12 w-full rounded-2xl border border-border bg-background/65 px-4 text-sm outline-none\n                      focus:ring-2 focus:ring-ring focus:bg-background transition"
                      }
                    >
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
                      Sort
                    </label>
                    <select
                      name="sort"
                      defaultValue={sort}
                      className={
                        theme.filterSelect ??
                        theme.filterInput ??
                        "mt-2 h-12 w-full rounded-2xl border border-border bg-background/65 px-4 text-sm outline-none\n                      focus:ring-2 focus:ring-ring focus:bg-background transition"
                      }
                    >
                      <option value="latest">Latest</option>
                      <option value="offer">Offers</option>
                      <option value="price_asc">Price Low → High</option>
                      <option value="price_desc">Price High → Low</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
                      Price
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        name="minPrice"
                        defaultValue={minPrice}
                        inputMode="decimal"
                        placeholder="Min"
                        className={
                          (theme.filterInput
                            ? theme.filterInput.replace("px-4", "px-3")
                            : undefined) ??
                          "h-12 w-full rounded-2xl border border-border bg-background/65 px-3 text-sm outline-none\n                        focus:ring-2 focus:ring-ring focus:bg-background transition"
                        }
                      />
                      <input
                        name="maxPrice"
                        defaultValue={maxPrice}
                        inputMode="decimal"
                        placeholder="Max"
                        className={
                          (theme.filterInput
                            ? theme.filterInput.replace("px-4", "px-3")
                            : undefined) ??
                          "h-12 w-full rounded-2xl border border-border bg-background/65 px-3 text-sm outline-none\n                        focus:ring-2 focus:ring-ring focus:bg-background transition"
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-6">
                    <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
                      Attributes
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        name="size"
                        defaultValue={size}
                        placeholder="Size (S/M/L)"
                        className={
                          (theme.filterInput
                            ? theme.filterInput.replace("mt-2 ", "")
                            : undefined) ??
                          "h-12 w-full rounded-2xl border border-border bg-background/65 px-4 text-sm outline-none\n                        focus:ring-2 focus:ring-ring focus:bg-background transition"
                        }
                      />
                      <input
                        name="color"
                        defaultValue={color}
                        placeholder="Color"
                        className={
                          (theme.filterInput
                            ? theme.filterInput.replace("mt-2 ", "")
                            : undefined) ??
                          "h-12 w-full rounded-2xl border border-border bg-background/65 px-4 text-sm outline-none\n                        focus:ring-2 focus:ring-ring focus:bg-background transition"
                        }
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <input name="inStock" type="checkbox" defaultChecked={inStock} />
                        <span>In stock</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <input name="discountOnly" type="checkbox" defaultChecked={discountOnly} />
                        <span>Discount only</span>
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-6 flex flex-wrap gap-2 justify-start md:justify-end">
                    <button
                      className="h-12 rounded-2xl bg-primary px-8 text-sm font-semibold text-primary-foreground
                      shadow-[0_18px_45px_rgba(0,0,0,0.10)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.14)] hover:-translate-y-px active:translate-y-0 transition
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Apply Filters
                    </button>

                    <a
                      href={`/${lang}`}
                      className="h-12 rounded-2xl border border-border bg-background/65 px-8 text-sm font-semibold inline-flex items-center justify-center
                      hover:bg-muted/40 hover:-translate-y-px active:translate-y-0 transition
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Reset
                    </a>
                  </div>
                </div>

                {/* Active chips (removable) */}
                {hasFilters ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {q ? (
                      <FilterChip label={`Search: ${q}`} href={buildHref({ q: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {category ? (
                      <FilterChip label={`Category`} href={buildHref({ category: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {size ? (
                      <FilterChip label={`Size: ${size}`} href={buildHref({ size: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {color ? (
                      <FilterChip label={`Color: ${color}`} href={buildHref({ color: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {minPrice ? (
                      <FilterChip label={`Min ₹${minPrice}`} href={buildHref({ minPrice: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {maxPrice ? (
                      <FilterChip label={`Max ₹${maxPrice}`} href={buildHref({ maxPrice: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {inStock ? (
                      <FilterChip label={`In stock`} href={buildHref({ inStock: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {discountOnly ? (
                      <FilterChip label={`Discount only`} href={buildHref({ discountOnly: null })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
                    ) : null}
                    {sort !== "latest" ? (
                      <FilterChip label={`Sort: ${sort}`} href={buildHref({ sort: "latest" })} className={theme.filterChip} closeClassName={theme.filterChipClose} />
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
          {/* Trending */}
          <section className="mx-auto max-w-6xl px-4 py-12">
            <SectionHeader
              eyebrow="Trending"
              title="Trending Products"
              actionHref={`/${lang}?sort=latest`}
              actionLabel="Browse all"
              eyebrowClassName={theme.sectionEyebrow}
              titleClassName={theme.sectionTitle}
              actionClassName={theme.sectionAction}
            />

            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {trending.map((p) => (
                <div
                  key={p.id}
                  className={
                    theme.productWrapper ??
                    "transition hover:-translate-y-1 hover:shadow-lg"
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
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="mx-auto max-w-6xl px-4">
            <AdSlot placement="HOME_BETWEEN_SECTIONS" />
          </div>

          {/* ✅ Brands (Premium Styled) */}
          <section className="mx-auto max-w-6xl px-4 py-14">
            <div
              className={
                theme.brandsShell ??
                "relative overflow-hidden rounded-[44px] border border-border bg-card/55 backdrop-blur-2xl shadow-[0_22px_90px_rgba(0,0,0,0.08)]"
              }
            >
              {/* Glow / background */}
              <div
                className={
                  theme.brandsGlow ??
                  "absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-muted/30"
                }
              />
              <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-muted/40 blur-3xl" />
              <div
                className={
                  theme.brandsDot ??
                  "absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle_at_top,black_1px,transparent_1px)] bg-size-[22px_22px]"
                }
              />

              <div className="relative px-7 md:px-10 py-10">
                <SectionHeader
                  eyebrow="Brands"
                  title="Popular Brands"
                  actionHref={`/${lang}`}
                  actionLabel="View all"
                  eyebrowClassName={theme.sectionEyebrow}
                  titleClassName={theme.sectionTitle}
                  actionClassName={theme.sectionAction}
                />

                <p className="mt-3 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
                  Discover premium vendors and artisan labels — curated for quality, authenticity and timeless style.
                </p>

                {/* Luxe Scroll Wrapper */}
                <div className="mt-8">
                  <div className="relative">
                    {/* Edge fades */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-card/95 to-transparent z-10" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-card/95 to-transparent z-10" />

                    {/* Your existing BrandCarousel */}
                    <div className="overflow-x-auto pb-2 mask-[linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
                      <div className="min-w-max">
                        <BrandCarousel brands={brands} langPrefix={`/${lang}`} />
                      </div>
                    </div>
                  </div>

                  {/* Small hint */}
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="uppercase tracking-[0.22em]">Top Sellers</span>
                    <span className="opacity-70">Scroll →</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Latest + Offers */}
          <section className="mx-auto max-w-6xl px-4 py-12">
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <SectionHeader
                  eyebrow="New"
                  title="Latest Products"
                  actionHref={`/${lang}?sort=latest`}
                  actionLabel="See more"
                  eyebrowClassName={theme.sectionEyebrow}
                  titleClassName={theme.sectionTitle}
                  actionClassName={theme.sectionAction}
                />
                <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {latest.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className={
                        theme.productWrapper ??
                        "transition hover:-translate-y-1 hover:shadow-lg"
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
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SectionHeader
                  eyebrow="Deals"
                  title="Special Offers"
                  actionHref={`/${lang}?sort=offer`}
                  actionLabel="See all offers"
                  eyebrowClassName={theme.sectionEyebrow}
                  titleClassName={theme.sectionTitle}
                  actionClassName={theme.sectionAction}
                />
                <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {offers.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className={
                        theme.productWrapper ??
                        "transition hover:-translate-y-1 hover:shadow-lg"
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
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* ✅ PRODUCTS */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className={theme.sectionEyebrow ?? "text-[11px] tracking-[0.22em] uppercase text-muted-foreground"}>
              Featured Products
            </div>
            <h2 className={theme.sectionTitle ? theme.sectionTitle.replace("md:text-3xl", "md:text-4xl") : "mt-2 font-heading text-2xl md:text-4xl tracking-tight text-foreground"}>
              Curated pieces, crafted to last.
            </h2>
          </div>

          <div className="text-sm text-muted-foreground">
            {products.length} items found
          </div>
        </div>

        <Divider className={theme.dividerShell} glowClassName={theme.dividerGlow} />

        {q ? (
          <div className="mt-6">
            <AdSlot placement="SEARCH_TOP" />
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className={
                theme.productWrapper ??
                "transition hover:-translate-y-1 hover:shadow-lg"
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
                }}
              />
            </div>
          ))}
        </div>

        {/* Empty State */}
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
    </div>
  );
}

