import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ vendorId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { vendorId } = await ctx.params;
  if (!vendorId) return jsonError("Missing vendorId", 400);

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return jsonError("Vendor not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = z.object({ reason: z.string().trim().max(500).optional().nullable() }).safeParse(body);
  const reason = parsed.success ? parsed.data.reason ?? null : null;

  await prisma.$transaction([
    prisma.vendor.update({ where: { id: vendor.id }, data: { status: "REJECTED", statusReason: reason } }),
    prisma.vendorKyc.updateMany({ where: { vendorId: vendor.id }, data: { status: "REJECTED", rejectionReason: reason, verifiedAt: null } }),
  ]);

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_VENDOR_REJECT",
    entity: "Vendor",
    entityId: vendor.id,
    meta: { vendorId: vendor.id, userId: vendor.userId, reason },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ ok: true });
}
