import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const ApplySchema = z.object({
  shop: z.object({
    shopName: z.string().trim().min(3),
    displayName: z.string().trim().min(2).optional().nullable(),
    shopDescription: z.string().trim().max(2000).optional().nullable(),

    contactEmail: z.string().trim().email().optional().nullable(),
    contactPhone: z.string().trim().min(7).max(20).optional().nullable(),

    shopAddress: z
      .object({
        address1: z.string().trim().min(3),
        address2: z.string().trim().optional().nullable(),
        city: z.string().trim().min(2),
        state: z.string().trim().min(2),
        pincode: z.string().trim().min(4).max(10),
      })
      .optional()
      .nullable(),

    pickupAddress: z
      .object({
        name: z.string().trim().min(2).optional().nullable(),
        phone: z.string().trim().min(7).max(20).optional().nullable(),
        address1: z.string().trim().min(3).optional().nullable(),
        address2: z.string().trim().optional().nullable(),
        city: z.string().trim().min(2).optional().nullable(),
        state: z.string().trim().min(2).optional().nullable(),
        pincode: z.string().trim().min(4).max(10).optional().nullable(),
      })
      .optional()
      .nullable(),

    logoUrl: z.string().trim().url(),
  }),

  kyc: z.object({
    kycType: z.enum(["INDIVIDUAL", "BUSINESS"]),
    fullName: z.string().trim().min(2).optional().nullable(),
    businessName: z.string().trim().min(2).optional().nullable(),
    panNumber: z.string().trim().min(6),
    gstin: z.string().trim().optional().nullable(),
    aadhaarLast4: z
      .string()
      .trim()
      .regex(/^\d{4}$/, "Aadhaar last 4 digits must be 4 numbers")
      .optional()
      .nullable(),

    bankAccountName: z.string().trim().min(2),
    bankAccountNumber: z.string().trim().min(6),
    ifsc: z.string().trim().min(6),
    bankName: z.string().trim().min(2),
    upiId: z.string().trim().optional().nullable(),

    documents: z.object({
      panImage: z.string().trim().url(),
      gstCertificate: z.string().trim().url().optional().nullable(),
      cancelledCheque: z.string().trim().url(),
      addressProof: z.string().trim().url(),
    }),
  }),
});

function requireKycName(kycType: "INDIVIDUAL" | "BUSINESS", fullName?: string | null, businessName?: string | null) {
  if (kycType === "INDIVIDUAL") return typeof fullName === "string" && fullName.trim().length >= 2;
  return typeof businessName === "string" && businessName.trim().length >= 2;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = ApplySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const { shop, kyc } = parsed.data;

  if (!requireKycName(kyc.kycType, kyc.fullName, kyc.businessName)) {
    return Response.json(
      { error: kyc.kycType === "INDIVIDUAL" ? "Full name is required" : "Business name is required" },
      { status: 400 }
    );
  }

  const existing = await prisma.vendor.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });

  if (!existing && user.role !== "USER") {
    return Response.json({ error: "Only users can apply to become a vendor" }, { status: 403 });
  }

  if (existing?.status === "SUSPENDED") {
    return Response.json({ error: "Vendor account is suspended" }, { status: 403 });
  }

  if (existing?.status === "APPROVED") {
    return Response.json({ error: "Vendor is already approved" }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.upsert({
      where: { userId: user.id },
      update: {
        shopName: shop.shopName,
        displayName: shop.displayName ?? null,
        shopDescription: shop.shopDescription ?? null,
        logoUrl: shop.logoUrl,

        contactEmail: shop.contactEmail ?? null,
        contactPhone: shop.contactPhone ?? null,

        shopAddress1: shop.shopAddress?.address1 ?? null,
        shopAddress2: shop.shopAddress?.address2 ?? null,
        shopCity: shop.shopAddress?.city ?? null,
        shopState: shop.shopAddress?.state ?? null,
        shopPincode: shop.shopAddress?.pincode ?? null,

        pickupName: shop.pickupAddress?.name ?? null,
        pickupPhone: shop.pickupAddress?.phone ?? null,
        pickupAddress1: shop.pickupAddress?.address1 ?? null,
        pickupAddress2: shop.pickupAddress?.address2 ?? null,
        pickupCity: shop.pickupAddress?.city ?? null,
        pickupState: shop.pickupAddress?.state ?? null,
        pickupPincode: shop.pickupAddress?.pincode ?? null,

        status: "PENDING",
        statusReason: null,
      },
      create: {
        userId: user.id,
        shopName: shop.shopName,
        displayName: shop.displayName ?? null,
        shopDescription: shop.shopDescription ?? null,
        logoUrl: shop.logoUrl,
        status: "PENDING",
        contactEmail: shop.contactEmail ?? null,
        contactPhone: shop.contactPhone ?? null,
        shopAddress1: shop.shopAddress?.address1 ?? null,
        shopAddress2: shop.shopAddress?.address2 ?? null,
        shopCity: shop.shopAddress?.city ?? null,
        shopState: shop.shopAddress?.state ?? null,
        shopPincode: shop.shopAddress?.pincode ?? null,
        pickupName: shop.pickupAddress?.name ?? null,
        pickupPhone: shop.pickupAddress?.phone ?? null,
        pickupAddress1: shop.pickupAddress?.address1 ?? null,
        pickupAddress2: shop.pickupAddress?.address2 ?? null,
        pickupCity: shop.pickupAddress?.city ?? null,
        pickupState: shop.pickupAddress?.state ?? null,
        pickupPincode: shop.pickupAddress?.pincode ?? null,
      },
      select: { id: true, userId: true, status: true },
    });

    await tx.vendorBankAccount.upsert({
      where: { vendorId: vendor.id },
      update: {
        accountName: kyc.bankAccountName,
        accountNumber: kyc.bankAccountNumber,
        ifsc: kyc.ifsc,
        bankName: kyc.bankName,
        upiId: kyc.upiId ?? null,
      },
      create: {
        vendorId: vendor.id,
        accountName: kyc.bankAccountName,
        accountNumber: kyc.bankAccountNumber,
        ifsc: kyc.ifsc,
        bankName: kyc.bankName,
        upiId: kyc.upiId ?? null,
      },
    });

    await tx.vendorKyc.upsert({
      where: { vendorId: vendor.id },
      update: {
        status: "SUBMITTED",
        kycType: kyc.kycType,
        fullName: kyc.kycType === "INDIVIDUAL" ? (kyc.fullName ?? null) : null,
        businessName: kyc.kycType === "BUSINESS" ? (kyc.businessName ?? null) : null,
        panNumber: kyc.panNumber,
        gstin: kyc.gstin ?? null,
        aadhaarLast4: kyc.aadhaarLast4 ?? null,
        panImageUrl: kyc.documents.panImage,
        gstCertificateUrl: kyc.documents.gstCertificate ?? null,
        cancelledChequeUrl: kyc.documents.cancelledCheque,
        addressProofUrl: kyc.documents.addressProof,
        rejectionReason: null,
        submittedAt: new Date(),
        verifiedAt: null,
      },
      create: {
        vendorId: vendor.id,
        status: "SUBMITTED",
        kycType: kyc.kycType,
        fullName: kyc.kycType === "INDIVIDUAL" ? (kyc.fullName ?? null) : null,
        businessName: kyc.kycType === "BUSINESS" ? (kyc.businessName ?? null) : null,
        panNumber: kyc.panNumber,
        gstin: kyc.gstin ?? null,
        aadhaarLast4: kyc.aadhaarLast4 ?? null,
        panImageUrl: kyc.documents.panImage,
        gstCertificateUrl: kyc.documents.gstCertificate ?? null,
        cancelledChequeUrl: kyc.documents.cancelledCheque,
        addressProofUrl: kyc.documents.addressProof,
        submittedAt: new Date(),
      },
    });

    return vendor;
  });

  return Response.json({ ok: true, vendor: result }, { status: existing ? 200 : 201 });
}
