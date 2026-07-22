import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { isLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { formatPriceInCurrency } from "@/lib/currency-utils";
import {
  enabledShopFilterFields,
  normalizeShopFilterConfig,
  SHOP_FILTERS_SETTING_KEY,
  type ShopFilterFieldConfig,
  type ShopFilterKey,
  type ShopFilterOption,
} from "@/lib/shopFilters";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "en";
  return buildMetadata({
    title: "Shop Gifts in Noida & Delhi NCR",
    description:
      "Shop gifts in Noida, Greater Noida, New Delhi and Delhi NCR by occasion, recipient and budget. Explore birthday, anniversary, corporate and festival gifts.",
    path: `/${locale}/shop`,
  });
}

type SearchParams = Record<string, string | string[] | undefined>;
type FilterOption = readonly [string, string];
type ColorFilterOption = readonly [string, string, string];
type FilterOptionMap = Partial<Record<ShopFilterKey, readonly FilterOption[] | readonly ColorFilterOption[]>>;

type ProductImage = {
  url: string;
  isPrimary?: boolean;
};

type Product = {
  id: string;
  title: string;
  slug: string;
  currency?: "INR" | "USD" | string;
  mrp?: number | null;
  price: number;
  salePrice?: number | null;
  createdAt?: string;
  images?: ProductImage[];
  vendorId?: string | null;
  vendor?: { id?: string | null } | null;
};

function firstParam(sp: SearchParams, key: string) {
  const value = sp[key];
  return typeof value === "string" ? value.trim() : "";
}

function toTitleCase(text: string) {
  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function parseGroupedTag(name: string, slug: string) {
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
}

function swatchClassForColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("white")) return "bg-white";
  if (v.includes("black")) return "bg-black";
  if (v.includes("gold")) return "bg-[#d4af37]";
  if (v.includes("maroon")) return "bg-[#800000]";
  if (v.includes("beige")) return "bg-[#d8c3a5]";
  if (v.includes("multi")) return "bg-linear-to-br from-rose-400 via-amber-300 to-sky-400";
  if (v.includes("pastel")) return "bg-[#f7c8e0]";
  return "bg-muted";
}

function optionLabel(items: readonly (readonly [string, string, ...unknown[]])[], value: string) {
  return items.find(([v]) => v === value)?.[1] ?? value.replace(/[_-]+/g, " ");
}

function optionObjectsToTuples(options?: readonly ShopFilterOption[]): FilterOption[] {
  return (options ?? []).map((option) => [option.value, option.label]);
}

function mergeFilterOptions(...groups: readonly FilterOption[][]): FilterOption[] {
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
}

function displayBudgetOptions(options: FilterOption[], currency: "INR" | "USD"): FilterOption[] {
  return options.map(([value, label]) => {
    const match = value.match(/^(\d*)-(\d*)$/);
    if (!match) return [value, label];
    const min = match[1] ? Number(match[1]) : null;
    const max = match[2] ? Number(match[2]) : null;
    if (max != null && Number.isFinite(max) && (min == null || min === 0)) {
      return [value, `Under ${formatPriceInCurrency(max, "INR", currency)}`];
    }
    if (min != null && Number.isFinite(min) && max != null && Number.isFinite(max)) {
      return [value, `${formatPriceInCurrency(min, "INR", currency)} - ${formatPriceInCurrency(max, "INR", currency)}`];
    }
    if (min != null && Number.isFinite(min)) {
      return [value, `${formatPriceInCurrency(min, "INR", currency)}+`];
    }
    return [value, label];
  });
}

function fieldGridClass(field: ShopFilterFieldConfig) {
  if (field.type === "chips") return "md:col-span-12";
  if (field.key === "q") return "md:col-span-4";
  return "md:col-span-2";
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return notFound();

  const sp = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const selectedCurrency = cookieStore.get("bohosaaz_currency")?.value === "USD" ? "USD" : "INR";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const filterSetting = await prisma.setting.findUnique({
    where: { key: SHOP_FILTERS_SETTING_KEY },
    select: { value: true },
  });
  const filterConfig = normalizeShopFilterConfig(filterSetting?.value);
  const enabledFields = enabledShopFilterFields(filterConfig);
  const enabledKeys = new Set<ShopFilterKey>(enabledFields.map((field) => field.key));
  const getEnabledParam = (key: ShopFilterKey) => (enabledKeys.has(key) ? firstParam(sp, key) : "");

  const q = getEnabledParam("q");
  const category = getEnabledParam("category");
  const occasion = getEnabledParam("occasion");
  const recipient = getEnabledParam("recipient");
  const budget = getEnabledParam("budget");
  const availability = getEnabledParam("availability");
  const color = getEnabledParam("color");
  const size = getEnabledParam("size");
  const sort = getEnabledParam("sort") || "latest";
  const selectedValues: Record<ShopFilterKey, string> = {
    q,
    category,
    occasion,
    recipient,
    budget,
    availability,
    color,
    size,
    sort,
  };

  const buildHref = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    for (const field of enabledFields) {
      const value = selectedValues[field.key];
      if (!value) continue;
      if (field.key === "sort" && value === "latest") continue;
      next.set(field.key, value);
    }

    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }

    return `/${lang}/shop${next.toString() ? `?${next}` : ""}`;
  };

  const categories = await prisma.category.findMany({
    where: { isHidden: false },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

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

  const occasionOptions = groupedTagOptions.occasion ?? [];
  const recipientOptions = groupedTagOptions.recipient ?? [];
  const tagAvailabilityOptions = groupedTagOptions.availability ?? [];
  const categoryOptions: FilterOption[] = categories.map((c) => [c.slug || c.id, c.name]);

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
  const colorOptions: ColorFilterOption[] = colorValues.map((value) => [value, toTitleCase(value), swatchClassForColor(value)]);

  const variantSizes = await prisma.productVariant.findMany({
    where: { isActive: true, size: { not: "" }, product: { isActive: true, status: "PUBLISHED", deletedAt: null } },
    distinct: ["size"],
    select: { size: true },
    orderBy: { size: "asc" },
    take: 24,
  });
  const sizeFromProducts = await prisma.product.findMany({
    where: { isActive: true, status: "PUBLISHED", deletedAt: null, sizeOptions: { not: null } },
    distinct: ["sizeOptions"],
    select: { sizeOptions: true },
    take: 100,
  });
  const sizeValues = Array.from(
    new Set([
      ...variantSizes.map((row) => row.size).filter(Boolean),
      ...sizeFromProducts.flatMap((row) =>
        (row.sizeOptions ?? "")
          .split(/[,|/]/g)
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ]),
  ).slice(0, 24);
  const sizeOptions: FilterOption[] = sizeValues.map((value) => [value, toTitleCase(value)]);

  const [inStockCount, discountedCount] = await Promise.all([
    prisma.product.count({
      where: {
        isActive: true,
        status: "PUBLISHED",
        deletedAt: null,
        OR: [{ stock: { gt: 0 } }, { variants: { some: { isActive: true, stock: { gt: 0 } } } }],
      },
    }),
    prisma.product.count({ where: { isActive: true, status: "PUBLISHED", deletedAt: null, salePrice: { not: null } } }),
  ]);
  const systemAvailabilityOptions: FilterOption[] = [
    ...(inStockCount > 0 ? [["in_stock", "In Stock"] as const] : []),
    ...(discountedCount > 0 ? [["discounted", "Discounted"] as const] : []),
  ];

  const manualOptionsByKey = Object.fromEntries(
    filterConfig.fields.map((field) => [field.key, optionObjectsToTuples(field.options)])
  ) as Partial<Record<ShopFilterKey, FilterOption[]>>;
  const optionsByKey: FilterOptionMap = {
    q: [],
    occasion: mergeFilterOptions(manualOptionsByKey.occasion ?? [], occasionOptions),
    recipient: mergeFilterOptions(manualOptionsByKey.recipient ?? [], recipientOptions),
    budget: displayBudgetOptions(manualOptionsByKey.budget ?? [], selectedCurrency),
    sort: manualOptionsByKey.sort ?? [],
    category: categoryOptions,
    availability: mergeFilterOptions(
      manualOptionsByKey.availability ?? [],
      systemAvailabilityOptions,
      tagAvailabilityOptions
    ),
    color: colorOptions,
    size: sizeOptions,
  };

  const productQs = new URLSearchParams();
  productQs.set("limit", "60");
  if (q) productQs.set("q", q);
  if (category) productQs.set("category", category);
  if (occasion) productQs.set("occasion", occasion);
  if (recipient) productQs.set("recipient", recipient);
  if (budget) productQs.set("budget", budget);
  if (availability) productQs.set("availability", availability);
  if (availability === "in_stock") productQs.set("inStock", "1");
  if (color) productQs.set("color", color);
  if (size) productQs.set("size", size);
  if (sort && sort !== "latest") productQs.set("sort", sort);

  const productRes = await fetch(`${baseUrl}/api/products?${productQs}`, { cache: "no-store" });
  const productData = await productRes.json().catch(() => ({}));
  const products: Product[] = Array.isArray(productData?.products) ? productData.products : [];

  const activeFilters = enabledFields
    .map((field) => {
      const value = selectedValues[field.key];
      if (!value || (field.key === "sort" && value === "latest")) return null;
      const options = optionsByKey[field.key] ?? [];
      const label = field.key === "q" ? value : optionLabel(options, value);
      return [field.label, label, field.key] as [string, string, ShopFilterKey];
    })
    .filter((item): item is [string, string, ShopFilterKey] => Boolean(item));
  const premiumFilterFieldClass =
    "mt-2 h-12 w-full rounded-2xl border border-primary/15 bg-background/80 px-4 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_30px_rgba(47,38,34,0.04)] outline-none transition focus:border-primary/35 focus:bg-background focus:ring-4 focus:ring-primary/10";
  const intentFields = enabledFields.filter((field) => field.section === "intent");
  const refineFields = enabledFields.filter((field) => field.section === "refine");
  const renderFilterField = (field: ShopFilterFieldConfig) => {
    const options = optionsByKey[field.key] ?? [];

    if (field.type === "search") {
      return (
        <label key={field.key} className={fieldGridClass(field)}>
          <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{field.label}</span>
          <input
            name={field.key}
            defaultValue={selectedValues[field.key]}
            placeholder={field.placeholder}
            className={premiumFilterFieldClass}
          />
        </label>
      );
    }

    if (field.type === "chips") {
      if (!options.length) return null;
      return (
        <div key={field.key} className={`${fieldGridClass(field)} rounded-[24px] border border-border/70 bg-background/45 p-3`}>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{field.label}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((option) => {
              const [value, label] = option;
              const swatch = field.key === "color" ? ((option as readonly string[])[2] ?? "") : "";
              const selected = selectedValues[field.key] === value;
              return (
                <Link
                  key={value}
                  href={buildHref({ [field.key]: selected ? null : value })}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition hover:-translate-y-px ${
                    selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-card/70 hover:bg-muted/40"
                  }`}
                >
                  {swatch ? <span className={`h-4 w-4 rounded-full border border-border ${swatch}`} aria-hidden /> : null}
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <FilterSelect
        key={field.key}
        className={fieldGridClass(field)}
        name={field.key}
        label={field.label}
        value={selectedValues[field.key]}
        options={options as readonly FilterOption[]}
        placeholder={field.placeholder}
      />
    );
  };

  return (
    <main className="relative overflow-hidden bg-background mobile-bottom-safe">
      <div className="pointer-events-none absolute -left-28 top-6 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-64 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <section className="site-container -mt-140 pt-2 sm:-mt-148 sm:pt-4 xl:-mt-144">
        <div className="relative overflow-hidden rounded-[24px] border border-border/80 bg-card/80 p-4 shadow-premium backdrop-blur-xl md:rounded-[30px] md:p-5">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Gift Finder</div>
              <h1 className="mt-2 max-w-3xl font-heading text-2xl tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Discover gifts by occasion, person and feeling.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Search all products with clean filters for occasion, recipient, budget, category, availability and color.
              </p>
            </div>
            <div className="rounded-[22px] border border-border bg-background/65 p-4 shadow-sm md:rounded-[28px] md:p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Live catalog</div>
              <div className="mt-2 font-heading text-3xl text-foreground">{products.length}</div>
              <p className="mt-1 text-sm text-muted-foreground">gifts currently matching your selection</p>
            </div>
          </div>
        </div>
      </section>

      <section className="site-container py-3 sm:py-4">
        <details className="group overflow-hidden rounded-[26px] border border-primary/15 bg-card/85 shadow-[0_24px_80px_rgba(47,38,34,0.10)] backdrop-blur-2xl md:rounded-[38px]">
          <summary className="relative flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 md:px-6 md:py-5">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-primary/8 via-transparent to-amber-500/8" />
            <div className="relative">
              <div className="text-[11px] uppercase tracking-[0.26em] text-primary/80">Premium Filters</div>
              <div className="mt-1 text-sm font-semibold text-foreground sm:text-base">
                Build the perfect gift shortlist
                {activeFilters.length ? (
                  <span className="ml-1 text-xs font-medium text-muted-foreground sm:ml-2">• {activeFilters.length} applied</span>
                ) : null}
              </div>
            </div>
            <span className="relative shrink-0 rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground group-open:hidden">Filters</span>
            <span className="relative hidden shrink-0 rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground group-open:block">Close</span>
          </summary>

          <form action={`/${lang}/shop`} className="grid gap-4 px-4 pb-4 md:px-6 md:pb-6 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-start">
            {intentFields.length || refineFields.length ? (
              <div className="rounded-[22px] border border-primary/15 bg-linear-to-br from-background/90 via-card/75 to-primary/8 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_18px_55px_rgba(47,38,34,0.06)] md:rounded-[30px] md:p-4 lg:col-start-1">
                <div className="grid gap-3 md:grid-cols-12 md:gap-4">
                  {[...intentFields, ...refineFields].map(renderFilterField)}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col rounded-[22px] border border-primary/15 bg-linear-to-br from-primary/12 via-card/85 to-background/80 p-3 shadow-[0_18px_55px_rgba(47,38,34,0.08)] md:rounded-[30px] md:p-4 lg:col-start-2 lg:row-start-1">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-primary/80">Ready</div>
                <div className="mt-1 font-heading text-2xl tracking-tight text-foreground">Apply filters</div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Narrow the catalog into a premium shortlist.
                </p>
              </div>

              <div className="pt-5">
                <button className="h-12 w-full rounded-2xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-px hover:brightness-95">
                  Find Gifts
                </button>
                <Link href={`/${lang}/shop`} className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-border bg-background/70 px-8 text-sm font-semibold text-foreground transition hover:bg-muted/40">
                  Reset
                </Link>
              </div>
            </div>
          </form>
        </details>
      </section>

      <section className="site-container pb-8 pt-1 sm:pt-0">
        <div className="mb-4 flex flex-col gap-3 rounded-[24px] border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur md:mb-5 md:flex-row md:items-end md:justify-between md:rounded-[30px] md:p-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Results</div>
            <h2 className="mt-1 font-heading text-2xl tracking-tight text-foreground md:mt-2 md:text-3xl">{products.length} gifts found</h2>
          </div>
          {activeFilters.length ? (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map(([name, label, key]) => (
                <Link
                  key={key}
                  href={buildHref({ [key]: null })}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
                >
                  {name}: {label} ×
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {products.length ? (
          <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                langPrefix={`/${lang}`}
                enableImageSwipe
                product={{
                  id: String(product.id),
                  title: String(product.title || ""),
                  slug: String(product.slug || ""),
                  currency: (product.currency === "USD" ? "USD" : "INR") as "INR" | "USD",
                  mrp: product.mrp == null ? null : Number(product.mrp),
                  price: Number(product.price || 0),
                  salePrice: product.salePrice == null ? null : Number(product.salePrice),
                  createdAt: product.createdAt,
                  images: Array.isArray(product.images) ? product.images : [],
                  vendorId: product.vendorId ?? product.vendor?.id ?? null,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-border bg-card/80 p-8 text-center shadow-sm md:p-10">
            <div className="font-heading text-2xl text-foreground">No products found</div>
            <p className="mt-2 text-sm text-muted-foreground">Try changing occasion, budget, color or reset filters.</p>
            <Link href={`/${lang}/shop`} className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground">
              Reset Filters
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function FilterSelect({
  className,
  name,
  label,
  value,
  options,
  placeholder,
}: {
  className?: string;
  name: string;
  label: string;
  value: string;
  options: readonly FilterOption[];
  placeholder: string;
}) {
  return (
    <label className={className}>
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="mt-2 h-12 w-full rounded-2xl border border-primary/15 bg-background/80 px-4 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_30px_rgba(47,38,34,0.04)] outline-none transition focus:border-primary/35 focus:bg-background focus:ring-4 focus:ring-primary/10"
      >
        <option value="">{placeholder}</option>
        {options.map(([optionValue, optionLabelText]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabelText}
          </option>
        ))}
      </select>
    </label>
  );
}

