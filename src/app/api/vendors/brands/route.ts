import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(60).optional().default(12),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ limit: url.searchParams.get("limit") ?? undefined });
  const limit = parsed.success ? parsed.data.limit : 12;

  // Prefer vendors who recently sold (vendorOrders), fallback to approved vendors.
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60);

  const popular = await prisma.vendorOrder.groupBy({
    by: ["vendorId"],
    where: { createdAt: { gte: since } },
    _count: { vendorId: true },
    orderBy: { _count: { vendorId: "desc" } },
    take: limit,
  });

  const vendorIds = popular.map((p) => p.vendorId);

  const vendors = vendorIds.length
    ? await prisma.vendor.findMany({
        where: { id: { in: vendorIds }, status: "APPROVED", logoUrl: { not: null } },
        select: { id: true, shopName: true, logoUrl: true },
      })
    : [];

  const byId = new Map(vendors.map((v) => [v.id, v] as const));
  const ordered = vendorIds.map((id) => byId.get(id)).filter(Boolean);

  const fallbackNeeded = Math.max(0, limit - ordered.length);
  const fallback = fallbackNeeded
    ? await prisma.vendor.findMany({
        where: {
          status: "APPROVED",
          logoUrl: { not: null },
          id: ordered.length ? { notIn: ordered.map((v) => v!.id) } : undefined,
        },
        orderBy: { createdAt: "desc" },
        take: fallbackNeeded,
        select: { id: true, shopName: true, logoUrl: true },
      })
    : [];

  return Response.json({ ok: true, brands: [...ordered, ...fallback] });
}
