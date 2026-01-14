import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";

function maskName(name: string | null | undefined) {
  const n = String(name || "").trim();
  if (!n) return null;
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  if (!first) return null;
  const masked = first.length <= 1 ? "*" : first[0] + "*".repeat(Math.min(6, first.length - 1));
  return masked;
}

function maskPincode(pincode: string | null | undefined) {
  const p = String(pincode || "").trim();
  if (!p) return null;
  if (p.length <= 2) return "**";
  return "*".repeat(p.length - 2) + p.slice(-2);
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "VENDOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") {
    return Response.json({ error: "Vendor not approved" }, { status: 403 });
  }

  // Vendor-wise items (exclude cart)
  const items = await prisma.orderItem.findMany({
    where: {
      product: { vendorId: vendor?.id },
      order: { status: { not: "PENDING" } }, // cart exclude
    },
    include: {
      order: true,
      product: {
        include: {
          images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // group by orderId for UI
  const grouped: Record<
    string,
    {
      orderId: string;
      status: string;
      total: number;
      createdAt: Date;
      shipping: {
        nameMasked: string | null;
        city: string | null;
        state: string | null;
        pincodeMasked: string | null;
      };
      items: Array<{
        id: string;
        qty: number;
        price: number;
        lineTotal: number;
        status: string;
        trackingCourier: string | null;
        trackingNumber: string | null;
        product: {
          id: string;
          title: string;
          slug: string;
          img: string | null;
        };
      }>;
    }
  > = {};
  for (const it of items) {
    const oid = it.orderId;
    if (!grouped[oid]) {
      grouped[oid] = {
        orderId: oid,
        status: it.order.status,
        total: 0,
        createdAt: it.order.createdAt,
        // IMPORTANT: no customer email/phone/address exposure.
        shipping: {
          nameMasked: maskName(it.order.fullName),
          city: it.order.city,
          state: it.order.state,
          pincodeMasked: maskPincode(it.order.pincode),
        },
        items: [],
      };
    }
    const lineTotal = it.price * it.quantity;
    grouped[oid].total += lineTotal;
    grouped[oid].items.push({
      id: it.id,
      qty: it.quantity,
      price: it.price,
      lineTotal,
      status: it.status,
      trackingCourier: it.trackingCourier,
      trackingNumber: it.trackingNumber,
      product: {
        id: it.product.id,
        title: it.product.title,
        slug: it.product.slug,
        img: it.product.images?.find((x) => x.isPrimary)?.url || it.product.images?.[0]?.url || null,
      },
    });
  }

  const orders = Object.values(grouped).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return Response.json({ orders });
}
