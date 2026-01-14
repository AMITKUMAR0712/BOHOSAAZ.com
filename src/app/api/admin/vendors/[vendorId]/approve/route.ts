import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

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

  if (!vendor.logoUrl) {
    return jsonError("Vendor must set a logo before approval", 400);
  }

  const kyc = await prisma.vendorKyc.findUnique({ where: { vendorId: vendor.id }, select: { id: true, status: true } });
  if (!kyc) {
    return jsonError("Vendor KYC not submitted", 400);
  }

  await prisma.$transaction([
    prisma.vendor.update({
      where: { id: vendor.id },
      data: { status: "APPROVED", statusReason: null },
    }),
    prisma.vendorKyc.update({
      where: { vendorId: vendor.id },
      data: { status: "VERIFIED", rejectionReason: null, verifiedAt: new Date() },
    }),
    prisma.user.update({ where: { id: vendor.userId }, data: { role: "VENDOR" } }),
  ]);

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_VENDOR_APPROVE",
    entity: "Vendor",
    entityId: vendor.id,
    meta: { vendorId: vendor.id, userId: vendor.userId },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ ok: true });
}
