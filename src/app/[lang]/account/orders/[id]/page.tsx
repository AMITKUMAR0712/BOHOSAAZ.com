import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import ExportDropdown from "@/components/ExportDropdown";

const steps = ["PLACED", "PACKED", "SHIPPED", "DELIVERED"] as const;

function stepIndex(status: string) {
  const idx = steps.indexOf(status as (typeof steps)[number]);
  if (idx >= 0) return idx;
  if (status === "CANCELLED") return -1;
  if (status === "RETURN_REQUESTED" || status === "RETURN_APPROVED" || status === "REFUNDED") return 3;
  return 0;
}

function Timeline({ status }: { status: string }) {
  const idx = stepIndex(status);
  return (
    <div className="mt-2 grid gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {steps.map((s, i) => (
          <div
            key={s}
            className={
              "rounded-full border px-3 py-1 " +
              (i <= idx ? "bg-gray-50 font-semibold" : "text-gray-600")
            }
          >
            {s}
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-600">Current: {status}</div>
    </div>
  );
}

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const user = await requireUser();
  if (!user) return null;

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id, status: { not: "PENDING" } },
    include: {
      VendorOrder: {
        include: {
          vendor: { select: { shopName: true } },
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
                  vendor: { select: { shopName: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      items: {
        include: {
          product: {
            include: { images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } },
          },
        },
      },
    },
  });

  if (!order) return notFound();

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Order #{order.id}</div>
            <div className="mt-1 text-sm text-gray-600">Placed on {new Date(order.createdAt).toLocaleString()}</div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-right">
              <div className="text-sm">Status: <b>{order.status}</b></div>
              <div className="text-sm">Total: <b>₹{order.total}</b></div>
            </div>
            <ExportDropdown
              filenameBase={`Bohosaaz_Order_${order.id}`}
              csv={{
                href: `/api/export/user/orders/${order.id}/summary.csv`,
                filename: `Bohosaaz_Order_${order.id}_Summary.csv`,
              }}
              pdf={{
                href: `/api/export/user/orders/${order.id}/invoice.pdf`,
                filename: `Bohosaaz_Order_${order.id}_Invoice.pdf`,
              }}
            />
          </div>
        </div>
        <div className="mt-3 text-sm">
          <div className="font-semibold">Shipping</div>
          <div className="mt-1 text-sm text-gray-700">
            {order.fullName || "-"} • {order.phone || "-"}
            <div className="text-gray-600">
              {order.address1 || "-"} {order.address2 ? `, ${order.address2}` : ""}
              {order.city ? `, ${order.city}` : ""}
              {order.state ? `, ${order.state}` : ""}
              {order.pincode ? ` - ${order.pincode}` : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-gray-50 p-4 text-sm font-semibold">Sub-orders (by vendor)</div>

        <div className="p-4 grid gap-4">
          {order.VendorOrder.map((vo) => (
            <div key={vo.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{vo.vendor.shopName}</div>
                  <div className="mt-1 text-xs text-gray-600">Vendor order status: <b>{vo.status}</b></div>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <div>Subtotal: ₹{vo.subtotal}</div>
                </div>
              </div>

              <Timeline status={vo.status} />

              <div className="mt-4 grid gap-3">
                {vo.items.map((it) => {
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
                        <div className="mt-1 text-xs">
                          Item status: <b>{it.status}</b>
                        </div>
                        {(it.trackingCourier || it.trackingNumber) ? (
                          <div className="mt-1 text-xs text-gray-600">
                            Tracking: {it.trackingCourier || "Courier"} • {it.trackingNumber || "-"}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {order.VendorOrder.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-gray-600">
              Vendor sub-orders are not available for this order.
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex justify-between">
        <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" href={`/${lang}/account/orders`}>
          Back to orders
        </Link>
        <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" href={`/${lang}/account/returns`}>
          Returns & refunds
        </Link>
      </div>
    </div>
  );
}
