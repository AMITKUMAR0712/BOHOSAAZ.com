"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ActivateVendorClient() {
  const search = useSearchParams();
  const next = search.get("next") || "/vendor/dashboard";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Refresh failed");

        if (data?.role !== "VENDOR") {
          throw new Error("Vendor role is not active on your account yet.");
        }

        if (!cancelled) {
          window.location.replace(next.startsWith("/") ? next : "/vendor/dashboard");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not activate vendor access");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [next]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Activating vendor access</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Refreshing your session so the vendor panel opens correctly…
      </p>
      {error ? (
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
          <Link href="/account/vendor-status" className="text-sm underline">
            Back to vendor status
          </Link>
        </div>
      ) : null}
    </div>
  );
}
