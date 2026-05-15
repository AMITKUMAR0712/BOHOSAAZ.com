import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

function maskName(name: string | null | undefined) {
  const n = String(name || "").trim();
  if (!n) return null;
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  if (!first) return null;
  const masked = first.length <= 1 ? "*" : first[0] + "*".repeat(Math.min(6, first.length - 1));
  return masked;
}

function maskPincode(pincode: string | null | undefined) {
  const p = String(pincode || "").trim();
  if (!p) return null;
  if (p.length <= 2) return "**";
  return "*".repeat(p.length - 2) + p.slice(-2);
}

export async function GET() {
  const vendorUser = await requireApprovedVendor();
  if (!vendorUser) return jsonError("Unauthorized", 401);

  const vendorId = vendorUser.vendor!.id;

  const returns = await prisma.returnRequest.findMany({
    where: { vendorId },
    include: {
      order: { select: { id: true, createdAt: true, status: true, fullName: true, city: true, state: true, pincode: true } },
      orderItem: {
        select: {
          id: true,
          quantity: true,
          price: true,
          status: true,
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: { where: { isPrimary: true }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const masked = returns.map((r) => ({
    ...r,
    order: {
      ...r.order,
      fullName: maskName(r.order.fullName),
      pincode: maskPincode(r.order.pincode),
    },
  }));

  return jsonOk({ returns: masked });
}
