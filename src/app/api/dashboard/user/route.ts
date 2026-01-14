import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getUserDashboardMetrics } from "@/lib/dashboard/metrics";

export const runtime = "nodejs";

const UserMetricsSchema = z.object({
  cartItemsCount: z.number().int().nonnegative(),
  pendingOrdersCount: z.number().int().nonnegative(),
  deliveredOrdersCount: z.number().int().nonnegative(),
  walletBalanceRupees: z.number().nonnegative(),
  activeReturnsCount: z.number().int().nonnegative(),
  openSupportTicketsCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const metrics = await getUserDashboardMetrics(user.id);
  const parsed = UserMetricsSchema.safeParse(metrics);
  if (!parsed.success) {
    return Response.json({ error: "Metrics validation failed" }, { status: 500 });
  }

  return Response.json(parsed.data);
}
