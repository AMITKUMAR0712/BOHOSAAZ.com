import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ExportDropdown from "@/components/ExportDropdown";
import { requireApprovedVendor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function maskName(name: string | null | undefined) {
  const n = String(name || "").trim();
  if (!n) return "—";
  const first = n.split(/\s+/)[0] || "";
  if (!first) return "—";
  return first.length <= 1 ? "*" : first[0] + "*".repeat(Math.min(6, first.length - 1));
}

function maskPincode(pincode: string | null | undefined) {
  const p = String(pincode || "").trim();
  if (!p) return "—";
  if (p.length <= 2) return "**";
  return "*".repeat(p.length - 2) + p.slice(-2);
}

export default async function VendorOrderDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const vendorUser = await requireApprovedVendor();
  if (!vendorUser) redirect("/403");

  const { lang, id } = await params;
  const vendorId = vendorUser.vendor?.id;
  if (!vendorId) return null;

  const order = await prisma.order.findFirst({
    where: { id, status: { not: "PENDING" } },
    select: {
      id: true,
      createdAt: true,
      status: true,
      fullName: true,
      city: true,
      state: true,
      pincode: true,
    },
  });
  if (!order) return notFound();

  const items = await prisma.orderItem.findMany({
    where: {
      orderId: id,
      product: { vendorId },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      quantity: true,
      price: true,
      status: true,
      trackingCourier: true,
      trackingNumber: true,
      product: {
        select: {
          title: true,
          slug: true,
          images: { select: { url: true, isPrimary: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        },
      },
    },
  });

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Order #{order.id}</div>
            <div className="mt-1 text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString()} • {order.status}</div>
            <div className="mt-2 text-sm">
              <div className="font-semibold">Shipping (masked)</div>
              <div className="text-sm text-muted-foreground">
                {maskName(order.fullName)} • {order.city || "—"}, {order.state || "—"} • {maskPincode(order.pincode)}
              </div>
            </div>
          </div>

          <ExportDropdown
            filenameBase={`Bohosaaz_Order_${order.id}_Vendor`}
            csv={{
              href: `/api/export/vendor/orders/${order.id}/items.csv`,
              filename: `Bohosaaz_Order_${order.id}_VendorItems.csv`,
            }}
            pdf={{
              href: `/api/export/vendor/orders/${order.id}/packing-slip.pdf`,
              filename: `Bohosaaz_Order_${order.id}_PackingSlip.pdf`,
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-muted/30 p-3 text-sm font-semibold">Items (your products)</div>
        <div className="p-4 grid gap-3">
          {items.map((it) => {
            const img = it.product.images?.[0]?.url;
            const subtotal = it.price * it.quantity;
            return (
              <div key={it.id} className="flex gap-4 rounded-xl border p-3">
                <div className="h-16 w-16 rounded-lg border bg-muted/30 overflow-hidden">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={it.product.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-xs text-muted-foreground flex h-full items-center justify-center">No image</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link className="font-semibold hover:underline" href={`/${lang}/p/${it.product.slug}`}>
                    {it.product.title}
                  </Link>
                  <div className="mt-1 text-xs text-muted-foreground">Qty: {it.quantity} • ₹{it.price} • Subtotal: ₹{subtotal}</div>
                  <div className="mt-1 text-xs">Status: <b>{it.status}</b></div>
                  {(it.trackingCourier || it.trackingNumber) ? (
                    <div className="mt-1 text-xs text-muted-foreground">Tracking: {it.trackingCourier || "Courier"} • {it.trackingNumber || "—"}</div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {items.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-muted-foreground">No items for this order belong to your vendor.</div>
          ) : null}
        </div>
      </div>

      <div>
        <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-muted/40" href={`/${lang}/vendor/orders`}>
          Back to orders
        </Link>
      </div>
    </div>
  );
}
