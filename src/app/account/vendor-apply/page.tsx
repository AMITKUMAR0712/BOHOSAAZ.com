import { Suspense } from "react";
import { VendorApplyClient } from "./VendorApplyClient";

export default function VendorApplyPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading application...</div>}>
      <VendorApplyClient />
    </Suspense>
  );
}
