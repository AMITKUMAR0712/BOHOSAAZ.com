"use client";

import * as React from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useLiveMetrics } from "@/lib/useLiveMetrics";
import { formatInr } from "@/lib/money";
import type { AdminDashboardMetrics, UserDashboardMetrics, VendorDashboardMetrics } from "@/lib/dashboard/types";

type Role = "user" | "vendor" | "admin";

type Props = {
  role: Role;
  basePath: string; // e.g. "/en"
};

function IconBox(props: { children: React.ReactNode }) {
  return (
    <div className="h-5 w-5 text-muted-foreground" aria-hidden>
      {props.children}
    </div>
  );
}

function CartIcon() {
  return (
    <IconBox>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 6h15l-2 9H7L6 6Z" />
        <path d="M6 6 5 3H2" />
        <path d="M8 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
        <path d="M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
      </svg>
    </IconBox>
  );
}

function OrdersIcon() {
  return (
    <IconBox>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 4h12v16H6z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
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

function ReturnIcon() {
  return (
    <IconBox>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10a6 6 0 0 1 6 6v5" />
      </svg>
    </IconBox>
  );
}

function TicketIcon() {
  return (
    <IconBox>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7h16v6a2 2 0 0 1-2 2h-1a2 2 0 0 0-2 2v1H9v-1a2 2 0 0 0-2-2H6a2 2 0 0 1-2-2V7z" />
        <path d="M9 10h6" />
      </svg>
    </IconBox>
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

export function DashboardCards({ role, basePath }: Props) {
  const { data, loading } = useLiveMetrics(role);
  const updatedText = formatUpdated(data?.updatedAt ?? null);

  const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  if (role === "user") {
    const d = data as UserDashboardMetrics | null;
    return (
      <div className={grid}>
        <KpiCard label="Cart Items" value={d?.cartItemsCount ?? 0} href={`${basePath}/cart`} icon={<CartIcon />} updatedText={updatedText} loading={loading} />
        <KpiCard label="Pending Orders" value={d?.pendingOrdersCount ?? 0} href={`${basePath}/account/orders`} icon={<OrdersIcon />} updatedText={updatedText} loading={loading} />
        <KpiCard label="Delivered Orders" value={d?.deliveredOrdersCount ?? 0} href={`${basePath}/account/orders`} icon={<OrdersIcon />} updatedText={updatedText} loading={loading} />
        <KpiCard label="Wallet Balance" value={formatInr(d?.walletBalanceRupees ?? 0)} href={`${basePath}/account/wallet`} icon={<WalletIcon />} updatedText={updatedText} loading={loading} />
        <KpiCard label="Active Returns / Refunds" value={d?.activeReturnsCount ?? 0} href={`${basePath}/account/returns`} icon={<ReturnIcon />} updatedText={updatedText} loading={loading} />
        <KpiCard label="Open Support Tickets" value={d?.openSupportTicketsCount ?? 0} href={`${basePath}/account/support`} icon={<TicketIcon />} updatedText={updatedText} loading={loading} />
      </div>
    );
  }

  if (role === "vendor") {
    const d = data as VendorDashboardMetrics | null;
    return (
      <div className={grid}>
        <KpiCard label="Total Earnings (lifetime)" value={formatInr(d?.totalEarningsRupees ?? 0)} href={`${basePath}/vendor/payouts`} icon={<MoneyIcon />} updatedText={updatedText} loading={loading} />
        <KpiCard label="Earnings This Month" value={formatInr(d?.earningsThisMonthRupees ?? 0)} href={`${basePath}/vendor/payouts`} icon={<MoneyIcon />} updatedText={updatedText} loading={loading} />
        <KpiCard label="Pending Payout" value={formatInr(d?.pendingPayoutRupees ?? 0)} href={`${basePath}/vendor/payouts`} icon={<WalletIcon />} updatedText={updatedText} loading={loading} />
        <KpiCard label="Settled Payout" value={formatInr(d?.settledPayoutRupees ?? 0)} href={`${basePath}/vendor/payouts`} icon={<WalletIcon />} updatedText={updatedText} loading={loading} />
        <KpiCard label="Commission Paid" value={formatInr(d?.commissionPaidRupees ?? 0)} href={`${basePath}/vendor/payouts`} icon={<MoneyIcon />} updatedText={updatedText} loading={loading} />
        <KpiCard label="Total Orders" value={d?.totalOrdersCount ?? 0} href={`${basePath}/vendor/orders`} icon={<OrdersIcon />} updatedText={updatedText} loading={loading} />
        <KpiCard label="Total Returns" value={d?.totalReturnsCount ?? 0} href={`${basePath}/vendor/returns`} icon={<ReturnIcon />} updatedText={updatedText} loading={loading} />
      </div>
    );
  }

  const d = data as AdminDashboardMetrics | null;
  const gmv = `${formatInr(d?.gmvTodayRupees ?? 0)} / ${formatInr(d?.gmv7dRupees ?? 0)}`;
  const commission = `${formatInr(d?.commissionTodayRupees ?? 0)} / ${formatInr(d?.commission7dRupees ?? 0)}`;

  return (
    <div className={grid}>
      <KpiCard label="Total GMV (today / 7d)" value={gmv} href={`${basePath}/admin/finance`} icon={<MoneyIcon />} updatedText={updatedText} loading={loading} />
      <KpiCard label="Commission Earned (today / 7d)" value={commission} href={`${basePath}/admin/finance`} icon={<MoneyIcon />} updatedText={updatedText} loading={loading} />
      <KpiCard label="Pending Vendor Approvals" value={d?.pendingVendorApprovalsCount ?? 0} href={`${basePath}/admin/vendors`} icon={<OrdersIcon />} updatedText={updatedText} loading={loading} />
      <KpiCard label="Pending Payout Settlements" value={d?.pendingPayoutSettlementsCount ?? 0} href={`${basePath}/admin/payouts`} icon={<WalletIcon />} updatedText={updatedText} loading={loading} />
      <KpiCard label="Open Tickets" value={d?.openTicketsCount ?? 0} href={`${basePath}/admin/support`} icon={<TicketIcon />} updatedText={updatedText} loading={loading} />
      <KpiCard label="Returns Pending Approval" value={d?.returnsPendingApprovalCount ?? 0} href={`${basePath}/admin/returns`} icon={<ReturnIcon />} updatedText={updatedText} loading={loading} />
    </div>
  );
}
