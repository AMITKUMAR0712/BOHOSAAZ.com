import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import {
  VendorApplicationSchema,
  requireKycName,
  vendorApplicationToDb,
} from "@/lib/vendorApplicationSchema";

export const runtime = "nodejs";

const ApplyBodySchema = VendorApplicationSchema.extend({
  /** When true, approved vendors may re-submit → PENDING for admin review. */
  mode: z.enum(["apply", "edit"]).optional().default("apply"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = ApplyBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const { shop, kyc, mode } = parsed.data;

  if (!requireKycName(kyc.kycType, kyc.fullName, kyc.businessName)) {
    return Response.json(
      { error: kyc.kycType === "INDIVIDUAL" ? "Full name is required" : "Business name is required" },
      { status: 400 }
    );
  }

  const existing = await prisma.vendor.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  });

  if (!existing && user.role !== "USER" && user.role !== "VENDOR") {
    return Response.json({ error: "Only users can apply to become a vendor" }, { status: 403 });
  }

  if (existing?.status === "SUSPENDED") {
    return Response.json({ error: "Vendor account is suspended" }, { status: 403 });
  }

  if (existing?.status === "APPROVED" && mode !== "edit") {
    return Response.json(
      { error: "Vendor is already approved. Use Edit application to request changes." },
      { status: 409 }
    );
  }

  const mapped = vendorApplicationToDb({ shop, kyc });

  const result = await prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.upsert({
      where: { userId: user.id },
      update: {
        ...mapped.vendor,
        status: "PENDING",
        statusReason: null,
      },
      create: {
        userId: user.id,
        status: "PENDING",
        ...mapped.vendor,
      },
      select: { id: true, userId: true, status: true },
    });

    await tx.vendorBankAccount.upsert({
      where: { vendorId: vendor.id },
      update: mapped.bank,
      create: { vendorId: vendor.id, ...mapped.bank },
    });

    await tx.vendorKyc.upsert({
      where: { vendorId: vendor.id },
      update: {
        status: "SUBMITTED",
        ...mapped.kyc,
        rejectionReason: null,
        submittedAt: new Date(),
        verifiedAt: null,
      },
      create: {
        vendorId: vendor.id,
        status: "SUBMITTED",
        submittedAt: new Date(),
        ...mapped.kyc,
      },
    });

    return vendor;
  });

  return Response.json(
    {
      ok: true,
      vendor: result,
      reapprovalRequired: mode === "edit",
      message:
        mode === "edit"
          ? "Changes submitted. Waiting for admin re-approval."
          : "Application submitted.",
    },
    { status: existing ? 200 : 201 }
  );
}
