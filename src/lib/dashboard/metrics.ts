import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { paiseToRupees, round2 } from "@/lib/money";
import type { AdminDashboardMetrics, UserDashboardMetrics, VendorDashboardMetrics } from "@/lib/dashboard/types";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfNDaysAgo(days: number) {
  const d = startOfToday();
  d.setDate(d.getDate() - days);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const ORDER_STATUS_ACTIVE = [
  OrderStatus.COD_PENDING,
  OrderStatus.PLACED,
  OrderStatus.PAID,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.RETURN_REQUESTED,
  OrderStatus.RETURN_APPROVED,
] as const satisfies readonly OrderStatus[];

const ORDER_STATUS_GMV = [
  OrderStatus.COD_PENDING,
  OrderStatus.PLACED,
  OrderStatus.PAID,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.RETURN_REQUESTED,
  OrderStatus.RETURN_APPROVED,
  OrderStatus.REFUNDED,
] as const satisfies readonly OrderStatus[];

export async function getUserDashboardMetrics(userId: string): Promise<UserDashboardMetrics> {
  const [cartOrder, pendingOrdersCount, deliveredOrdersCount, wallet, activeReturnsCount, openSupportTicketsCount] =
    await Promise.all([
      prisma.order.findFirst({
        where: { userId, status: "PENDING" },
        select: { items: { select: { quantity: true } } },
      }),
      prisma.order.count({
        where: { userId, status: { in: [...ORDER_STATUS_ACTIVE] } },
      }),
      prisma.order.count({
        where: { userId, status: "DELIVERED" },
      }),
      prisma.walletAccount.findUnique({
        where: { userId },
        select: { balancePaise: true },
      }),
      prisma.returnRequest.count({
        where: {
          userId,
          status: { in: ["REQUESTED", "APPROVED", "PICKED"] },
        },
      }),
      prisma.userTicket.count({
        where: {
          userId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      }),
    ]);

  const cartItemsCount = (cartOrder?.items ?? []).reduce((sum, it) => sum + (it.quantity || 0), 0);

  return {
    cartItemsCount,
    pendingOrdersCount,
    deliveredOrdersCount,
    walletBalanceRupees: round2(paiseToRupees(wallet?.balancePaise ?? BigInt(0))),
    activeReturnsCount,
    openSupportTicketsCount,
    updatedAt: new Date().toISOString(),
  };
}

export async function getVendorDashboardMetrics(vendorId: string): Promise<VendorDashboardMetrics> {
  const month = startOfMonth();

  const [
    pendingPayoutAgg,
    settledAgg,
    monthSettledAgg,
    ordersCount,
    returnsCount,
  ] = await Promise.all([
    prisma.payout.aggregate({
      where: { vendorId, status: { in: ["PENDING", "HELD"] } },
      _sum: { amountPaise: true },
    }),
    prisma.payout.aggregate({
      where: { vendorId, status: "SETTLED" },
      _sum: { amountPaise: true, commissionPaise: true },
    }),
    prisma.payout.aggregate({
      where: { vendorId, status: "SETTLED", settledAt: { gte: month } },
      _sum: { amountPaise: true },
    }),
    prisma.vendorOrder.count({ where: { vendorId } }),
    prisma.returnRequest.count({ where: { vendorId } }),
  ]);

  const pendingPayoutPaise = (pendingPayoutAgg._sum.amountPaise ?? BigInt(0)) as bigint;
  const settledPayoutPaise = (settledAgg._sum.amountPaise ?? BigInt(0)) as bigint;
  const commissionPaidPaise = (settledAgg._sum.commissionPaise ?? BigInt(0)) as bigint;
  const monthEarningsPaise = (monthSettledAgg._sum.amountPaise ?? BigInt(0)) as bigint;

  return {
    totalEarningsRupees: round2(paiseToRupees(settledPayoutPaise)),
    earningsThisMonthRupees: round2(paiseToRupees(monthEarningsPaise)),
    pendingPayoutRupees: round2(paiseToRupees(pendingPayoutPaise)),
    settledPayoutRupees: round2(paiseToRupees(settledPayoutPaise)),
    commissionPaidRupees: round2(paiseToRupees(commissionPaidPaise)),
    totalOrdersCount: ordersCount,
    totalReturnsCount: returnsCount,
    updatedAt: new Date().toISOString(),
  };
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const today = startOfToday();
  const week = startOfNDaysAgo(7);

  const [
    gmvTodayAgg,
    gmv7dAgg,
    commissionTodayAgg,
    commission7dAgg,
    pendingVendorApprovalsCount,
    pendingPayoutSettlementsCount,
    supportTicketsOpen,
    userTicketsOpen,
    returnsPendingApprovalCount,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        createdAt: { gte: today },
        status: { in: [...ORDER_STATUS_GMV] },
      },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: week },
        status: { in: [...ORDER_STATUS_GMV] },
      },
      _sum: { total: true },
    }),
    prisma.vendorOrder.aggregate({
      where: {
        createdAt: { gte: today },
        status: { in: ["PLACED", "PACKED", "SHIPPED", "DELIVERED", "SETTLED"] },
      },
      _sum: { commission: true },
    }),
    prisma.vendorOrder.aggregate({
      where: {
        createdAt: { gte: week },
        status: { in: ["PLACED", "PACKED", "SHIPPED", "DELIVERED", "SETTLED"] },
      },
      _sum: { commission: true },
    }),
    prisma.vendor.count({ where: { status: "PENDING" } }),
    prisma.payout.count({ where: { status: { in: ["PENDING", "HELD"] } } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.userTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.returnRequest.count({ where: { status: "REQUESTED" } }),
  ]);

  return {
    gmvTodayRupees: round2(Number(gmvTodayAgg._sum?.total ?? 0)),
    gmv7dRupees: round2(Number(gmv7dAgg._sum?.total ?? 0)),
    commissionTodayRupees: round2(Number(commissionTodayAgg._sum.commission ?? 0)),
    commission7dRupees: round2(Number(commission7dAgg._sum.commission ?? 0)),
    pendingVendorApprovalsCount,
    pendingPayoutSettlementsCount,
    openTicketsCount: supportTicketsOpen + userTicketsOpen,
    returnsPendingApprovalCount,
    updatedAt: new Date().toISOString(),
  };
}
