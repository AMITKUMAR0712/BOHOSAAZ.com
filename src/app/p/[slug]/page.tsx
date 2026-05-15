import Link from "next/link";
import PurchasePanel from "./ui";
import { Card } from "@/components/ui/card";
import ProductGalleryClient from "./ProductGalleryClient";
import { RatingRow } from "@/components/ui/rating-row";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { headers } from "next/headers";
import { formatMoney } from "@/lib/money";

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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lp = "";

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${origin}/api/products/${slug}`, { cache: "no-store" });

  if (!res.ok) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <Link className="underline text-sm mt-3 block" href="/">
          ← Back to Store
        </Link>
      </div>
    );
  }

  const data = await res.json();
  const p = data.product;

  const money = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return formatMoney(p.currency === "USD" ? "USD" : "INR", Number(value));
  };

  const text = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    const s = String(value);
    return s.trim() ? s : "—";
  };

  const tagsText = Array.isArray(p?.tags) ? p.tags.map((t: any) => t?.tag?.name).filter(Boolean).join(", ") : "";
  const dimsText =
    p?.dimensions && typeof p.dimensions === "object"
      ? JSON.stringify(p.dimensions)
      : [p?.length, p?.width, p?.height].some((n: any) => n !== null && n !== undefined)
        ? `${text(p?.length)} × ${text(p?.width)} × ${text(p?.height)}`
        : "—";

  const images = (() => {
    const list = Array.isArray(p?.images) ? p.images : [];
    if (list.length) return list;
    return [{ url: pickStockImage(String(slug)), isPrimary: true }];
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <Link className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground hover:text-foreground transition" href={`${lp}/`}>
        ← Back to Store
      </Link>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="overflow-hidden shadow-premium">
          <ProductGalleryClient title={p.title} images={images} />
        </Card>

        <div className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-(--radius) border border-border bg-card p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">
              {p?.category?.name || "Uncategorized"} • {p?.vendor?.shopName || "Vendor"}
            </div>

            <h1 className="mt-2 font-heading text-3xl md:text-4xl tracking-tight text-foreground">{p.title}</h1>

            <div className="mt-3">
              <RatingRow rating={4.8} count={129} />
            </div>

            <div className="mt-6">
              <PurchasePanel
                langPrefix={lp}
                productId={p.id}
                currency={p.currency ?? "INR"}
                mrp={p.mrp ?? null}
                price={Number(p.price)}
                salePrice={p.salePrice ?? null}
                stock={Number(p.stock)}
                variants={Array.isArray(p?.variants) ? p.variants : []}
                disabled={Number(p.stock) <= 0}
              />
            </div>

            <div className="mt-6 grid gap-2 rounded-(--radius) border border-border bg-muted/25 p-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-4">
                <span>Dispatch</span>
                <span className="text-foreground">2–5 days</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Cash on Delivery</span>
                <span className="text-foreground">Available</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Secure Payments</span>
                <span className="text-foreground">Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-(--radius) border border-border bg-card">
        <Accordion>
          <AccordionItem title="Description">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {p.description ? p.description : "No description provided."}
            </div>
          </AccordionItem>

          <AccordionItem title="All Fields">
            <div className="grid gap-4 p-1">
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
                    {p.variants.map((v: any) => (
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
            <div className="text-sm text-muted-foreground">
              Delivery times vary by location. Returns are accepted on eligible items as per policy.
            </div>
          </AccordionItem>
          <AccordionItem title="Care">
            <div className="text-sm text-muted-foreground">
              Handle with care. Keep away from moisture and harsh chemicals.
            </div>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
