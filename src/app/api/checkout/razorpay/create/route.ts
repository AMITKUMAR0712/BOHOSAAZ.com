import Razorpay from "razorpay";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit";
import { recomputePendingOrderTotals } from "@/lib/orderTotals";
import { amountToMinorUnits } from "@/lib/money";
import { resolveCommissionPlanTx } from "@/lib/commission";

const bodySchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(8),
  address1: z.string().trim().min(5),
  address2: z.string().trim().optional().nullable(),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  pincode: z.string().trim().min(4),
  currency: z.enum(["INR", "USD"]).optional(),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "ip";
  const limited = await rateLimit(`checkout:razorpay:${payload.sub}:${ip}`);
  if (!limited.success) return Response.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid payload",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    const missing: string[] = [];
    if (!process.env.RAZORPAY_KEY_SECRET) missing.push("RAZORPAY_KEY_SECRET");
    if (!process.env.RAZORPAY_KEY_ID && !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      missing.push("RAZORPAY_KEY_ID or NEXT_PUBLIC_RAZORPAY_KEY_ID");
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("[checkout:razorpay] Missing Razorpay env keys:", missing);
    }

    return Response.json(
      {
        error:
          "Razorpay not configured. Set RAZORPAY_KEY_SECRET and (RAZORPAY_KEY_ID or NEXT_PUBLIC_RAZORPAY_KEY_ID)",
        missing,
        hint:
          "Put these in .env.local (not .env.local.example) and restart `npm run dev`. For production, set them in your hosting provider's env settings.",
      },
      { status: 500 }
    );
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  const { fullName, phone, address1, address2, city, state, pincode, currency: requestedCurrency } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { userId: payload.sub, status: "PENDING" },
      include: {
        items: {
          include: {
            variant: true,
            product: { include: { vendor: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!order) throw new Error("Cart is empty");
    if (order.items.length === 0) throw new Error("Cart is empty");

    // Ensure single-currency order (INR or USD) early, before side effects.
    const orderCurrency = (() => {
      const first = order.items[0]?.product?.currency;
      return first === "USD" ? "USD" : "INR";
    })();

    for (const it of order.items) {
      const c = it.product?.currency === "USD" ? "USD" : "INR";
      if (c !== orderCurrency) {
        throw new Error("Mixed currency cart is not supported. Checkout INR and USD items separately.");
      }
    }
    if (requestedCurrency && requestedCurrency !== orderCurrency) {
      throw new Error("Selected currency does not match cart currency.");
    }

    // validate stock + recompute prices
    for (const it of order.items) {
      if (!it.product || !it.product.isActive) throw new Error("Some products are unavailable");
      if (it.variantId) {
        if (!it.variant || !it.variant.isActive || it.variant.productId !== it.productId) {
          throw new Error(`Variant unavailable for "${it.product.title}"`);
        }
        if (it.quantity > it.variant.stock) {
          throw new Error(`Insufficient stock for "${it.product.title}"`);
        }
      } else {
        if (it.quantity > it.product.stock) {
          throw new Error(`Insufficient stock for "${it.product.title}"`);
        }
      }
    }

    // decrement stock (safe)
    for (const it of order.items) {
      if (it.variantId) {
        const v = await tx.productVariant.updateMany({
          where: { id: it.variantId, productId: it.productId, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
        if (v.count !== 1) throw new Error("Stock changed. Please try again.");

        const p = await tx.product.updateMany({
          where: { id: it.productId, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
        if (p.count !== 1) throw new Error("Stock changed. Please try again.");
      } else {
        const updated = await tx.product.updateMany({
          where: { id: it.productId, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
        if (updated.count !== 1) throw new Error("Stock changed. Please try again.");
      }
    }

    // update items price to current variant/product price
    for (const it of order.items) {
      let unitPrice: number;
      if (it.variantId) {
        if (!it.variant) throw new Error("Variant unavailable");
        unitPrice = Number(it.variant.salePrice ?? it.variant.price);
      } else {
        unitPrice = Number(it.product.salePrice ?? it.product.price);
      }

      await tx.orderItem.update({
        where: { id: it.id },
        data: {
          price: unitPrice,
          variantSku: it.variantId ? it.variant?.sku ?? null : null,
          variantSize: it.variantId ? it.variant?.size ?? null : null,
          variantColor: it.variantId ? it.variant?.color ?? null : null,
        },
      });
    }

    // compute per-vendor subtotals from fresh item prices
    const refreshed = await tx.orderItem.findMany({
      where: { orderId: order.id },
      include: { product: { include: { vendor: true } } },
    });

    const perVendor: Record<
      string,
      { vendor: { id: string; commission: number | null }; subtotal: number; itemIds: string[] }
    > = {};
    for (const it of refreshed) {
      const vendor = it.product.vendor;
      if (!vendor) throw new Error("Vendor missing for product");
      if (!perVendor[vendor.id]) perVendor[vendor.id] = { vendor, subtotal: 0, itemIds: [] };
      perVendor[vendor.id].subtotal += it.price * it.quantity;
      perVendor[vendor.id].itemIds.push(it.id);
    }

    // create vendor sub-orders
    const vendorOrderByVendorId: Record<string, string> = {};
    for (const vendorId of Object.keys(perVendor)) {
      const { vendor, subtotal } = perVendor[vendorId];
      const planned = await resolveCommissionPlanTx(tx, { vendorId });
      const commissionPct = planned.planId ? planned.percent : Number(vendor.commission ?? 0);
      const rate = commissionPct > 1 ? commissionPct / 100 : commissionPct;
      const commission = +(subtotal * rate).toFixed(2);
      const payout = +(subtotal - commission).toFixed(2);

      const vo = await tx.vendorOrder.create({
        data: {
          orderId: order.id,
          vendorId,
          status: "PLACED",
          subtotal,
          commission,
          payout,
        },
        select: { id: true },
      });

      await tx.commissionHistory.upsert({
        where: { vendorOrderId: vo.id },
        update: {
          commissionPercent: commissionPct,
          baseAmountPaise: amountToMinorUnits(orderCurrency, subtotal),
          commissionPaise: amountToMinorUnits(orderCurrency, commission),
          planId: planned.planId,
        },
        create: {
          vendorId,
          vendorOrderId: vo.id,
          planId: planned.planId,
          commissionPercent: commissionPct,
          baseAmountPaise: amountToMinorUnits(orderCurrency, subtotal),
          commissionPaise: amountToMinorUnits(orderCurrency, commission),
        },
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
    const amountMinor = amountToMinorUnits(orderCurrency, totals.total);

    // Create/refresh Razorpay order
    const rpOrder = (await razorpay.orders.create({
      amount: Number(amountMinor),
      currency: orderCurrency,
      receipt: `order_${order.id}`,
      payment_capture: true,
      notes: { orderId: order.id, userId: payload.sub },
    })) as unknown as { id: string };

    // Finalize order (payment pending on Razorpay side)
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PLACED",
        subtotal: totals.subtotal,
        total: totals.total,
        paymentMethod: "RAZORPAY",
        fullName,
        phone,
        address1,
        address2: address2 || null,
        city,
        state,
        pincode,
      },
    });

    // Persist payment record (unique orderId)
    await tx.orderPayment.upsert({
      where: { orderId: order.id },
      update: {
        amountPaise: amountMinor,
        currency: orderCurrency,
        status: "CREATED",
        razorpayOrderId: rpOrder.id,
        razorpayPaymentId: null,
        capturedAt: null,
        failedAt: null,
        failureReason: null,
      },
      create: {
        orderId: order.id,
        amountPaise: amountMinor,
        currency: orderCurrency,
        status: "CREATED",
        razorpayOrderId: rpOrder.id,
      },
    });

    return {
      keyId,
      orderId: order.id,
      razorpayOrderId: rpOrder.id,
      amountPaise: amountMinor.toString(),
      currency: orderCurrency,
    };
    });

    return Response.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Checkout failed";

    // Treat expected user-facing failures as 400, gateway issues as 502.
    const isClientError =
      message === "Cart is empty" ||
      message === "Some products are unavailable" ||
      message === "Stock changed. Please try again." ||
      message.includes("Insufficient stock") ||
      message.includes("Variant unavailable") ||
      message.includes("Vendor missing") ||
      message.includes("Vendor order missing");

    const status = isClientError ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}
