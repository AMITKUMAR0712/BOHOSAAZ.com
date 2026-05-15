import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ returnRequestId: string }> }
) {
  const user = await requireUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { returnRequestId } = await params;

  const rr = await prisma.returnRequest.findFirst({
    where: { id: returnRequestId, userId: user.id },
    include: {
      order: { select: { id: true, createdAt: true, status: true, paymentMethod: true } },
      orderItem: {
        include: {
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
      trackingEvents: { orderBy: { createdAt: "asc" } },
      refundRecord: true,
    },
  });

  if (!rr) return jsonError("Not found", 404);

  return jsonOk({ returnRequest: rr });
}
