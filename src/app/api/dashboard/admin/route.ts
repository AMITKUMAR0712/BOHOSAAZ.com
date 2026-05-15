import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardMetrics } from "@/lib/dashboard/metrics";

export const runtime = "nodejs";

const AdminMetricsSchema = z.object({
  gmvTodayRupees: z.number().nonnegative(),
  gmv7dRupees: z.number().nonnegative(),
  commissionTodayRupees: z.number().nonnegative(),
  commission7dRupees: z.number().nonnegative(),
  pendingVendorApprovalsCount: z.number().int().nonnegative(),
  pendingPayoutSettlementsCount: z.number().int().nonnegative(),
  openTicketsCount: z.number().int().nonnegative(),
  returnsPendingApprovalCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const metrics = await getAdminDashboardMetrics();
  const parsed = AdminMetricsSchema.safeParse(metrics);
  if (!parsed.success) {
    return Response.json({ error: "Metrics validation failed" }, { status: 500 });
  }

  return Response.json(parsed.data);
}
