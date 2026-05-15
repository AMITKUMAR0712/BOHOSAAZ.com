import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";

const querySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .transform((s) => s.toUpperCase()),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ code: url.searchParams.get("code") ?? "" });
  if (!parsed.success) return jsonError("Missing code", 400);

  const now = new Date();
  const coupon = await prisma.coupon.findFirst({
    where: {
      code: parsed.data.code,
      isActive: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    select: {
      id: true,
      code: true,
      type: true,
      value: true,
      minOrderAmount: true,
      maxDiscountAmount: true,
      startAt: true,
      endAt: true,
      usageLimit: true,
      perUserLimit: true,
      usedCount: true,
      isActive: true,
      appliesTo: true,
      categoryId: true,
      productId: true,
    },
  });

  if (!coupon) return jsonError("Not found", 404);

  return jsonOk({
    coupon: {
      ...coupon,
      startAt: coupon.startAt ? coupon.startAt.toISOString() : null,
      endAt: coupon.endAt ? coupon.endAt.toISOString() : null,
    },
  });
}
