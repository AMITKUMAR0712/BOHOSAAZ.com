import { prisma } from "@/lib/prisma";

export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      brand: true,
      vendor: {
        select: {
          id: true,
          shopName: true,
          displayName: true,
          shopDescription: true,
          logoUrl: true,
          status: true,
          contactEmail: true,
          contactPhone: true,
          shopCity: true,
          shopState: true,
        },
      },
      images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      variants: {
        where: { isActive: true },
        orderBy: [{ size: "asc" }, { color: "asc" }],
      },
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!product || !product.isActive) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ product });
}
