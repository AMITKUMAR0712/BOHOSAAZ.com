import { Prisma } from "@prisma/client";

export async function resolveCommissionPlanTx(
  tx: Prisma.TransactionClient,
  {
    vendorId,
    categoryId,
  }: {
    vendorId: string;
    categoryId?: string | null;
  }
): Promise<{ percent: number; planId: string | null }> {
  // Category override (optional).
  if (categoryId) {
    const cat = await tx.commissionPlan.findFirst({
      where: { scope: "CATEGORY", categoryId, isActive: true },
      select: { id: true, percent: true },
      orderBy: { createdAt: "desc" },
    });
    if (cat) return { percent: Number(cat.percent), planId: cat.id };
  }

  const vendor = await tx.commissionPlan.findFirst({
    where: { scope: "VENDOR", vendorId, isActive: true },
    select: { id: true, percent: true },
    orderBy: { createdAt: "desc" },
  });
  if (vendor) return { percent: Number(vendor.percent), planId: vendor.id };

  const def = await tx.commissionPlan.findFirst({
    where: { scope: "DEFAULT", isActive: true },
    select: { id: true, percent: true },
    orderBy: { createdAt: "desc" },
  });
  if (def) return { percent: Number(def.percent), planId: def.id };

  return { percent: 0, planId: null };
}
