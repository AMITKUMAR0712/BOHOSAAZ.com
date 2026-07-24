import { Suspense } from "react";
import ActivateVendorClient from "./ActivateVendorClient";

export default function ActivateVendorPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">Activating vendor access</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please wait…</p>
        </div>
      }
    >
      <ActivateVendorClient />
    </Suspense>
  );
}
