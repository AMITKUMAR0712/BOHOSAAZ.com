import VendorPayoutsClient from "./VendorPayoutsClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ExportDropdown from "@/components/ExportDropdown";

export default async function VendorPayoutsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Payouts</CardTitle>
            <CardDescription>Read-only summary of vendor sub-orders and payouts.</CardDescription>
          </div>
          <ExportDropdown
            filenameBase="Bohosaaz_Payouts"
            csv={{ href: "/api/export/vendor/payouts.csv" }}
            pdf={{ href: "/api/export/vendor/payouts.pdf" }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <VendorPayoutsClient />
      </CardContent>
    </Card>
  );
}
