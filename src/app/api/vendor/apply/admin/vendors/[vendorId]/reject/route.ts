import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ vendorId: string }> }
) {
  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { vendorId } = await ctx.params;

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return Response.json({ error: "Vendor not found" }, { status: 404 });

  await prisma.vendor.update({ where: { id: vendor.id }, data: { status: "REJECTED" } });
  return Response.json({ ok: true });
}
