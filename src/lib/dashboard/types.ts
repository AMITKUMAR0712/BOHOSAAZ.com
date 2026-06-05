export type VendorApplicationStatus = "NOT_APPLIED" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type UserDashboardMetrics = {
  cartItemsCount: number;
  pendingOrdersCount: number;
  deliveredOrdersCount: number;
  activeReturnsCount: number;
  openSupportTicketsCount: number;
  vendorApplicationStatus: VendorApplicationStatus;
  updatedAt: string;
};

export type VendorDashboardMetrics = {
  totalEarningsRupees: number;
  earningsThisMonthRupees: number;
  pendingPayoutRupees: number;
  settledPayoutRupees: number;
  totalOrdersCount: number;
  totalReturnsCount: number;
  updatedAt: string;
};

export type AdminDashboardMetrics = {
  gmvTodayRupees: number;
  gmv7dRupees: number;
  pendingVendorApprovalsCount: number;
  pendingPayoutSettlementsCount: number;
  openTicketsCount: number;
  returnsPendingApprovalCount: number;
  updatedAt: string;
};

export type DashboardRole = "user" | "vendor" | "admin";

export type DashboardMetricsByRole = {
  user: UserDashboardMetrics;
  vendor: VendorDashboardMetrics;
  admin: AdminDashboardMetrics;
};
