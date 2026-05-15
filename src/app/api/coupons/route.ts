import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("code")?.trim() || null;
    const now = new Date();

    if (q) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: q,
          isActive: true,
          AND: [
            { OR: [{ startAt: null }, { startAt: { lte: now } }] },
            { OR: [{ endAt: null }, { endAt: { gte: now } }] },
          ],
        },
        select: { id: true, code: true, type: true, value: true, isActive: true },
      });
      return Response.json({ coupon: coupon ?? null });
    }

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, code: true, type: true, value: true },
      take: 20,
    });

    return Response.json({ coupons });
  } catch (err) {
    console.error("/api/coupons GET failed:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
