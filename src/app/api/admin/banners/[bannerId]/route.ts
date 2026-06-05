import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

const mediaUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => (value.startsWith("/") && !value.startsWith("//")) || z.string().url().safeParse(value).success, {
    message: "Invalid media URL",
  });

const optionalMediaUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  mediaUrlSchema.optional().nullable()
);

const patchSchema = z.object({
  title: z.string().trim().max(200).optional().nullable(),
  highlightText: z.string().trim().max(200).optional().nullable(),
  subtitle: z.string().trim().max(400).optional().nullable(),
  imageUrl: optionalMediaUrlSchema,
  videoUrl: optionalMediaUrlSchema,
  ctaText: z.string().trim().max(80).optional().nullable(),
  ctaHref: z.string().trim().max(2048).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  couponCode: z
    .string()
    .trim()
    .max(64)
    .optional()
    .nullable()
    .transform((s) => (s ? s.toUpperCase() : null)),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
});

function isVideoUrl(url: string | null | undefined) {
  const clean = (url ?? "").trim().toLowerCase().split("?")[0] ?? "";
  return clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".mov");
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ bannerId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { bannerId } = await ctx.params;
  if (!bannerId) return jsonError("Missing bannerId", 400);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  if (parsed.data.couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: parsed.data.couponCode },
      select: { code: true },
    });
    if (!coupon) return jsonError("Invalid couponCode", 400);
  }

  let nextImageUrl = parsed.data.imageUrl?.trim() || undefined;
  let nextVideoUrl = parsed.data.videoUrl === undefined ? undefined : parsed.data.videoUrl?.trim() || null;
  if (nextImageUrl && isVideoUrl(nextImageUrl) && nextVideoUrl === undefined) {
    nextVideoUrl = nextImageUrl;
    nextImageUrl = "/logo-copy.jpeg";
  }

  const updated = await prisma.banner.update({
    where: { id: bannerId },
    data: {
      title: parsed.data.title?.trim() || undefined,
      highlightText:
        parsed.data.highlightText !== undefined ? parsed.data.highlightText : undefined,
      subtitle: parsed.data.subtitle !== undefined ? parsed.data.subtitle : undefined,
      imageUrl: nextImageUrl,
      videoUrl: nextVideoUrl,
      ctaText: parsed.data.ctaText !== undefined ? parsed.data.ctaText : undefined,
      ctaHref: parsed.data.ctaHref !== undefined ? parsed.data.ctaHref : undefined,
      isActive: parsed.data.isActive ?? undefined,
      sortOrder: parsed.data.sortOrder ?? undefined,
      couponCode: parsed.data.couponCode !== undefined ? parsed.data.couponCode : undefined,
      startAt:
        parsed.data.startAt === undefined
          ? undefined
          : parsed.data.startAt
            ? new Date(parsed.data.startAt)
            : null,
      endAt:
        parsed.data.endAt === undefined
          ? undefined
          : parsed.data.endAt
            ? new Date(parsed.data.endAt)
            : null,
    },
    select: {
      id: true,
      title: true,
      highlightText: true,
      subtitle: true,
      imageUrl: true,
      videoUrl: true,
      ctaText: true,
      ctaHref: true,
      isActive: true,
      sortOrder: true,
      couponCode: true,
      startAt: true,
      endAt: true,
      updatedAt: true,
    },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_BANNER_UPDATE",
    entity: "Banner",
    entityId: updated.id,
    meta: { title: updated.title, isActive: updated.isActive, sortOrder: updated.sortOrder },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ banner: updated });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ bannerId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { bannerId } = await ctx.params;
  if (!bannerId) return jsonError("Missing bannerId", 400);

  try {
    const deleted = await prisma.banner.delete({
      where: { id: bannerId },
      select: { id: true, title: true },
    });

    await audit({
      actorId: admin.id,
      actorRole: admin.role,
      action: "ADMIN_BANNER_DELETE",
      entity: "Banner",
      entityId: deleted.id,
      meta: { title: deleted.title },
      ip: getIpFromRequest(req),
      userAgent: getUserAgentFromRequest(req),
    });

    return jsonOk({ deleted: true });
  } catch {
    return jsonError("Not found", 404);
  }
}
