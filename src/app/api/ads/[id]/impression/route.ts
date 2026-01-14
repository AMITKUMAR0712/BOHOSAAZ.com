import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { z } from "zod";

const bodySchema = z
  .object({
    referrer: z.string().trim().max(2048).optional(),
  })
  .optional();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return jsonError("Missing id", 400);

  const body = await req.json().catch(() => undefined);
  const parsed = bodySchema ? bodySchema.safeParse(body) : { success: true as const, data: undefined };
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const referrer = parsed.data?.referrer;
  const userAgent = req.headers.get("user-agent") || null;
  const ip = req.headers.get("x-forwarded-for") || null;

  const updated = await prisma.ad.updateMany({
    where: { id },
    data: { impressions: { increment: 1 } },
  });
  if (updated.count !== 1) return jsonError("Ad not found", 404);

  await prisma.adEvent.create({
    data: {
      adId: id,
      type: "IMPRESSION",
      ip: ip ? String(ip).slice(0, 255) : null,
      userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
      referrer: referrer ?? null,
    },
  });

  return jsonOk({ ok: true });
}
