import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(40).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid query" }, { status: 400 });

  const take = parsed.data.limit ?? 12;

  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
    },
  });

  return Response.json({ brands });
}
