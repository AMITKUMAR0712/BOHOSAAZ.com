import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

function toIso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
    include: {
      kyc: true,
      bankAccount: true,
    },
  });

  if (!vendor) {
    return Response.json({
      ok: true,
      status: "NOT_APPLIED",
      vendor: null,
      kyc: null,
      bankAccount: null,
    });
  }

  return Response.json({
    ok: true,
    status: vendor.status,
    vendor: {
      id: vendor.id,
      userId: vendor.userId,
      shopName: vendor.shopName,
      displayName: vendor.displayName,
      shopDescription: vendor.shopDescription,
      logoUrl: vendor.logoUrl,
      status: vendor.status,
      statusReason: vendor.statusReason,
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone,
      shopAddress1: vendor.shopAddress1,
      shopAddress2: vendor.shopAddress2,
      shopCity: vendor.shopCity,
      shopState: vendor.shopState,
      shopPincode: vendor.shopPincode,
      pickupName: vendor.pickupName,
      pickupPhone: vendor.pickupPhone,
      pickupAddress1: vendor.pickupAddress1,
      pickupAddress2: vendor.pickupAddress2,
      pickupCity: vendor.pickupCity,
      pickupState: vendor.pickupState,
      pickupPincode: vendor.pickupPincode,
      createdAt: toIso(vendor.createdAt),
      updatedAt: toIso(vendor.updatedAt),
    },
    kyc: vendor.kyc
      ? {
          id: vendor.kyc.id,
          status: vendor.kyc.status,
          kycType: vendor.kyc.kycType,
          fullName: vendor.kyc.fullName,
          businessName: vendor.kyc.businessName,
          panNumber: vendor.kyc.panNumber,
          gstin: vendor.kyc.gstin,
          aadhaarLast4: vendor.kyc.aadhaarLast4,
          panImageUrl: vendor.kyc.panImageUrl,
          gstCertificateUrl: vendor.kyc.gstCertificateUrl,
          cancelledChequeUrl: vendor.kyc.cancelledChequeUrl,
          addressProofUrl: vendor.kyc.addressProofUrl,
          rejectionReason: vendor.kyc.rejectionReason,
          submittedAt: toIso(vendor.kyc.submittedAt),
          verifiedAt: toIso(vendor.kyc.verifiedAt),
          createdAt: toIso(vendor.kyc.createdAt),
          updatedAt: toIso(vendor.kyc.updatedAt),
        }
      : null,
    bankAccount: vendor.bankAccount
      ? {
          id: vendor.bankAccount.id,
          accountName: vendor.bankAccount.accountName,
          accountNumber: vendor.bankAccount.accountNumber,
          ifsc: vendor.bankAccount.ifsc,
          bankName: vendor.bankAccount.bankName,
          upiId: vendor.bankAccount.upiId,
          createdAt: toIso(vendor.bankAccount.createdAt),
          updatedAt: toIso(vendor.bankAccount.updatedAt),
        }
      : null,
  });
}
