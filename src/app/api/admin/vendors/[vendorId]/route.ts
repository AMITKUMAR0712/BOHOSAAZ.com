import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";
import {
  VendorApplicationSchema,
  requireKycName,
  vendorApplicationToDb,
} from "@/lib/vendorApplicationSchema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { vendorId } = await params;

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        kyc: true,
        bankAccount: true,
      },
    });

    if (!vendor) {
      return Response.json({ error: "Vendor not found" }, { status: 404 });
    }

    return Response.json({ ok: true, vendor });
  } catch (error) {
    console.error("[api/admin/vendors/[id]] GET failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Admin direct edit — updates shop/KYC/bank without changing approval status.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { vendorId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = VendorApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  if (!requireKycName(parsed.data.kyc.kycType, parsed.data.kyc.fullName, parsed.data.kyc.businessName)) {
    return jsonError(
      parsed.data.kyc.kycType === "INDIVIDUAL" ? "Full name is required" : "Business name is required",
      400
    );
  }

  const existing = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, status: true },
  });
  if (!existing) return jsonError("Vendor not found", 404);

  const mapped = vendorApplicationToDb(parsed.data);

  const vendor = await prisma.$transaction(async (tx) => {
    const updated = await tx.vendor.update({
      where: { id: vendorId },
      data: mapped.vendor,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, createdAt: true },
        },
        kyc: true,
        bankAccount: true,
      },
    });

    await tx.vendorBankAccount.upsert({
      where: { vendorId },
      update: mapped.bank,
      create: { vendorId, ...mapped.bank },
    });

    await tx.vendorKyc.upsert({
      where: { vendorId },
      update: {
        ...mapped.kyc,
        // Admin edit keeps current KYC status if already verified; otherwise submitted
        status: updated.kyc?.status === "VERIFIED" ? "VERIFIED" : "SUBMITTED",
        rejectionReason: null,
        submittedAt: updated.kyc?.submittedAt ?? new Date(),
      },
      create: {
        vendorId,
        status: "SUBMITTED",
        submittedAt: new Date(),
        ...mapped.kyc,
      },
    });

    return tx.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, createdAt: true },
        },
        kyc: true,
        bankAccount: true,
      },
    });
  });

  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "ADMIN_VENDOR_UPDATE",
    entity: "Vendor",
    entityId: vendorId,
    meta: { shopName: mapped.vendor.shopName, keptStatus: existing.status },
    ip: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });

  return jsonOk({ vendor });
}
