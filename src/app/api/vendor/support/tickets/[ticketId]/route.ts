import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, type JwtPayload } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;

  const token = req.cookies.get("token")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "VENDOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { userId: payload.sub } });
  if (!vendor) return Response.json({ error: "Vendor profile not found" }, { status: 404 });
  if (vendor.status !== "APPROVED") return Response.json({ error: "Vendor not approved" }, { status: 403 });

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, vendorId: vendor.id },
    select: { id: true, category: true, subject: true, status: true, createdAt: true, updatedAt: true },
  });

  if (!ticket) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ticket });
}
