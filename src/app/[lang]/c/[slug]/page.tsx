import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import { AdSlot } from "@/components/ads/AdSlot";

export const metadata: Metadata = {
  title: "Gift Products Category in Noida & Delhi NCR | Bohosaaz",
  description:
    "Explore Bohosaaz category-wise gift products for Noida, Greater Noida, New Delhi and Delhi NCR, including birthday gifts, anniversary gifts, corporate gifts and premium gifting ideas.",
  keywords: ["gift category Noida", "gift products Delhi NCR", "online gifting Greater Noida", "premium gifts New Delhi"],
};

function toBool(v: unknown) {
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) throw new Error("Invalid locale");

  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const size = typeof sp.size === "string" ? sp.size.trim() : "";
  const color = typeof sp.color === "string" ? sp.color.trim() : "";
  const minPrice = typeof sp.minPrice === "string" ? sp.minPrice.trim() : "";
  const maxPrice = typeof sp.maxPrice === "string" ? sp.maxPrice.trim() : "";
  const sort = typeof sp.sort === "string" ? sp.sort.trim() : "latest";
  const inStock = toBool(sp.inStock);
  const discountOnly = toBool(sp.discountOnly);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const qs = new URLSearchParams();
  qs.set("category", slug);
  if (q) qs.set("q", q);
  if (size) qs.set("size", size);
  if (color) qs.set("color", color);
  if (minPrice) qs.set("minPrice", minPrice);
  if (maxPrice) qs.set("maxPrice", maxPrice);
  if (inStock) qs.set("inStock", "1");
  if (discountOnly) qs.set("discountOnly", "1");
  if (sort === "offer") qs.set("mode", "offers");
  else if (sort && sort !== "latest") qs.set("sort", sort);

  const [cat, prodRes] = await Promise.all([
    prisma.category.findUnique({ where: { slug }, select: { name: true } }),
    fetch(`${baseUrl}/api/products?${qs.toString()}`, { cache: "no-store" }).then((r) => r.json().catch(() => ({}))),
  ]);

  const products: ProductCardProduct[] = (() => {
    const res = prodRes as unknown;
    const maybeProducts = (res as { products?: unknown })?.products;
    return Array.isArray(maybeProducts) ? (maybeProducts as ProductCardProduct[]) : [];
  })();

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -left-20 top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-48 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-[46px] border border-primary/15 bg-linear-to-br from-card/90 via-background/75 to-primary/8 p-6 shadow-premium backdrop-blur-2xl md:p-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <div className="inline-flex rounded-full border border-primary/15 bg-background/75 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-primary/80 shadow-sm backdrop-blur">
              Gift Collection
            </div>
            <h1 className="mt-4 font-heading text-4xl tracking-tight text-foreground md:text-6xl">
              {cat?.name || slug}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Browse thoughtful gifts, curated picks and premium pieces selected for meaningful moments.
            </p>
          </div>
          <div className="rounded-[30px] border border-primary/10 bg-background/70 p-5 shadow-[0_16px_45px_rgba(47,38,34,0.07)] backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Available now</div>
            <div className="mt-2 font-heading text-3xl text-foreground">{products.length}</div>
            <p className="mt-1 text-sm text-muted-foreground">products matching this collection</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <AdSlot placement="CATEGORY_TOP" />
      </div>

      <details open className="mt-6 overflow-hidden rounded-[38px] border border-primary/15 bg-card/85 shadow-[0_24px_80px_rgba(47,38,34,0.10)] backdrop-blur-2xl">
        <summary className="relative cursor-pointer list-none px-5 py-5 md:px-6">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-primary/8 via-transparent to-amber-500/8" />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.26em] text-primary/80">Smart Filters</div>
            <div className="mt-1 text-base font-semibold">Refine gifts by style, price and availability</div>
          </div>
        </summary>

        <form method="GET" className="grid gap-4 px-5 pb-5 md:px-6 md:pb-6 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-start">
          <div className="rounded-[30px] border border-primary/15 bg-linear-to-br from-background/90 via-card/75 to-primary/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_18px_55px_rgba(47,38,34,0.06)] lg:col-start-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Search</label>
              <input
                name="q"
                defaultValue={q}
                placeholder="Search products…"
                className="mt-2 h-12 w-full rounded-2xl border border-primary/15 bg-background/80 px-4 text-sm shadow-(--shadowInputInset) outline-none transition focus:border-primary/35 focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Sort</label>
              <select
                name="sort"
                defaultValue={sort}
                className="mt-2 h-12 w-full rounded-2xl border border-primary/15 bg-background/80 px-4 text-sm shadow-(--shadowInputInset) outline-none transition focus:border-primary/35 focus:ring-4 focus:ring-primary/10"
              >
                <option value="latest">Latest</option>
                <option value="offer">Offers</option>
                <option value="price_asc">Price Low → High</option>
                <option value="price_desc">Price High → Low</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Price</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  name="minPrice"
                  defaultValue={minPrice}
                  inputMode="decimal"
                  placeholder="Min"
                  className="h-12 w-full rounded-2xl border border-primary/15 bg-background/80 px-3 text-sm shadow-(--shadowInputInset) outline-none transition focus:border-primary/35 focus:ring-4 focus:ring-primary/10"
                />
                <input
                  name="maxPrice"
                  defaultValue={maxPrice}
                  inputMode="decimal"
                  placeholder="Max"
                  className="h-12 w-full rounded-2xl border border-primary/15 bg-background/80 px-3 text-sm shadow-(--shadowInputInset) outline-none transition focus:border-primary/35 focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>
          </div>

            <div className="mt-5">
              <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Attributes</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  name="size"
                  defaultValue={size}
                  placeholder="Size (S/M/L)"
                  className="h-12 w-full rounded-2xl border border-primary/15 bg-background/80 px-4 text-sm shadow-(--shadowInputInset) outline-none transition focus:border-primary/35 focus:ring-4 focus:ring-primary/10"
                />
                <input
                  name="color"
                  defaultValue={color}
                  placeholder="Color"
                  className="h-12 w-full rounded-2xl border border-primary/15 bg-background/80 px-4 text-sm shadow-(--shadowInputInset) outline-none transition focus:border-primary/35 focus:ring-4 focus:ring-primary/10"
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
          </div>

            <div className="flex flex-col rounded-[30px] border border-primary/15 bg-linear-to-br from-primary/12 via-card/85 to-background/80 p-4 shadow-[0_18px_55px_rgba(47,38,34,0.08)] lg:col-start-2 lg:row-start-1">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-primary/80">Ready</div>
                <div className="mt-1 font-heading text-2xl tracking-tight text-foreground">Apply filters</div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Quickly refine this collection into the right gifting shortlist.
                </p>
              </div>

              <div className="pt-5">
                <button className="h-12 w-full rounded-2xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-premium hover:brightness-95 transition">
                  Apply Filters
                </button>
                <a
                  href={`/${lang}/c/${encodeURIComponent(slug)}`}
                  className="mt-3 h-12 w-full rounded-2xl border border-border bg-background/65 px-8 text-sm font-semibold inline-flex items-center justify-center hover:bg-muted/40 transition"
                >
                  Reset
                </a>
              </div>
            </div>
        </form>
      </details>

      <div className="mt-5 grid auto-rows-fr grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            langPrefix={`/${lang}`}
            product={p}
          />
        ))}
      </div>

      {products.length === 0 ? (
        <div className="mt-10 rounded-[34px] border border-dashed border-border bg-card/80 p-10 text-center shadow-sm">
          <div className="font-heading text-2xl text-foreground">No gifts found</div>
          <p className="mt-2 text-sm text-muted-foreground">Try changing price, color or stock filters.</p>
        </div>
      ) : null}
    </div>
  );
}
