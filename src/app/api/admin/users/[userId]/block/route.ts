import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { userId } = await ctx.params;
  if (!userId) return jsonError("Missing userId", 400);

  const body = await req.json().catch(() => null);
  const parsed = z
    .object({ reason: z.string().trim().min(3).max(191) })
    .safeParse(body);
  if (!parsed.success) return jsonError("Invalid input", 400);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isBlocked: true,
      blockedReason: parsed.data.reason,
      blockedAt: new Date(),
      tokenVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
      role: true,
      isBlocked: true,
      blockedReason: true,
      blockedAt: true,
      tokenVersion: true,
    },
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_USER_BLOCK",
    entity: "User",
    entityId: updated.id,
    meta: { reason: parsed.data.reason, tokenVersion: updated.tokenVersion },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ user: updated });
}
