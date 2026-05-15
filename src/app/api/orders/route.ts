import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try { payload = verifyToken(token); } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { userId: payload.sub, status: { not: "PENDING" } },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
              vendor: { select: { shopName: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ orders });
}
