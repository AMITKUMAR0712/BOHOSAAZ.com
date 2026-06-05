import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(40).optional(),
  type: z.enum(["popular", "luxury"]).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid query" }, { status: 400 });

  const take = parsed.data.limit ?? 12;
  const brandType = parsed.data.type?.toUpperCase();

  const brands = await prisma.brand.findMany({
    where: { isActive: true, ...(brandType ? { brandType } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      brandType: true,
    },
  });

  return Response.json({ brands });
}
