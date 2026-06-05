import { prisma } from "@/lib/prisma";
import { verifyCourierSignature } from "@/lib/secrets";
import { bumpLiveVersion } from "@/lib/live";

function normalizeCourierStatus(raw: unknown) {
  const status = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!status) return "";

  if (/DELIVER|DELIVERED|DELIVERANCE|SUCCEEDED/.test(status)) return "DELIVERED";
  if (/IN_TRANSIT|IN TRANSIT|OUT_FOR_DELIVERY|OUT FOR DELIVERY|OUT_FOR_DELIVERY|OD|ON THE WAY|ON THE WAY|PICKED|DISPATCH|SHIPPED|ARRIVED|PICKUP/.test(status)) {
    return "SHIPPED";
  }
  return status;
}

export async function POST(req: Request) {
  const guard = await verifyCourierSignature(req);
  if (guard) return guard;

  const payload = await req.json().catch(() => null);
  if (!payload) return Response.json({ ok: true });

  // Example payload mapping
  const tracking = String(
    payload.tracking_number ||
      payload.waybill ||
      payload.awb ||
      payload.awb_number ||
      payload.trackingNumber ||
      ""
  ).trim();
  const status = normalizeCourierStatus(
    payload.status || payload.current_status || payload.shipment_status || payload.scan_status || ""
  );

  if (!tracking) return Response.json({ ok: true });

  const item = await prisma.orderItem.findFirst({
    where: { trackingNumber: tracking },
    select: {
      id: true,
      order: { select: { userId: true } },
      vendorOrder: { select: { vendorId: true } },
    },
  });
  if (!item) return Response.json({ ok: true });

  if (status === "IN_TRANSIT") {
    await prisma.orderItem.update({
      where: { id: item.id },
      data: { status: "SHIPPED", shippedAt: new Date() },
    });
  }

  if (status === "DELIVERED") {
    await prisma.orderItem.update({
      where: { id: item.id },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
  }

  const userId = item.order?.userId;
  const vendorId = item.vendorOrder?.vendorId;
  await Promise.all([
    userId ? bumpLiveVersion({ kind: "user", userId }) : Promise.resolve(),
    vendorId ? bumpLiveVersion({ kind: "vendor", vendorId }) : Promise.resolve(),
    bumpLiveVersion({ kind: "admin" }),
  ]);

  return Response.json({ ok: true });
}
