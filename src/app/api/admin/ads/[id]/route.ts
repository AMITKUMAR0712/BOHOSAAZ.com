import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

const patchSchema = z
  .object({
    title: z.string().trim().min(2).optional(),
    placement: z
      .enum([
        "HOME_TOP",
        "HOME_BETWEEN_SECTIONS",
        "HOME_SIDEBAR",
        "CATEGORY_TOP",
        "PRODUCT_DETAIL_RIGHT",
        "FOOTER_STRIP",
        "SEARCH_TOP",
      ])
      .optional(),
    type: z.enum(["IMAGE_BANNER", "HTML_SNIPPET", "VIDEO", "PRODUCT_SPOTLIGHT", "BRAND_SPOTLIGHT"]).optional(),
    imageUrl: z.string().trim().url().optional().nullable(),
    linkUrl: z.string().trim().url().optional().nullable(),
    html: z.string().optional().nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    isActive: z.boolean().optional(),
    priority: z.number().int().optional(),
    targetDevice: z.enum(["ALL", "MOBILE", "DESKTOP"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No changes" });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  if (!id) return jsonError("Missing id", 400);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input", 400);

  const data = parsed.data;

  const updated = await prisma.ad.update({
    where: { id },
    data: {
      title: data.title ?? undefined,
      placement: data.placement ?? undefined,
      type: data.type ?? undefined,
      imageUrl: data.imageUrl === undefined ? undefined : data.imageUrl,
      linkUrl: data.linkUrl === undefined ? undefined : data.linkUrl,
      html: data.html === undefined ? undefined : data.html,
      startsAt: data.startsAt === undefined ? undefined : data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt === undefined ? undefined : data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive ?? undefined,
      priority: data.priority ?? undefined,
      targetDevice: data.targetDevice ?? undefined,
    },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_AD_UPDATE",
    entity: "Ad",
    entityId: updated.id,
    meta: { placement: updated.placement, type: updated.type, title: updated.title },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ ad: updated });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  if (!id) return jsonError("Missing id", 400);

  await prisma.ad.delete({ where: { id } });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_AD_DELETE",
    entity: "Ad",
    entityId: id,
    meta: { id },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ ok: true });
}
