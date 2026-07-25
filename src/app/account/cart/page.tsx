import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Cart",
  description: "Your current cart on Bohosaaz.",
  path: "/en/account/cart",
  noindex: true,
  nofollow: true,
});

export default async function AccountCartPage() {
  const user = await requireUser();
  if (!user) return null;

  const order = await prisma.order.findFirst({
    where: { userId: user.id, status: "PENDING" },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = order?.items ?? [];
  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Add to cart</div>
          <div className="mt-1 text-sm text-muted-foreground">Read-only summary of your current cart.</div>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40" href="/en/cart">
            Go to Cart
          </Link>
          <Link className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40" href="/en/checkout">
            Checkout
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="bg-muted/40 p-4 text-sm font-semibold">Items ({totalQty})</div>
        <div className="grid gap-3 p-4">
          {items.map((it) => {
            const img = it.product.images?.[0]?.url;
            const subtotal = it.price * it.quantity;
            return (
              <div key={it.id} className="flex gap-4 rounded-xl border border-border p-3">
                <div className="h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted/30">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={it.product.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{it.product.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Qty: {it.quantity} • ₹{it.price} • Subtotal: ₹{subtotal}
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 ? (
            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Your cart is empty.</div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-border p-4">
          <div className="text-sm text-muted-foreground">Cart total</div>
          <div className="text-lg font-semibold">₹{total}</div>
        </div>
      </div>
    </div>
  );
}
