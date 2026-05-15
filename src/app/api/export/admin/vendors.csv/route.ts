import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { VendorStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "").trim();
  const q = (url.searchParams.get("q") || "").trim();

  const where: Prisma.VendorWhereInput = {};
  if (status && status !== "ALL") {
    if ((Object.values(VendorStatus) as string[]).includes(status)) {
      where.status = status as VendorStatus;
    }
  }
  if (q) {
    where.OR = [
      { id: { contains: q } },
      { shopName: { contains: q } },
      { user: { email: { contains: q } } },
    ];
  }

  const vendors = await prisma.vendor.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      shopName: true,
      status: true,
      commission: true,
      pickupName: true,
      pickupPhone: true,
      pickupCity: true,
      pickupState: true,
      pickupPincode: true,
      logoUrl: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });

  const headers = [
    "vendorId",
    "shopName",
    "status",
    "commissionPercent",
    "userId",
    "userEmail",
    "userName",
    "logoUrl",
    "pickupName",
    "pickupPhone",
    "pickupCity",
    "pickupState",
    "pickupPincode",
    "createdAt",
    "updatedAt",
  ];

  const rows = vendors.map((v) => ({
    vendorId: v.id,
    shopName: v.shopName,
    status: v.status,
    commissionPercent: v.commission,
    userId: v.user.id,
    userEmail: v.user.email,
    userName: v.user.name || "",
    logoUrl: v.logoUrl || "",
    pickupName: v.pickupName || "",
    pickupPhone: v.pickupPhone || "",
    pickupCity: v.pickupCity || "",
    pickupState: v.pickupState || "",
    pickupPincode: v.pickupPincode || "",
    createdAt: formatIsoDateTime(v.createdAt),
    updatedAt: formatIsoDateTime(v.updatedAt),
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Admin_Vendors_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
