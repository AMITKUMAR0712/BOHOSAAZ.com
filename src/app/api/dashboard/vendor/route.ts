import { z } from "zod";
import { requireVendor } from "@/lib/auth";
import { getVendorDashboardMetrics } from "@/lib/dashboard/metrics";

export const runtime = "nodejs";

const VendorMetricsSchema = z.object({
  totalEarningsRupees: z.number().nonnegative(),
  earningsThisMonthRupees: z.number().nonnegative(),
  pendingPayoutRupees: z.number().nonnegative(),
  settledPayoutRupees: z.number().nonnegative(),
  commissionPaidRupees: z.number().nonnegative(),
  totalOrdersCount: z.number().int().nonnegative(),
  totalReturnsCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export async function GET() {
  const vendor = await requireVendor();
  if (!vendor) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!vendor.vendor?.id) return Response.json({ error: "Vendor not found" }, { status: 400 });

  const metrics = await getVendorDashboardMetrics(vendor.vendor.id);
  const parsed = VendorMetricsSchema.safeParse(metrics);
  if (!parsed.success) {
    return Response.json({ error: "Metrics validation failed" }, { status: 500 });
  }

  return Response.json(parsed.data);
}
