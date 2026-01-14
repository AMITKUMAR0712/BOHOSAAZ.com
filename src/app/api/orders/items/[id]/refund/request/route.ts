import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const item = await prisma.orderItem.findUnique({
    where: { id },
    include: { order: true },
  });

  if (!item || item.order.userId !== user.id)
    return Response.json({ error: "Not allowed" }, { status: 403 });

  if (item.status !== "DELIVERED") {
    return Response.json({ error: "Only delivered items can be returned" }, { status: 400 });
  }

  await prisma.orderItem.update({
    where: { id },
    data: { status: "RETURN_REQUESTED" },
  });

  return Response.json({ ok: true });
}
