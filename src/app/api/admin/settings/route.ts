import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(_req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const settings = await prisma.setting.findMany({
    orderBy: { key: "asc" },
    select: { key: true, value: true, updatedAt: true },
  });

  return jsonOk({ settings });
}
