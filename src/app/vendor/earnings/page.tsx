"use client";

import * as React from "react";
import ExportDropdown from "@/components/ExportDropdown";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useLiveMetrics } from "@/lib/useLiveMetrics";
import { formatInr } from "@/lib/money";
import type { VendorDashboardMetrics } from "@/lib/dashboard/types";

function IconBox(props: { children: React.ReactNode }) {
  return (
    <div className="h-5 w-5 text-muted-foreground" aria-hidden>
      {props.children}
    </div>
  );
}

function MoneyIcon() {
  return (
    <IconBox>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    </IconBox>
  );
}

function WalletIcon() {
  return (
    <IconBox>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7h18v12H3z" />
        <path d="M16 11h5v4h-5z" />
        <path d="M3 7V6a2 2 0 0 1 2-2h14" />
      </svg>
    </IconBox>
  );
}

function formatUpdated(updatedAt?: string | null) {
  if (!updatedAt) return "Updated just now";
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t)) return "Updated just now";
  const diff = Math.max(0, Date.now() - t);
  if (diff < 5000) return "Updated just now";
  const s = Math.round(diff / 1000);
  if (s < 60) return `Updated ${s}s ago`;
  const m = Math.round(s / 60);
  return `Updated ${m}m ago`;
}

export default function VendorEarningsPage() {
  const { data, loading, error } = useLiveMetrics("vendor");
  const d = data as VendorDashboardMetrics | null;
  const updatedText = formatUpdated(d?.updatedAt ?? null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Earnings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Total earnings, payouts, and commission paid.
          </p>
          {error ? <div className="mt-2 text-sm text-danger">{error}</div> : null}
        </div>
        <ExportDropdown
          filenameBase="Bohosaaz_Vendor_Earnings"
          csv={{ href: "/api/export/vendor/payouts.csv" }}
          pdf={{ href: "/api/export/vendor/payouts.pdf" }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total Earnings (lifetime)"
          value={formatInr(d?.totalEarningsRupees ?? 0)}
          href="/vendor/earnings"
          icon={<MoneyIcon />}
          updatedText={updatedText}
          loading={loading}
        />
        <KpiCard
          label="Earnings This Month"
          value={formatInr(d?.earningsThisMonthRupees ?? 0)}
          href="/vendor/earnings"
          icon={<MoneyIcon />}
          updatedText={updatedText}
          loading={loading}
        />
        <KpiCard
          label="Pending Payout"
          value={formatInr(d?.pendingPayoutRupees ?? 0)}
          href="/vendor/earnings"
          icon={<WalletIcon />}
          updatedText={updatedText}
          loading={loading}
        />
        <KpiCard
          label="Settled Payout"
          value={formatInr(d?.settledPayoutRupees ?? 0)}
          href="/vendor/earnings"
          icon={<WalletIcon />}
          updatedText={updatedText}
          loading={loading}
        />
        <KpiCard
          label="Commission Paid"
          value={formatInr(d?.commissionPaidRupees ?? 0)}
          href="/vendor/earnings"
          icon={<MoneyIcon />}
          updatedText={updatedText}
          loading={loading}
        />
      </div>
    </div>
  );
}
