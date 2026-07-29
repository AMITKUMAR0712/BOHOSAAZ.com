"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ExportDropdown from "@/components/ExportDropdown";
import { VendorOrderStatusSelect } from "@/components/vendor/VendorOrderStatusSelect";

type Item = {
  id: string;
  quantity: number;
  price: number;
  status: string;
  trackingCourier: string | null;
  trackingNumber: string | null;
  product: {
    title: string;
    slug: string;
    images: Array<{ url: string; isPrimary: boolean }>;
  };
};

type Props = {
  lang: string;
  orderId: string;
  createdAt: string;
  initialStatus: string;
  shippingLabel: string;
  items: Item[];
};

export default function VendorOrderDetailClient({
  lang,
  orderId,
  createdAt,
  initialStatus,
  shippingLabel,
  items: initialItems,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [items, setItems] = useState(initialItems);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
    setItems(initialItems);
  }, [initialStatus, initialItems]);

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Order #{orderId}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {new Date(createdAt).toLocaleString()}
            </div>
            <div className="mt-2 text-sm">
              <div className="font-semibold">Shipping (masked)</div>
              <div className="text-sm text-muted-foreground">{shippingLabel}</div>
            </div>
            {msg ? <div className="mt-2 text-sm">{msg}</div> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <VendorOrderStatusSelect
              orderId={orderId}
              value={status}
              onSaved={(next, updatedItems) => {
                setStatus(next);
                if (updatedItems?.length) {
                  const byId = new Map(updatedItems.map((i) => [i.id, i.status]));
                  setItems((prev) =>
                    prev.map((item) => ({
                      ...item,
                      status: byId.get(item.id) || next,
                    }))
                  );
                } else {
                  setItems((prev) => prev.map((item) => ({ ...item, status: next })));
                }
              }}
              onMessage={setMsg}
            />
            <ExportDropdown
              filenameBase={`Bohosaaz_Order_${orderId}_Vendor`}
              csv={{
                href: `/api/export/vendor/orders/${orderId}/items.csv`,
                filename: `Bohosaaz_Order_${orderId}_VendorItems.csv`,
              }}
              pdf={{
                href: `/api/export/vendor/orders/${orderId}/packing-slip.pdf`,
                filename: `Bohosaaz_Order_${orderId}_PackingSlip.pdf`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-muted/40 p-3 text-sm font-semibold">Your items</div>
        <div className="divide-y">
          {items.map((it) => {
            const img = it.product.images?.[0]?.url;
            return (
              <div key={it.id} className="flex gap-3 p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={it.product.title} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link className="font-medium hover:underline" href={`/${lang}/p/${it.product.slug}`}>
                    {it.product.title}
                  </Link>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Qty {it.quantity} • ₹{it.price} • Status: {it.status}
                    {it.trackingNumber
                      ? ` • ${it.trackingCourier || "Courier"} ${it.trackingNumber}`
                      : ""}
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No items for this vendor.</div>
          ) : null}
        </div>
      </div>

      <Link href={`/${lang}/vendor/orders`} className="text-sm text-primary hover:underline">
        ← Back to orders
      </Link>
    </div>
  );
}
