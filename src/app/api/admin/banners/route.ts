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

const createSchema = z.object({
  title: z.string().trim().max(200).optional().nullable(),
  highlightText: z.string().trim().max(200).optional().nullable(),
  subtitle: z.string().trim().max(400).optional().nullable(),
  imageUrl: optionalMediaUrlSchema,
  videoUrl: optionalMediaUrlSchema,
  ctaText: z.string().trim().max(80).optional().nullable(),
  ctaHref: z.string().trim().max(2048).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().nonnegative().optional().default(0),
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

function normalizeBannerInput(data: z.infer<typeof createSchema>) {
  let imageUrl = data.imageUrl?.trim() || "";
  let videoUrl = data.videoUrl?.trim() || null;

  if (imageUrl && isVideoUrl(imageUrl) && !videoUrl) {
    videoUrl = imageUrl;
    imageUrl = "";
  }

  return {
    title: data.title?.trim() || (videoUrl ? "Bohosaaz video banner" : "Bohosaaz banner"),
    imageUrl: imageUrl || "/logo-copy.jpeg",
    videoUrl,
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const banners = await prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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
      createdAt: true,
      updatedAt: true,
    },
  });

  return jsonOk({ banners });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  if (parsed.data.couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: parsed.data.couponCode },
      select: { code: true },
    });
    if (!coupon) return jsonError("Invalid couponCode", 400);
  }

  const normalized = normalizeBannerInput(parsed.data);

  const created = await prisma.banner.create({
    data: {
      title: normalized.title,
      highlightText: parsed.data.highlightText ?? null,
      subtitle: parsed.data.subtitle ?? null,
      imageUrl: normalized.imageUrl,
      videoUrl: normalized.videoUrl,
      ctaText: parsed.data.ctaText ?? null,
      ctaHref: parsed.data.ctaHref ?? null,
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder,
      couponCode: parsed.data.couponCode ?? null,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : null,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
    },
    select: { id: true, title: true, isActive: true, sortOrder: true },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_BANNER_CREATE",
    entity: "Banner",
    entityId: created.id,
    meta: { title: created.title, isActive: created.isActive, sortOrder: created.sortOrder },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ banner: created }, { status: 201 });
}
