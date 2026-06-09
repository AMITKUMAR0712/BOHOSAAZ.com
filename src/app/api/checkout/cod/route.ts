import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit";
import { recomputePendingOrderTotals } from "@/lib/orderTotals";
import { reserveOrderStock } from "@/lib/stock";
import { bumpDashboardScopes } from "@/lib/bumpDashboard";

const bodySchema = z.object({
  orderId: z.string().trim().min(1).optional(),
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(8),
  address1: z.string().trim().min(5),
  address2: z.string().trim().optional().nullable(),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  pincode: z.string().trim().min(4),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "ip";
  const limited = await rateLimit(`checkout:cod:${payload.sub}:${ip}`);
  if (!limited.success) return Response.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const { orderId, fullName, phone, address1, address2, city, state, pincode } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: orderId
          ? { id: orderId, userId: payload.sub, status: "PENDING" }
          : { userId: payload.sub, status: "PENDING" },
        include: {
          items: {
            include: {
              variant: true,
              product: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

    if (!order) throw new Error("Cart is empty");
    if (order.items.length === 0) throw new Error("Cart is empty");

    const orderCurrency = order.currency === "USD" ? "USD" : "INR";
    if (orderCurrency !== "INR") {
      throw new Error("Cash on Delivery is only available for INR orders.");
    }
    if (!order.items.every((it) => it.product?.forceCodOnly === true)) {
      throw new Error("Cash on Delivery is only available for products where admin has enabled COD.");
    }

    await reserveOrderStock(tx, order.items);

    // Keep cart item prices unchanged here. They were already converted to
    // order.currency when the item was added, so checkout totals must match the cart.

    // compute per-vendor subtotals from fresh item prices
      const refreshed = await tx.orderItem.findMany({
        where: { orderId: order.id },
        include: {
          product: {
            select: {
              vendorId: true,
              vendor: { select: { id: true } },
            },
          },
        },
      });

      const perVendor: Record<string, { subtotal: number; itemIds: string[] }> = {};
      for (const it of refreshed) {
        const vendor = it.product.vendor;
        if (!vendor) throw new Error("Vendor missing for product");
        if (!perVendor[vendor.id]) perVendor[vendor.id] = { subtotal: 0, itemIds: [] };
        perVendor[vendor.id].subtotal += it.price * it.quantity;
        perVendor[vendor.id].itemIds.push(it.id);
      }

    // create vendor sub-orders
    const vendorOrderByVendorId: Record<string, string> = {};
    for (const vendorId of Object.keys(perVendor)) {
      const { subtotal } = perVendor[vendorId];
      const payout = +subtotal.toFixed(2);

      const vo = await tx.vendorOrder.create({
        data: {
          orderId: order.id,
          vendorId,
          status: "PLACED",
          subtotal,
          commission: 0,
          payout,
        },
        select: { id: true },
      });
      vendorOrderByVendorId[vendorId] = vo.id;
    }

    // attach vendorOrderId to each item
      for (const it of refreshed) {
        const vendorId = it.product.vendorId;
        const vendorOrderId = vendorOrderByVendorId[vendorId];
        if (!vendorOrderId) throw new Error("Vendor order missing");
        await tx.orderItem.update({
          where: { id: it.id },
          data: { vendorOrderId },
        });
      }

    // Recompute totals (subtotal + coupon discount + total) from the latest item prices
    const totals = await recomputePendingOrderTotals(tx, order.id);

    // finalize order (COD)
      const finalized = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "COD_PENDING",
          subtotal: totals.subtotal,
          total: totals.total,
          paymentMethod: "COD",
          fullName,
          phone,
          address1,
          address2: address2 || null,
          city,
          state,
          pincode,
        },
        select: {
          id: true,
          total: true,
          couponId: true,
          couponDiscount: true,
          user: { select: { email: true } },
        },
      });

    // Record redemption only after a successful order placement
    if (finalized.couponId && Number(finalized.couponDiscount) > 0) {
      await tx.couponRedemption.create({
        data: {
          couponId: finalized.couponId,
          userId: payload.sub,
          orderId: finalized.id,
          email: finalized.user.email,
          amountDiscounted: Number(finalized.couponDiscount),
        },
      });

      await tx.coupon.update({
        where: { id: finalized.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

      return { orderId: finalized.id, total: finalized.total, vendorIds: Object.keys(perVendor) };
    });

    await bumpDashboardScopes([
      { kind: "user", userId: payload.sub },
      { kind: "admin" },
      ...result.vendorIds.map((vendorId) => ({ kind: "vendor" as const, vendorId })),
    ]);

    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    // Return 4xx for expected user-facing errors; keep Prisma/unknown issues obvious.
    const status = message.includes("does not exist") ? 500 : 400;
    return Response.json({ error: message }, { status });
  }
}
