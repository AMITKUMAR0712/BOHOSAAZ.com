import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import { AdSlot } from "@/components/ads/AdSlot";

export const metadata: Metadata = {
  title: "Category | Bohosaaz",
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
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="rounded-4xl border border-border bg-card/70 backdrop-blur-xl p-6 md:p-10 shadow-premium">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Category</div>
        <h1 className="mt-3 font-heading text-4xl md:text-5xl tracking-tight">
          {cat?.name || slug}
        </h1>
        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
          Browse curated products in this category.
        </p>
      </div>

      <div className="mt-6">
        <AdSlot placement="CATEGORY_TOP" />
      </div>

      <details open className="mt-6 rounded-4xl border border-border bg-card/60 backdrop-blur-xl p-4">
        <summary className="cursor-pointer list-none">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Filters</div>
          <div className="text-sm font-semibold">Refine your results</div>
        </summary>

        <form method="GET" className="mt-4 grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Search</label>
              <input
                name="q"
                defaultValue={q}
                placeholder="Search products…"
                className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/65 px-4 text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-background transition"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Sort</label>
              <select
                name="sort"
                defaultValue={sort}
                className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/65 px-4 text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-background transition"
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
                  className="h-12 w-full rounded-2xl border border-border bg-background/65 px-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-background transition"
                />
                <input
                  name="maxPrice"
                  defaultValue={maxPrice}
                  inputMode="decimal"
                  placeholder="Max"
                  className="h-12 w-full rounded-2xl border border-border bg-background/65 px-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-background transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-6">
              <label className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Attributes</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  name="size"
                  defaultValue={size}
                  placeholder="Size (S/M/L)"
                  className="h-12 w-full rounded-2xl border border-border bg-background/65 px-4 text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-background transition"
                />
                <input
                  name="color"
                  defaultValue={color}
                  placeholder="Color"
                  className="h-12 w-full rounded-2xl border border-border bg-background/65 px-4 text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-background transition"
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
              <button className="h-12 rounded-2xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-premium hover:brightness-95 transition">
                Apply Filters
              </button>
              <a
                href={`/${lang}/c/${encodeURIComponent(slug)}`}
                className="h-12 rounded-2xl border border-border bg-background/65 px-8 text-sm font-semibold inline-flex items-center justify-center hover:bg-muted/40 transition"
              >
                Reset
              </a>
            </div>
          </div>
        </form>
      </details>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            langPrefix={`/${lang}`}
            product={p}
          />
        ))}
      </div>

      {products.length === 0 ? (
        <div className="mt-10 rounded-(--radius) border border-border bg-card p-6 text-sm text-muted-foreground">
          No products found.
        </div>
      ) : null}
    </div>
  );
}
