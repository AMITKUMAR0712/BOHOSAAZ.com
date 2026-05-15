import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  req: NextRequest,
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
