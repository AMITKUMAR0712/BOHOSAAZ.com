import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";
import { Prisma } from "@prisma/client";

const putSchema = z.object({
  value: z.unknown(),
});

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ key: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { key } = await ctx.params;
  const settingKey = (key || "").trim();
  if (!settingKey) return jsonError("Missing key", 400);
  if (settingKey.length > 191) return jsonError("Key too long", 400);

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  // Validate JSON-serializability
  try {
    JSON.stringify(parsed.data.value);
  } catch {
    return jsonError("Value must be JSON-serializable", 400);
  }

  const updated = await prisma.setting.upsert({
    where: { key: settingKey },
    create: { key: settingKey, value: parsed.data.value as Prisma.InputJsonValue },
    update: { value: parsed.data.value as Prisma.InputJsonValue },
    select: { key: true, value: true, updatedAt: true },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_SETTING_UPSERT",
    entity: "Setting",
    entityId: updated.key,
    meta: { key: updated.key },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ setting: updated });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ key: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { key } = await ctx.params;
  const settingKey = (key || "").trim();
  if (!settingKey) return jsonError("Missing key", 400);

  try {
    const deleted = await prisma.setting.delete({
      where: { key: settingKey },
      select: { key: true },
    });

    await audit({
      actorId: admin.id,
      actorRole: admin.role,
      action: "ADMIN_SETTING_DELETE",
      entity: "Setting",
      entityId: deleted.key,
      meta: { key: deleted.key },
      ip: getIpFromRequest(req),
      userAgent: getUserAgentFromRequest(req),
    });

    return jsonOk({ ok: true });
  } catch {
    return jsonError("Not found", 404);
  }
}
