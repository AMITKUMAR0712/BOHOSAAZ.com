import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";

const querySchema = z.object({
  placement: z.string().trim().min(1),
  device: z.enum(["ALL", "MOBILE", "DESKTOP"]).optional(),
});

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(sp);
  if (!parsed.success) return jsonError("Invalid query", 400);

  const { placement, device } = parsed.data;
  const now = new Date();

  const ads = await prisma.ad.findMany({
    where: {
      placement: placement as any,
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        device
          ? {
              OR: [{ targetDevice: "ALL" }, { targetDevice: device }],
            }
          : {},
      ],
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 10,
  });

  return jsonOk({ ads });
}
