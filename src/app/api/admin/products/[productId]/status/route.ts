import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const isApproved = parsed.data.status === "PUBLISHED";
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        status: parsed.data.status,
        isActive: isApproved,
      },
    });

    return Response.json({ ok: true, product });
  } catch (error) {
    console.error("[api/admin/products/[id]/status] POST failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
