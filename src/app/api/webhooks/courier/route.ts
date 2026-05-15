import { prisma } from "@/lib/prisma";
import { verifyCourierSignature } from "@/lib/secrets";
import { bumpLiveVersion } from "@/lib/live";

export async function POST(req: Request) {
  const guard = await verifyCourierSignature(req);
  if (guard) return guard;

  const payload = await req.json().catch(() => null);
  if (!payload) return Response.json({ ok: true });

  // Example payload mapping
  const tracking = String(payload.tracking_number || "").trim();
  const status = String(payload.status || "").trim(); // IN_TRANSIT | DELIVERED

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
