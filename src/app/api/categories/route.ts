import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isHidden: false },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, position: true, iconName: true, iconUrl: true },
  });
  return Response.json({ categories });
}
