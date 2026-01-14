import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api";
import { NextRequest } from "next/server";
import { z } from "zod";

const CreateReturnSchema = z.object({
  orderItemId: z.string().min(1),
  reason: z.string().min(2).max(200),
  notes: z.string().max(2000).optional().nullable(),
  images: z.array(z.string().url()).max(6).optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("Unauthorized", 401);

  const returnOrderItemIds = await prisma.returnRequest.findMany({
    where: { userId: user.id },
    select: { orderItemId: true },
  });
  const excludeIds = returnOrderItemIds.map((x) => x.orderItemId);

  const [eligibleItems, returns] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        order: { userId: user.id, status: { not: "PENDING" } },
        status: "DELIVERED",
        ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      },
      include: {
        order: { select: { id: true, createdAt: true, status: true } },
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        },
      },
      orderBy: { deliveredAt: "desc" },
      take: 50,
    }),
    prisma.returnRequest.findMany({
      where: { userId: user.id },
      include: {
        order: { select: { id: true, createdAt: true, status: true } },
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
        refundRecord: { select: { id: true, status: true, amount: true, method: true, provider: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  return jsonOk({ eligibleItems, returns });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = CreateReturnSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload", 400);

  const { orderItemId, reason, notes, images } = parsed.data;

  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId, order: { userId: user.id } },
    include: { order: true, product: { select: { vendorId: true } } },
  });

  if (!item) return jsonError("Not found", 404);
  if (item.status !== "DELIVERED") return jsonError("Item is not eligible for return", 400);
  if (!item.product.vendorId) return jsonError("Vendor not found for this item", 400);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const rr = await tx.returnRequest.create({
        data: {
          orderItemId: item.id,
          orderId: item.orderId,
          userId: user.id,
          vendorId: item.product.vendorId!,
          status: "REQUESTED",
          reason,
          notes: notes || null,
          images: images?.length ? images : undefined,
          trackingEvents: {
            create: {
              status: "REQUESTED",
              note: [reason, notes].filter(Boolean).join(" — ") || undefined,
              actorId: user.id,
              actorRole: user.role,
            },
          },
        },
        select: { id: true },
      });

      await tx.orderItem.update({
        where: { id: item.id },
        data: { status: "RETURN_REQUESTED" },
      });

      return rr;
    });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      action: "USER_RETURN_REQUEST_CREATE",
      entity: "ReturnRequest",
      entityId: created.id,
      meta: { orderId: item.orderId, orderItemId: item.id },
      ip: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return jsonOk({ returnRequestId: created.id }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    if (message.toLowerCase().includes("unique") || message.toLowerCase().includes("constraint")) {
      return jsonError("Return already exists for this item", 409);
    }
    return jsonError("Failed to create return", 500);
  }
}
