import Link from "next/link";
import { isLocale } from "@/lib/i18n";
import ProductGalleryClient from "@/app/p/[slug]/ProductGalleryClient";
import PurchasePanel from "@/app/p/[slug]/ui";
import { Card } from "@/components/ui/card";
import { RatingRow } from "@/components/ui/rating-row";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { headers } from "next/headers";
import { formatMoney } from "@/lib/money";
import { AdSlot } from "@/components/ads/AdSlot";

function pickStockImage(key: string) {
  const s = key || "x";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const idx = (h % 7) + 1;
  return `/s${idx}.jpg`;
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
  };

  const money = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return formatMoney(p.currency === "USD" ? "USD" : "INR", Number(value));
  };

  const text = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    const s = String(value);
    return s.trim() ? s : "—";
  };

  const tagsText = Array.isArray(p?.tags) ? p.tags.map((t) => t?.tag?.name).filter(Boolean).join(", ") : "";
  const dimsText =
    p?.dimensions && typeof p.dimensions === "object"
      ? JSON.stringify(p.dimensions)
      : [p?.length, p?.width, p?.height].some((n) => n !== null && n !== undefined)
        ? `${text(p?.length)} × ${text(p?.width)} × ${text(p?.height)}`
        : "—";

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
    <div className="relative overflow-x-hidden">
      {/* ✅ Premium Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-88 w-2xl sm:h-104 sm:w-3xl rounded-full bg-muted/30 blur-3xl" />
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-24 h-64 w-64 rounded-full bg-muted/50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
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
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* ✅ Left Side: Gallery + Premium Fill Area */}
          <div className="space-y-6">
            {/* ✅ Gallery (Fixed blank issue) */}
            <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_70px_-40px_rgba(0,0,0,0.55)]">
              <div className="relative min-h-88 sm:min-h-104 md:min-h-128 bg-muted/20">
                <ProductGalleryClient title={p.title} images={images} />

                {/* ✅ Overlay gradient */}
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/10 via-transparent to-transparent" />
              </div>
            </Card>

            {/* ✅ NEW: Fill the Blank Space (Highlights + Trust + Support) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-md transition">
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

              <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-md transition">
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
            <div className="rounded-2xl border border-border bg-background/60 p-5 shadow-sm">
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
            <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_30px_80px_-55px_rgba(0,0,0,0.65)]">
              <div className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
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

              <h1 className="mt-4 font-heading text-3xl md:text-4xl tracking-tight text-foreground leading-tight">
                {p.title}
              </h1>

              <div className="mt-3 flex items-center gap-3">
                <RatingRow rating={4.8} count={129} />
                <span className="text-xs text-muted-foreground">• Verified Reviews</span>
              </div>

              <div className="my-6 h-px w-full bg-border" />

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
              />

              <p className="mt-5 text-xs text-muted-foreground leading-relaxed">
                ⚡ Tip: Add to cart quickly — limited stock items may sell out fast.
              </p>
            </div>

            <div className="mt-4">
              <AdSlot placement="PRODUCT_DETAIL_RIGHT" />
            </div>
          </div>
        </div>

        {/* ✅ Details Section */}
        <div className="mt-12 rounded-2xl border border-border bg-card overflow-hidden shadow-[0_16px_60px_-45px_rgba(0,0,0,0.6)]">
          <div className="px-6 py-5 border-b border-border">
            <h2 className="text-lg font-semibold tracking-tight">Product Details</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Everything you need to know about this product.
            </p>
          </div>

          <div className="p-4 md:p-6">
            <Accordion>
              <AccordionItem title="Description">
                <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {p.description ? p.description : "No description provided."}
                </div>
              </AccordionItem>

              <AccordionItem title="All Fields">
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <div className="text-muted-foreground">ID</div>
                    <div className="text-foreground wrap-break-word">{text(p.id)}</div>

                    <div className="text-muted-foreground">Slug</div>
                    <div className="text-foreground wrap-break-word">{text(p.slug)}</div>

                    <div className="text-muted-foreground">Vendor</div>
                    <div className="text-foreground wrap-break-word">{text(p?.vendor?.shopName || p?.vendor?.displayName)}</div>

                    <div className="text-muted-foreground">Vendor status</div>
                    <div className="text-foreground wrap-break-word">{text(p?.vendor?.status)}</div>

                    <div className="text-muted-foreground">Vendor contact</div>
                    <div className="text-foreground wrap-break-word">
                      {text([p?.vendor?.contactEmail, p?.vendor?.contactPhone].filter(Boolean).join(" • "))}
                    </div>

                    <div className="text-muted-foreground">Category</div>
                    <div className="text-foreground wrap-break-word">{text(p?.category?.name)}</div>

                    <div className="text-muted-foreground">Brand</div>
                    <div className="text-foreground wrap-break-word">{text(p?.brand?.name)}</div>

                    <div className="text-muted-foreground">Currency</div>
                    <div className="text-foreground wrap-break-word">{text(p.currency)}</div>

                    <div className="text-muted-foreground">MRP</div>
                    <div className="text-foreground wrap-break-word">{money(p.mrp)}</div>

                    <div className="text-muted-foreground">Price</div>
                    <div className="text-foreground wrap-break-word">{money(p.price)}</div>

                    <div className="text-muted-foreground">Sale price</div>
                    <div className="text-foreground wrap-break-word">{p.salePrice ? money(p.salePrice) : "—"}</div>

                    <div className="text-muted-foreground">Stock</div>
                    <div className="text-foreground wrap-break-word">{text(p.stock)}</div>

                    <div className="text-muted-foreground">SKU</div>
                    <div className="text-foreground wrap-break-word">{text(p.sku)}</div>

                    <div className="text-muted-foreground">Barcode</div>
                    <div className="text-foreground wrap-break-word">{text(p.barcode)}</div>

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

                    <div className="text-muted-foreground">Meta title</div>
                    <div className="text-foreground wrap-break-word">{text(p.metaTitle)}</div>

                    <div className="text-muted-foreground">Meta description</div>
                    <div className="text-foreground wrap-break-word whitespace-pre-wrap">{text(p.metaDescription)}</div>

                    <div className="text-muted-foreground">Meta keywords</div>
                    <div className="text-foreground wrap-break-word">{text(p.metaKeywords)}</div>

                    <div className="text-muted-foreground">Size options</div>
                    <div className="text-foreground wrap-break-word">{text(p.sizeOptions)}</div>

                    <div className="text-muted-foreground">Color options</div>
                    <div className="text-foreground wrap-break-word">{text(p.colorOptions)}</div>

                    <div className="text-muted-foreground">Tags</div>
                    <div className="text-foreground wrap-break-word">{text(tagsText)}</div>

                    <div className="text-muted-foreground">Images</div>
                    <div className="text-foreground wrap-break-word">{Array.isArray(p?.images) ? String(p.images.length) : "0"}</div>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Variants</div>
                    {Array.isArray(p?.variants) && p.variants.length ? (
                      <div className="grid gap-2">
                        {p.variants.map((v) => (
                          <div key={v.id} className="rounded-(--radius) border border-border bg-muted/20 p-3 text-sm">
                            <div className="font-medium text-foreground">{text(v.size)}{v.color ? ` • ${v.color}` : ""}</div>
                            <div className="mt-1 text-muted-foreground">
                              SKU: {text(v.sku)} • Price: {money(v.price)} • Sale: {v.salePrice ? money(v.salePrice) : "—"} • Stock: {text(v.stock)}
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
        </div>

        {/* ✅ Similar Products Section */}
        {similar?.length > 0 && (
          <div className="mt-14">
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

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
                          {typeof spCurrent === "number" ? formatMoney(spCurrency, Number(spCurrent)) : ""}
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
