import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { createDelhiveryShipmentForOrderItem } from "@/lib/delhivery";

const BodySchema = z.object({
  itemId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "VENDOR") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }

  const itemId = parsed.data.itemId;

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { product: true, vendorOrder: true },
  });

  if (!item) return Response.json({ error: "Order item not found" }, { status: 404 });

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });

  if (item.vendorOrderId && item.vendorOrder?.vendorId !== vendor.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!item.vendorOrderId && item.product.vendorId !== vendor.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await createDelhiveryShipmentForOrderItem(itemId);
    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        trackingCourier: "Delhivery",
        trackingNumber: result.trackingNumber,
        shippedAt: new Date(),
        status: "SHIPPED",
      },
    });

    return Response.json({ ok: true, trackingNumber: result.trackingNumber, rawResponse: result.rawResponse });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delhivery create shipment failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
