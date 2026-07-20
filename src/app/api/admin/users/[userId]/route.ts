import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getIpFromRequest, getUserAgentFromRequest } from "@/lib/requestMeta";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isBlocked: true,
      blockedReason: true,
      blockedAt: true,
      createdAt: true,
      vendor: { select: { id: true, status: true, shopName: true } },
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          label: true,
          fullName: true,
          phone: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          pincode: true,
          kind: true,
          isDefault: true,
        },
      },
    },
  });

  if (!user) return jsonError("User not found", 404);

  return jsonOk({
    user: {
      ...user,
      blockedAt: user.blockedAt ? user.blockedAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const { userId } = await params;
  if (!userId) return jsonError("Missing userId", 400);
  if (userId === admin.id) return jsonError("You cannot delete your own account", 400);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, vendor: { select: { id: true } } },
  });
  if (!user) return jsonError("User not found", 404);
  if (user.role === "ADMIN") return jsonError("Admin users cannot be deleted", 400);

  try {
    if (user.vendor?.id) {
      const productIds = await prisma.product.findMany({
        where: { vendorId: user.vendor.id },
        select: { id: true },
      });
      if (productIds.length) {
        await prisma.product.deleteMany({ where: { vendorId: user.vendor.id } });
      }
      await prisma.vendor.delete({ where: { id: user.vendor.id } });
    }

    await prisma.user.delete({ where: { id: userId } });

    await audit({
      actorId: admin.id,
      actorRole: admin.role,
      action: "ADMIN_USER_DELETE",
      entity: "User",
      entityId: userId,
      meta: { email: user.email },
      ip: getIpFromRequest(req),
      userAgent: getUserAgentFromRequest(req),
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    console.error("[api/admin/users/[userId]] DELETE failed:", error);
    return jsonError("Delete failed. User may have related records that must be removed first.", 400);
  }
}
