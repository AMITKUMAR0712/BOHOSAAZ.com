import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AccountCartPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
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
          <div className="text-xl font-semibold">Cart (mirror)</div>
          <div className="mt-1 text-sm text-gray-600">Read-only summary of your current cart.</div>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" href={`/${lang}/cart`}>
            Go to Cart
          </Link>
          <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" href={`/${lang}/checkout`}>
            Checkout
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-gray-50 p-4 text-sm font-semibold">Items ({totalQty})</div>
        <div className="p-4 grid gap-3">
          {items.map((it) => {
            const img = it.product.images?.[0]?.url;
            const subtotal = it.price * it.quantity;
            return (
              <div key={it.id} className="flex gap-4 rounded-xl border p-3">
                <div className="h-16 w-16 rounded-lg border bg-gray-50 overflow-hidden">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={it.product.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-xs text-gray-400 flex h-full items-center justify-center">No image</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{it.product.title}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    Qty: {it.quantity} • ₹{it.price} • Subtotal: ₹{subtotal}
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-gray-600">Your cart is empty.</div>
          ) : null}
        </div>

        <div className="border-t p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">Cart total</div>
          <div className="text-lg font-semibold">₹{total}</div>
        </div>
      </div>
    </div>
  );
}
