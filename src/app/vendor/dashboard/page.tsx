import { DashboardCards } from "@/components/dashboard/DashboardCards";

export default function VendorDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live metrics update automatically.</p>
      </div>

      <DashboardCards role="vendor" basePath="" />
    </div>
  );
}
