import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

const createSchema = z.object({
  title: z.string().trim().min(2),
  placement: z.enum([
    "HOME_TOP",
    "HOME_BETWEEN_SECTIONS",
    "HOME_SIDEBAR",
    "CATEGORY_TOP",
    "PRODUCT_DETAIL_RIGHT",
    "FOOTER_STRIP",
    "SEARCH_TOP",
  ]),
  type: z.enum(["IMAGE_BANNER", "HTML_SNIPPET", "VIDEO", "PRODUCT_SPOTLIGHT", "BRAND_SPOTLIGHT"]),
  imageUrl: z.string().trim().url().optional().nullable(),
  linkUrl: z.string().trim().url().optional().nullable(),
  html: z.string().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional(),
  targetDevice: z.enum(["ALL", "MOBILE", "DESKTOP"]).optional(),
});

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const sp = req.nextUrl.searchParams;
  const placement = sp.get("placement");
  const status = sp.get("status");

  const where: any = {};
  if (placement) where.placement = placement;
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;

  const ads = await prisma.ad.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });

  return jsonOk({ ads });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid input", 400, { headers: { "content-type": "application/json" } });
  }

  const data = parsed.data;
  const startsAt = data.startsAt ? new Date(data.startsAt) : null;
  const endsAt = data.endsAt ? new Date(data.endsAt) : null;

  const ad = await prisma.ad.create({
    data: {
      title: data.title,
      placement: data.placement,
      type: data.type,
      imageUrl: data.imageUrl ?? null,
      linkUrl: data.linkUrl ?? null,
      html: data.html ?? null,
      startsAt,
      endsAt,
      isActive: data.isActive ?? true,
      priority: data.priority ?? 0,
      targetDevice: data.targetDevice ?? "ALL",
    },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_AD_CREATE",
    entity: "Ad",
    entityId: ad.id,
    meta: { placement: ad.placement, type: ad.type, title: ad.title },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ ad }, { status: 201 });
}
