"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Price } from "@/components/ui/price";

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
  items: CartItem[];
};

export default function CartClient({ langPrefix }: { langPrefix?: string }) {
  const lp = langPrefix || "";
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  const itemCount = useMemo(() => {
    const items = order?.items || [];
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [order?.items]);

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
    setCouponInput(String(data?.order?.couponCode || ""));
    setLoading(false);
  }

  useEffect(() => {
    load();
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
      toast({ variant: "success", title: "Removed", message: "Item removed from cart." });
    } finally {
      setBusyItemId(null);
    }
  }

  async function applyCoupon(code: string) {
    setMsg(null);
    setCouponBusy(true);
    try {
      const res = await fetch("/api/checkout/apply-coupon", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = data?.error || "Coupon could not be applied";
        setMsg(error);
        toast({ variant: "danger", title: "Coupon", message: error });
        return;
      }
      toast({ variant: "success", title: "Coupon", message: data?.code ? `Applied ${data.code}` : "Removed" });
      await load();
    } finally {
      setCouponBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Cart</div>
          <h1 className="mt-2 font-heading text-3xl md:text-4xl tracking-tight text-foreground">Your Cart</h1>
          <p className="mt-2 text-sm text-muted-foreground">Review items, update quantities, and checkout.</p>
        </div>
        <Link className="text-sm text-muted-foreground hover:text-foreground transition" href={lp || "/"}>
          ← Continue shopping
        </Link>
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
        <Card className="mt-6 overflow-hidden">
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
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
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
                    <div key={it.id} className="p-5 grid grid-cols-1 sm:grid-cols-[96px_1fr] gap-4">
                      <Link href={`${lp}/p/${it.product.slug}` || `/p/${it.product.slug}`} className="shrink-0">
                        <div className="h-24 w-24 rounded-(--radius) border border-border bg-muted overflow-hidden flex items-center justify-center">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={it.product.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="text-xs text-muted-foreground">No image</div>
                          )}
                        </div>
                      </Link>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <Link
                              href={`${lp}/p/${it.product.slug}` || `/p/${it.product.slug}`}
                              className="font-heading text-lg text-foreground hover:underline underline-offset-4 line-clamp-2"
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

                          <div className="text-right shrink-0">
                            <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Total</div>
                            <div className="mt-1">
                              <Price value={it.price * it.quantity} size="md" />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <div className="rounded-(--radius) border border-border bg-background px-3 py-2">
                            <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Unit</div>
                            <div className="mt-1">
                              <Price value={it.price} size="sm" />
                            </div>
                          </div>

                          <div className="rounded-(--radius) border border-border bg-background px-3 py-2 flex items-center gap-3">
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
                            className="h-11"
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

          <div className="lg:sticky lg:top-24 h-fit">
            <Card className="overflow-hidden shadow-premium">
              <div className="border-b border-border bg-muted/25 px-5 py-4">
                <div className="font-heading text-lg text-foreground">Summary</div>
                <div className="mt-1 text-sm text-muted-foreground">Secure checkout • COD available</div>
              </div>

              <div className="p-5">
                <div className="grid gap-3">
                  <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Coupon</div>
                  <div className="flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Enter coupon code"
                      disabled={couponBusy}
                    />
                    <Button
                      variant="outline"
                      className="h-11"
                      disabled={couponBusy}
                      onClick={() => applyCoupon(couponInput)}
                    >
                      Apply
                    </Button>
                  </div>
                  {order.couponCode ? (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Applied: {order.couponCode}</span>
                      <button
                        className="underline underline-offset-4 hover:text-foreground transition"
                        disabled={couponBusy}
                        onClick={() => applyCoupon("")}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 h-px bg-border" />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Items</span>
                  <span>{itemCount}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <Price value={Number(order.subtotal ?? order.total)} size="sm" className="text-foreground" />
                </div>
                {Number(order.couponDiscount || 0) > 0 ? (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <Price value={-Number(order.couponDiscount || 0)} size="sm" className="text-foreground" />
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <Price value={order.total} size="lg" />
                </div>

                <Link className="mt-5 block" href={`${lp}/checkout` || "/checkout"}>
                  <Button className="w-full h-11 uppercase tracking-[0.12em]">Checkout</Button>
                </Link>

                <div className="mt-4 text-xs text-muted-foreground">
                  Taxes and shipping are calculated at checkout.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
