import type { Prisma } from "@prisma/client";

type ReservableItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  product: { id: string; title: string; isActive: boolean; stock: number } | null;
  variant?: { id: string; productId: string; isActive: boolean; stock: number } | null;
};

export function validateOrderStock(items: ReservableItem[]) {
  for (const item of items) {
    if (!item.product || !item.product.isActive) throw new Error("Some products are unavailable");
    if (item.variantId) {
      if (!item.variant || !item.variant.isActive || item.variant.productId !== item.productId) {
        throw new Error(`Variant unavailable for "${item.product.title}"`);
      }
      if (item.quantity > item.variant.stock) {
        throw new Error(`Insufficient stock for "${item.product.title}"`);
      }
    } else if (item.quantity > item.product.stock) {
      throw new Error(`Insufficient stock for "${item.product.title}"`);
    }
  }
}

export async function reserveOrderStock(tx: Prisma.TransactionClient, items: ReservableItem[]) {
  validateOrderStock(items);

  for (const item of items) {
    if (item.variantId) {
      const variant = await tx.productVariant.updateMany({
        where: { id: item.variantId, productId: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (variant.count !== 1) throw new Error("Stock changed. Please try again.");

      const product = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (product.count !== 1) throw new Error("Stock changed. Please try again.");
      continue;
    }

    const product = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (product.count !== 1) throw new Error("Stock changed. Please try again.");
  }
}

export async function restoreOrderStock(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, variantId: true, quantity: true },
  });

  for (const item of items) {
    if (item.variantId) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }
}
