"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Price } from "@/components/ui/price";
import { useCurrency } from "@/lib/currency-context";
import { getPriceInCurrency } from "@/lib/currency-utils";

type CartItem = {
  id: string;
  quantity: number;
  price: number;
  variantSku?: string | null;
  variantSize?: string | null;
  variantColor?: string | null;
  variant?: { stock: number } | null;
  product: {
    id: string;
    title: string;
    slug: string;
    stock: number;
    currency: "INR" | "USD";
    vendor?: { shopName: string } | null;
    category?: { name: string } | null;
    images?: { url: string; isPrimary: boolean }[];
  };
};

type Order = {
  id: string;
  subtotal?: number;
  total: number;
  couponCode?: string | null;
  couponDiscount?: number;
  currency?: "INR" | "USD";
  items: CartItem[];
};

export default function CartClient({ langPrefix }: { langPrefix?: string }) {
  const lp = langPrefix || "";
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const { currency: selectedCurrency } = useCurrency();

  const itemCount = useMemo(() => {
    const items = order?.items || [];
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [order?.items]);

  const orderCurrency = order?.currency === "USD" ? "USD" : "INR";
  const displayCurrency = selectedCurrency;
  const displayAmount = (value: number) => getPriceInCurrency(Number(value || 0), orderCurrency, displayCurrency);

  const displaySubtotal = useMemo(() => {
    if (!order) return 0;
    return order.subtotal ?? order.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  }, [order]);

  const displayTotal = useMemo(() => {
    if (!order) return 0;
    return order.total;
  }, [order]);

  async function load() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/cart", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data?.error || "Failed to load cart");
      setOrder(null);
      setLoading(false);
      return;
    }
    setOrder(data.order);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const onCart = () => void load();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "bohosaaz_cart_ts") void load();
    };
    window.addEventListener("bohosaaz-cart", onCart);
    window.addEventListener("storage", onStorage);
    let es: EventSource | null = null;
    if ("EventSource" in window) {
      es = new EventSource("/api/live?role=user", { withCredentials: true });
      es.addEventListener("metrics", onCart);
      es.onerror = () => {
        es?.close();
        es = null;
      };
    }
    return () => {
      window.removeEventListener("bohosaaz-cart", onCart);
      window.removeEventListener("storage", onStorage);
      es?.removeEventListener("metrics", onCart);
      es?.close();
    };
  }, []);

  async function updateQty(itemId: string, quantity: number) {
    setMsg(null);
    setBusyItemId(itemId);
    try {
      const res = await fetch(`/api/cart/item/${itemId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error || "Update failed");
        return;
      }
      await load();
      window.dispatchEvent(new Event("bohosaaz-cart"));
      localStorage.setItem("bohosaaz_cart_ts", String(Date.now()));
    } finally {
      setBusyItemId(null);
    }
  }

  async function removeItem(itemId: string) {
    setMsg(null);
    setBusyItemId(itemId);
    try {
      const res = await fetch(`/api/cart/item/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error || "Remove failed");
        return;
      }
      await load();
      window.dispatchEvent(new Event("bohosaaz-cart"));
      localStorage.setItem("bohosaaz_cart_ts", String(Date.now()));
      toast({ variant: "success", title: "Removed", message: "Item removed from cart." });
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <div className="site-container mobile-bottom-safe py-5 md:py-10">
      <div className="rounded-[24px] border border-border/70 bg-card/65 p-4 shadow-[0_18px_60px_rgba(47,38,34,0.06)] backdrop-blur-xl md:rounded-[34px] md:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Cart</div>
          <h1 className="mt-2 font-heading text-3xl md:text-4xl tracking-tight text-foreground">Your Cart</h1>
          <p className="mt-2 text-sm text-muted-foreground">Review items, update quantities, and checkout.</p>
        </div>
        <Link className="text-sm text-muted-foreground hover:text-foreground transition" href={lp || "/"}>
          ← Continue shopping
        </Link>
      </div>
      </div>

      {msg ? (
        <div className="mt-4 rounded-(--radius) border border-border bg-card p-3 text-sm text-muted-foreground">{msg}</div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : !order || order.items.length === 0 ? (
        <Card className="mt-6 overflow-hidden bg-card/85 shadow-premium">
          <div className="p-8">
            <div className="font-heading text-2xl">Your cart is empty</div>
            <div className="mt-2 text-sm text-muted-foreground">Browse products and add something you love.</div>
            <div className="mt-5">
              <Link href={lp || "/"}>
                <Button>Browse products</Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-8 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden bg-card/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="border-b border-border bg-muted/25 px-5 py-4">
                <div className="font-heading text-lg text-foreground">Items</div>
                <div className="mt-1 text-sm text-muted-foreground">{itemCount} item(s)</div>
              </div>

              <div className="divide-y divide-border">
                {order.items.map((it) => {
                  const imgs = it.product.images || [];
                  const img = imgs.find((x) => x.isPrimary)?.url || imgs[0]?.url || null;
                  const stockMax = it.variant ? it.variant.stock : it.product.stock;
                  const variantLabelParts = [it.variantSize, it.variantColor].filter(Boolean);
                  const variantLabel = variantLabelParts.length ? variantLabelParts.join(" / ") : null;
                  const disabled = busyItemId === it.id;

                  return (
                    <div key={it.id} className="grid grid-cols-[84px_1fr] gap-3 p-4 sm:grid-cols-[96px_1fr] sm:gap-4 sm:p-5">
                      <Link href={`${lp}/p/${it.product.slug}` || `/p/${it.product.slug}`} className="shrink-0">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[18px] border border-border bg-muted sm:h-24 sm:w-24 sm:rounded-(--radius)">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={it.product.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="text-xs text-muted-foreground">No image</div>
                          )}
                        </div>
                      </Link>

                      <div className="min-w-0">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <Link
                              href={`${lp}/p/${it.product.slug}` || `/p/${it.product.slug}`}
                              className="font-heading text-base text-foreground hover:underline underline-offset-4 line-clamp-2 sm:text-lg"
                            >
                              {it.product.title}
                            </Link>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {it.product.category?.name || "Uncategorized"} • {it.product.vendor?.shopName || "Vendor"}
                            </div>
                            {variantLabel ? (
                              <div className="mt-1 text-xs text-muted-foreground">{variantLabel}</div>
                            ) : null}
                          </div>

                          <div className="shrink-0 sm:text-right">
                            <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Total</div>
                            <div className="mt-1">
                              <Price value={displayAmount(it.price * it.quantity)} currency={displayCurrency} size="md" />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                          <div className="rounded-(--radius) border border-border bg-background px-3 py-2">
                            <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Unit</div>
                            <div className="mt-1">
                              <Price value={displayAmount(it.price)} currency={displayCurrency} size="sm" />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 rounded-(--radius) border border-border bg-background px-3 py-2 sm:justify-start">
                            <div>
                              <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Qty</div>
                              <div className="mt-1 text-xs text-muted-foreground">Stock {stockMax}</div>
                            </div>
                            <QtyStepper
                              value={it.quantity}
                              min={1}
                              max={Math.max(1, stockMax || 1)}
                              onChange={(next) => updateQty(it.id, next)}
                              disabled={disabled}
                            />
                          </div>

                          <Button
                            variant="outline"
                            disabled={disabled}
                            onClick={() => removeItem(it.id)}
                            className="h-11 w-full sm:w-auto"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="h-fit lg:sticky lg:top-24">
            <Card className="overflow-hidden bg-card/90 shadow-premium">
              <div className="border-b border-border bg-muted/25 px-5 py-4">
                <div className="font-heading text-lg text-foreground">Summary</div>
                <div className="mt-1 text-sm text-muted-foreground">Secure checkout</div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Items</span>
                  <span>{itemCount}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <Price value={displayAmount(displaySubtotal)} currency={displayCurrency} size="sm" className="text-foreground" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <Price value={displayAmount(displayTotal)} currency={displayCurrency} size="lg" />
                </div>

                <Link className="mt-5 block" href={`${lp}/checkout` || "/checkout"}>
                  <Button className="h-12 w-full uppercase tracking-[0.12em]">Checkout</Button>
                </Link>

                <div className="mt-4 text-xs text-muted-foreground">
                  Price is inclusive of all applicable taxes and delivery charges.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
