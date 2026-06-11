import Link from "next/link";
import { isLocale } from "@/lib/i18n";
import ProductGalleryClient from "@/app/p/[slug]/ProductGalleryClient";
import PurchasePanel from "@/app/p/[slug]/ui";
import { Card } from "@/components/ui/card";
import { RatingRow } from "@/components/ui/rating-row";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { headers } from "next/headers";
import { formatPriceInCurrency } from "@/lib/currency-utils";

function pickStockImage(key: string) {
  const s = key || "x";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const idx = (h % 7) + 1;
  return `/s${idx}.jpg`;
}

function parseCookies(cookieHeader: string | null) {
  if (!cookieHeader) return {} as Record<string, string>;
  return Object.fromEntries(
    cookieHeader.split(";").map((pair) => {
      const [name, ...rest] = pair.split("=");
      return [name?.trim(), decodeURIComponent(rest.join("=") || "")];
    })
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) throw new Error("Invalid locale");
  const lp = `/${lang}`;

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const cookieHeader = h.get("cookie") ?? "";
  const parsedCookies = parseCookies(cookieHeader);
  const userCurrency = parsedCookies["bohosaaz_currency"] === "USD" ? "USD" : "INR";

  const res = await fetch(`${origin}/api/products/${slug}`, { cache: "no-store" });

  if (!res.ok) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Product not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The product you’re looking for doesn’t exist or was removed.
          </p>
          <Link
            className="mt-5 inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2 text-sm font-medium hover:bg-muted transition"
            href={lp}
          >
            ← Back to Store
          </Link>
        </div>
      </div>
    );
  }

  const data = await res.json();
  type ProductTagRow = { tag: { name: string } };
  type ProductImageRow = { url: string; isPrimary?: boolean };
  type ProductVariantRow = {
    id: string;
    size: string;
    color: string | null;
    sku: string;
    price: number;
    salePrice: number | null;
    stock: number;
    isActive?: boolean;
  };
  type SimilarProductRow = {
    id: string;
    slug: string;
    title: string;
    images?: Array<{ url: string }>;
    currency?: "INR" | "USD";
    price?: number;
    salePrice?: number | null;
  };

  const p = data.product as {
    id: string;
    title: string;
    slug: string;
    description?: string | null;
    shortDescription?: string | null;
    currency: "INR" | "USD";
    mrp?: number | null;
    price?: number;
    salePrice?: number | null;
    stock?: number;
    sku?: string | null;
    barcode?: string | null;
    material?: string | null;
    weight?: number | null;
    shippingClass?: string | null;
    dimensions?: unknown;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    countryOfOrigin?: string | null;
    warranty?: string | null;
    returnPolicy?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    metaKeywords?: string | null;
    sizeOptions?: string | null;
    colorOptions?: string | null;
    vendor?: { shopName?: string | null; displayName?: string | null; status?: string | null; contactEmail?: string | null; contactPhone?: string | null };
    category?: { id?: string; name?: string | null };
    brand?: { name?: string | null };
    images?: ProductImageRow[];
    variants?: ProductVariantRow[];
    tags?: ProductTagRow[];
    forceCodOnly?: boolean | null;
  };

  const money = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return formatPriceInCurrency(Number(value), p.currency === "USD" ? "USD" : "INR", userCurrency);
  };

  const text = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    const s = String(value);
    return s.trim() ? s : "—";
  };

  const tagsText = Array.isArray(p?.tags) ? p.tags.map((t) => t?.tag?.name).filter(Boolean).join(", ") : "";
  const formatDimensions = () => {
    if (p?.dimensions && typeof p.dimensions === "object" && !Array.isArray(p.dimensions)) {
      const dims = p.dimensions as Record<string, unknown>;
      if (typeof dims.raw === "string" && dims.raw.trim()) return dims.raw.trim();

      const unit = typeof dims.unit === "string" && dims.unit.trim() ? ` ${dims.unit.trim()}` : "";
      const parts = [
        dims.length !== null && dims.length !== undefined ? `L ${text(dims.length)}${unit}` : null,
        dims.width !== null && dims.width !== undefined ? `W ${text(dims.width)}${unit}` : null,
        dims.height !== null && dims.height !== undefined ? `H ${text(dims.height)}${unit}` : null,
      ].filter(Boolean);

      if (parts.length) return parts.join(" × ");
    }

    const parts = [
      p?.length !== null && p?.length !== undefined ? `L ${text(p.length)}` : null,
      p?.width !== null && p?.width !== undefined ? `W ${text(p.width)}` : null,
      p?.height !== null && p?.height !== undefined ? `H ${text(p.height)}` : null,
    ].filter(Boolean);

    return parts.length ? parts.join(" × ") : "—";
  };
  const dimsText = formatDimensions();

  const images = (() => {
    const list = Array.isArray(p?.images) ? p.images : [];
    if (list.length) return list;
    return [{ url: pickStockImage(String(slug)), isPrimary: true }];
  })();

  /* ✅ Similar Products Fetch */
  let similar: SimilarProductRow[] = [];
  try {
    const cat = p?.category?.id || p?.category?.name || "";
    const simRes = await fetch(
      `${origin}/api/products?limit=4&category=${encodeURIComponent(cat)}&exclude=${encodeURIComponent(
        p.id
      )}`,
      { cache: "no-store" }
    );
    if (simRes.ok) {
      const simData = await simRes.json();
      const list = (simData?.products || simData || []) as unknown;
      similar = Array.isArray(list) ? (list as SimilarProductRow[]) : [];
    }
  } catch {
    similar = [];
  }

  return (
    <div className="relative overflow-x-hidden mobile-bottom-safe">
      {/* ✅ Premium Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-88 w-2xl sm:h-104 sm:w-3xl rounded-full bg-muted/30 blur-3xl" />
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-24 h-64 w-64 rounded-full bg-muted/50 blur-3xl" />
      </div>

      <div className="site-container pt-5 pb-4 md:pt-10 md:pb-6">
        {/* ✅ Top Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Link
            className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition"
            href={lp}
          >
            <span className="text-base">←</span> Back to Store
          </Link>

          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span>Home</span>
            <span className="opacity-50">/</span>
            <span>{p?.category?.name || "Products"}</span>
            <span className="opacity-50">/</span>
            <span className="text-foreground font-medium">{p?.title}</span>
          </div>
        </div>

        {/* ✅ Main Layout */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-2 lg:gap-10">
          {/* ✅ Left Side: Gallery + Premium Fill Area */}
          <div className="space-y-4 md:space-y-6">
            {/* ✅ Gallery (Fixed blank issue) */}
            <Card className="overflow-hidden rounded-[24px] border border-border/80 bg-card/85 shadow-premium backdrop-blur-xl md:rounded-[28px]">
              <div className="relative min-h-[360px] bg-muted/20 sm:min-h-[420px] md:min-h-128">
                <ProductGalleryClient title={p.title} images={images} />

                {/* ✅ Overlay gradient */}
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent" />
              </div>
            </Card>

            {/* ✅ NEW: Fill the Blank Space (Highlights + Trust + Support) */}
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="rounded-[22px] border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-xl transition hover:shadow-md md:rounded-[26px] md:p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Product Highlights
                </div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Handmade premium finish
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Small batch crafted
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Long lasting quality
                  </li>
                </ul>
              </div>

              <div className="rounded-[22px] border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-xl transition hover:shadow-md md:rounded-[26px] md:p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Seller Trust
                </div>
                <div className="mt-3 grid gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Dispatch</span>
                    <span className="font-medium text-foreground">2–5 days</span>
                  </div>
                  <div className="h-px w-full bg-border/60" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Returns</span>
                    <span className="font-medium text-foreground">Easy</span>
                  </div>
                  <div className="h-px w-full bg-border/60" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Payments</span>
                    <span className="font-medium text-foreground">Secure</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ Contact box */}
            <div className="rounded-[26px] border border-border/80 bg-background/70 p-5 shadow-sm backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Need help?
              </div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                If you want help, please{" "}
                <Link
                  href={`${lp}/contact`}
                  className="font-semibold text-foreground hover:text-primary underline-offset-4 hover:underline transition"
                >
                  contact us
                </Link>
                .
              </p>
            </div>
          </div>

          {/* ✅ Right Side Purchase Panel */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-[26px] border border-border/80 bg-card/90 p-4 shadow-premium backdrop-blur-xl sm:rounded-[30px] sm:p-5 md:p-7">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:gap-2 sm:text-[11px] sm:tracking-[0.18em]">
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1">
                  {p?.category?.name || "Uncategorized"}
                </span>
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1">
                  {p?.vendor?.shopName || "Vendor"}
                </span>
                {Number(p.stock) <= 0 ? (
                  <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-red-500">
                    Out of stock
                  </span>
                ) : (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-600">
                    In stock
                  </span>
                )}
              </div>

              <h1 className="mt-3 font-heading text-[1.32rem] leading-[1.16] tracking-tight text-foreground sm:mt-4 sm:text-[1.55rem] md:text-[1.9rem]">
                {p.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatingRow rating={4.8} count={129} />
                <span className="text-xs text-muted-foreground">• Verified Reviews</span>
              </div>

              <div className="my-4 h-px w-full bg-border sm:my-6" />

              <PurchasePanel
                langPrefix={lp}
                productId={p.id}
                currency={p.currency === "USD" ? "USD" : "INR"}
                mrp={p.mrp ?? null}
                price={Number(p.price ?? 0)}
                salePrice={(p.salePrice ?? null) as number | null}
                stock={Number(p.stock)}
                variants={
                  Array.isArray(p?.variants)
                    ? p.variants.map((v) => ({ ...v, isActive: v.isActive ?? true }))
                    : []
                }
                disabled={Number(p.stock) <= 0}
                forceCodOnly={Boolean(p.forceCodOnly)}
                isVendorProduct={Boolean(p.vendor)}
               />
            </div>
          </div>

          <section className="overflow-hidden rounded-[30px] border border-border/80 bg-card/88 shadow-premium backdrop-blur-xl lg:col-span-2">
            <div className="flex flex-col gap-2 border-b border-border/70 bg-linear-to-r from-background/85 via-card/80 to-primary/8 px-5 py-5 md:flex-row md:items-end md:justify-between md:px-7">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-primary/80">Product Details</div>
                <h2 className="mt-2 font-heading text-2xl tracking-tight text-foreground">Everything about this product</h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Quick facts, specifications, delivery notes and care guidance in one clean section.
              </p>
            </div>

            <div className="grid gap-5 p-4 md:p-6 lg:grid-cols-[0.9fr_1.35fr]">
              <div className="rounded-[26px] border border-primary/15 bg-linear-to-br from-primary/10 via-background/80 to-amber-500/10 p-5 shadow-inner">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">At a glance</div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Material</div>
                    <div className="mt-1 font-medium text-foreground">{text(p.material)}</div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dimensions</div>
                    <div className="mt-1 font-medium text-foreground">{dimsText}</div>
                  </div>
                </div>
              </div>

              <Accordion className="overflow-hidden rounded-[26px] border-border/70 bg-background/75 shadow-[0_18px_55px_rgba(47,38,34,0.08)]">
                <AccordionItem title="Description" defaultOpen>
                  <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {p.description ? p.description : "No description provided."}
                  </div>
                </AccordionItem>

                <AccordionItem title="Product Specifications">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      <div className="text-muted-foreground">Vendor</div>
                      <div className="text-foreground wrap-break-word">{text(p?.vendor?.shopName || p?.vendor?.displayName)}</div>

                      <div className="text-muted-foreground">Category</div>
                      <div className="text-foreground wrap-break-word">{text(p?.category?.name)}</div>

                      <div className="text-muted-foreground">Brand</div>
                      <div className="text-foreground wrap-break-word">{text(p?.brand?.name)}</div>

                      <div className="text-muted-foreground">Price</div>
                      <div className="text-foreground wrap-break-word">{money(p.price)}</div>

                      <div className="text-muted-foreground">Sale price</div>
                      <div className="text-foreground wrap-break-word">{p.salePrice ? money(p.salePrice) : "—"}</div>

                      <div className="text-muted-foreground">Stock</div>
                      <div className="text-foreground wrap-break-word">{text(p.stock)}</div>

                      <div className="text-muted-foreground">Material</div>
                      <div className="text-foreground wrap-break-word">{text(p.material)}</div>

                      <div className="text-muted-foreground">Weight</div>
                      <div className="text-foreground wrap-break-word">{text(p.weight)}</div>

                      <div className="text-muted-foreground">Shipping class</div>
                      <div className="text-foreground wrap-break-word">{text(p.shippingClass)}</div>

                      <div className="text-muted-foreground">Dimensions</div>
                      <div className="text-foreground wrap-break-word">{dimsText}</div>

                      <div className="text-muted-foreground">Country of origin</div>
                      <div className="text-foreground wrap-break-word">{text(p.countryOfOrigin)}</div>

                      <div className="text-muted-foreground">Warranty</div>
                      <div className="text-foreground wrap-break-word">{text(p.warranty)}</div>

                      <div className="text-muted-foreground">Return policy</div>
                      <div className="text-foreground wrap-break-word whitespace-pre-wrap">{text(p.returnPolicy)}</div>

                      <div className="text-muted-foreground">Size options</div>
                      <div className="text-foreground wrap-break-word">{text(p.sizeOptions)}</div>

                      <div className="text-muted-foreground">Color options</div>
                      <div className="text-foreground wrap-break-word">{text(p.colorOptions)}</div>

                      <div className="text-muted-foreground">Tags</div>
                      <div className="text-foreground wrap-break-word">{text(tagsText)}</div>
                    </div>

                    <div className="grid gap-2">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Variants</div>
                      {Array.isArray(p?.variants) && p.variants.length ? (
                        <div className="grid gap-2">
                          {p.variants.map((v) => (
                            <div key={v.id} className="rounded-(--radius) border border-border bg-muted/20 p-3 text-sm">
                              <div className="font-medium text-foreground">{text(v.size)}{v.color ? ` • ${v.color}` : ""}</div>
                              <div className="mt-1 text-muted-foreground">
                                Price: {money(v.price)} • Sale: {v.salePrice ? money(v.salePrice) : "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No variants.</div>
                      )}
                    </div>
                  </div>
                </AccordionItem>

                <AccordionItem title="Delivery & Returns">
                  <div className="text-sm leading-relaxed text-muted-foreground">
                    Delivery times vary by location. Returns are accepted on eligible
                    items as per policy. Damaged items can be exchanged within
                    48 hours of delivery.
                  </div>
                </AccordionItem>

                <AccordionItem title="Care">
                  <div className="text-sm leading-relaxed text-muted-foreground">
                    Handle with care. Keep away from moisture and harsh chemicals.
                    Store in a cool, dry place.
                  </div>
                </AccordionItem>
              </Accordion>
            </div>
          </section>
        </div>

        {/* ✅ Similar Products Section */}
        {similar?.length > 0 && (
          <div className="mt-8 md:mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Recommended
                </div>
                <h3 className="font-heading text-xl md:text-2xl tracking-tight text-foreground">
                  Similar Products You’ll Love ✨
                </h3>
              </div>

              <Link
                href={`${lp}/latest`}
                className="text-sm text-muted-foreground hover:text-foreground transition underline-offset-4 hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-5 lg:grid-cols-4">
              {similar.map((sp) => {
                const img =
                  Array.isArray(sp?.images) && sp.images?.[0]?.url
                    ? sp.images[0].url
                    : pickStockImage(String(sp?.id || sp?.slug || "x"));

                const spCurrency = sp?.currency === "USD" ? "USD" : "INR";
                const spCurrent = sp?.salePrice ?? sp?.price;

                return (
                  <Link
                    key={sp.id}
                    href={`${lp}/p/${sp.slug}`}
                    className="group rounded-[26px] border border-border bg-card/80 backdrop-blur-xl overflow-hidden shadow-[0_18px_60px_-45px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:shadow-[0_28px_90px_-60px_rgba(0,0,0,0.75)] transition"
                  >
                    <div className="aspect-4/3 bg-muted/40 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={sp.title}
                        className="h-full w-full object-cover group-hover:scale-[1.06] transition duration-500"
                      />
                    </div>

                    <div className="p-4">
                      <div className="font-heading text-base text-foreground line-clamp-1">
                        {sp.title}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {typeof spCurrent === "number"
                            ? formatPriceInCurrency(Number(spCurrent), spCurrency, userCurrency)
                            : ""}
                        </div>
                        <div className="text-xs text-muted-foreground opacity-80">
                          View →
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
