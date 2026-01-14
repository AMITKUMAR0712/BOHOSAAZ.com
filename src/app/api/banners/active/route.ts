import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api";

function toIso(d: Date | null) {
  return d ? d.toISOString() : null;
}

export async function GET() {
  const now = new Date();

  const banners = await prisma.banner.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      highlightText: true,
      subtitle: true,
      imageUrl: true,
      ctaText: true,
      ctaHref: true,
      sortOrder: true,
      couponCode: true,
      startAt: true,
      endAt: true,
      createdAt: true,
      updatedAt: true,
      coupon: {
        select: {
          code: true,
          type: true,
          value: true,
          isActive: true,
          startAt: true,
          endAt: true,
        },
      },
    },
  });

  return jsonOk({
    banners: banners.map((b) => ({
      ...b,
      startAt: toIso(b.startAt),
      endAt: toIso(b.endAt),
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      coupon: b.coupon
        ? {
            ...b.coupon,
            startAt: toIso(b.coupon.startAt),
            endAt: toIso(b.coupon.endAt),
          }
        : null,
    })),
  });
}
