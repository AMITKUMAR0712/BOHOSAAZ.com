import { notFound, redirect } from "next/navigation";
import { requireApprovedVendor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveStatusFromItems } from "@/lib/orderStatusSync";
import VendorOrderDetailClient from "./VendorOrderDetailClient";

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
          images: {
            select: { url: true, isPrimary: true },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });

  if (items.length === 0) return notFound();

  const shippingLabel = `${maskName(order.fullName)} • ${order.city || "—"}, ${order.state || "—"} • ${maskPincode(order.pincode)}`;
  const vendorStatus = deriveStatusFromItems(items.map((i) => i.status));

  return (
    <VendorOrderDetailClient
      lang={lang}
      orderId={order.id}
      createdAt={order.createdAt.toISOString()}
      initialStatus={vendorStatus}
      shippingLabel={shippingLabel}
      items={items}
    />
  );
}
