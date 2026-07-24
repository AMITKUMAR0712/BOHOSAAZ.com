"use client";

import { useState } from "react";

export function ActivateVendorAccess({ next = "/vendor/dashboard" }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not refresh access");

      if (data?.role !== "VENDOR") {
        throw new Error(
          "Your account role is not vendor yet. Ask admin to re-approve, then try again."
        );
      }

      window.location.href = next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open vendor panel");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={activate}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-(--radius) bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-95 disabled:opacity-60"
      >
        {busy ? "Refreshing access..." : "View application & refresh access"}
      </button>
      <button
        type="button"
        onClick={activate}
        disabled={busy}
        className="text-sm underline disabled:opacity-60"
      >
        Open Vendor Panel
      </button>
      {error ? <div className="w-full text-sm text-danger">{error}</div> : null}
    </div>
  );
}
