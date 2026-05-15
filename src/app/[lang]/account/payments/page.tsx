import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { OrderItemStatus, OrderStatus } from "@prisma/client";

type PaymentRow = {
  orderId: string;
  amount: number;
  method: "COD" | "Online";
  status: "PAID" | "REFUNDED" | "PARTIAL_REFUND";
  date: Date;
};

function computePaymentRows(
  orders: Array<{
    id: string;
    status: OrderStatus;
    paymentMethod: "COD" | "WALLET" | "RAZORPAY";
    total: number;
    createdAt: Date;
    items: Array<{ status: OrderItemStatus }>;
  }>
): PaymentRow[] {
  return orders.map((o) => {
    const refundedCount = o.items.filter((it) => it.status === "REFUNDED").length;
    const status: PaymentRow["status"] =
      refundedCount === 0
        ? "PAID"
        : refundedCount === o.items.length
          ? "REFUNDED"
          : "PARTIAL_REFUND";

    const method: PaymentRow["method"] = o.paymentMethod === "COD" ? "COD" : "Online";

    return {
      orderId: o.id,
      amount: o.total,
      method,
      status,
      date: o.createdAt,
    };
  });
}

export default async function AccountPaymentsPage() {
  const user = await requireUser();
  if (!user) return null;

  const orders = await prisma.order.findMany({
    where: { userId: user.id, status: { not: "PENDING" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      total: true,
      createdAt: true,
      items: { select: { status: true } },
    },
  });

  const rows = computePaymentRows(orders);

  return (
    <div className="grid gap-4">
      <div>
        <div className="text-xl font-semibold">Payments history</div>
        <div className="mt-1 text-sm text-gray-600">Payment method and refund status by order.</div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-gray-50 p-4 text-sm font-semibold">Payments</div>
        <div className="p-4 grid gap-3">
          {rows.map((r) => (
            <div key={r.orderId} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Order #{r.orderId}</div>
                  <div className="mt-1 text-xs text-gray-600">{r.date.toLocaleString()}</div>
                </div>
                <div className="text-right text-sm">
                  <div>
                    Amount: <b>₹{r.amount}</b>
                  </div>
                  <div>
                    Method: <b>{r.method}</b>
                  </div>
                  <div>
                    Status: <b>{r.status}</b>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {rows.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-gray-600">No payments yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
