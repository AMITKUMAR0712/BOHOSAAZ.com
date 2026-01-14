"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PriceBlock } from "@/components/PriceBlock";

export type WishlistRow = {
  id: string;
  product: {
    id: string;
    slug: string;
    title: string;
    currency: "INR" | "USD";
    price: number;
    salePrice: number | null;
    imageUrl: string | null;
    vendorName: string | null;
  };
};

export default function AccountWishlistClient({
  langPrefix,
  initialItems,
}: {
  langPrefix: string;
  initialItems: WishlistRow[];
}) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<WishlistRow[]>(initialItems);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function remove(productId: string) {
    setBusyId(productId);
    try {
      const res = await fetch("/api/wishlist", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err =
          data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Remove failed";
        throw new Error(err);
      }
      setItems((prev) => prev.filter((x) => x.product.id !== productId));
      toast({ variant: "success", title: "Removed", message: "Removed from wishlist." });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Remove failed";
      toast({ variant: "danger", title: "Wishlist", message });
    } finally {
      setBusyId(null);
    }
  }

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="font-heading text-xl">Wishlist</div>
        <div className="mt-2 text-sm text-muted-foreground">No saved items yet.</div>
        <div className="mt-5">
          <Link href={langPrefix} className="underline text-sm">
            Browse products →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">Account</div>
          <div className="mt-2 font-heading text-2xl tracking-tight text-foreground">Wishlist</div>
          <div className="mt-1 text-sm text-muted-foreground">Saved for later.</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {items.map((row) => (
          <div key={row.id} className="flex gap-4 rounded-2xl border border-border bg-background/60 p-4">
            <div className="h-20 w-20 rounded-2xl border border-border bg-muted overflow-hidden shrink-0">
              {row.product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.product.imageUrl} alt={row.product.title} className="h-full w-full object-cover" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <Link
                href={`${langPrefix}/p/${row.product.slug}`}
                className="font-heading text-lg text-foreground hover:underline underline-offset-4 line-clamp-2"
              >
                {row.product.title}
              </Link>

              {row.product.vendorName ? (
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {row.product.vendorName}
                </div>
              ) : null}

              <div className="mt-2">
                <PriceBlock
                  price={row.product.price}
                  salePrice={row.product.salePrice}
                  currency={row.product.currency}
                  size="sm"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="soft"
                  disabled={busyId === row.product.id}
                  onClick={async () => {
                    const res = await fetch("/api/cart/add", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ productId: row.product.id, qty: 1 }),
                    });
                    if (res.ok) toast({ variant: "success", title: "Added to cart", message: "Added." });
                    else toast({ variant: "danger", title: "Cart", message: "Add to cart failed" });
                  }}
                >
                  Add to cart
                </Button>

                <Button
                  variant="ghost"
                  disabled={busyId === row.product.id}
                  onClick={() => remove(row.product.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
