import { z } from "zod";

const urlOrPath = z
  .string()
  .trim()
  .regex(/^(https?:\/\/|\/).+$/, "Must be a valid URL or relative path");

export const VendorApplicationSchema = z.object({
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
    logoUrl: urlOrPath,
    bannerUrl: urlOrPath.optional().nullable(),
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
      panImage: urlOrPath,
      gstCertificate: urlOrPath.optional().nullable(),
      cancelledCheque: urlOrPath,
      addressProof: urlOrPath,
    }),
  }),
});

export type VendorApplicationPayload = z.infer<typeof VendorApplicationSchema>;

export function requireKycName(
  kycType: "INDIVIDUAL" | "BUSINESS",
  fullName?: string | null,
  businessName?: string | null
) {
  if (kycType === "INDIVIDUAL") return typeof fullName === "string" && fullName.trim().length >= 2;
  return typeof businessName === "string" && businessName.trim().length >= 2;
}

/** Map validated application payload → vendor/kyc/bank Prisma update/create data. */
export function vendorApplicationToDb(payload: VendorApplicationPayload) {
  const { shop, kyc } = payload;
  return {
    vendor: {
      shopName: shop.shopName,
      displayName: shop.displayName ?? null,
      shopDescription: shop.shopDescription ?? null,
      logoUrl: shop.logoUrl,
      bannerUrl: shop.bannerUrl ?? null,
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
    bank: {
      accountName: kyc.bankAccountName,
      accountNumber: kyc.bankAccountNumber,
      ifsc: kyc.ifsc,
      bankName: kyc.bankName,
      upiId: kyc.upiId ?? null,
    },
    kyc: {
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
    },
  };
}
