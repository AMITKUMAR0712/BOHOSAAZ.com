import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id, status: { not: "PENDING" } },
    include: {
      VendorOrder: {
        include: {
          vendor: { select: { shopName: true } },
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
                },
              },
            },
          },
        },
      },
      items: {
        include: {
          product: {
            include: { images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } },
          },
        },
      },
    },
  });

  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ order });
}
