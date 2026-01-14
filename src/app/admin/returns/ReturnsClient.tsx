"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ExportDropdown from "@/components/ExportDropdown";

type Row = {
  id: string;
  status: string;
  reason: string;
  updatedAt: string | Date;
  order: { id: string; createdAt: string | Date; status: string; paymentMethod: string };
  user: { id: string; email: string; name: string | null };
  vendor: { id: string; shopName: string };
  orderItem: { id: string; quantity: number; price: number; status: string; product: { id: string; title: string } };
  refundRecord: null | { status: string };
};

export default function ReturnsClient({ initialReturns }: { initialReturns: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialReturns);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      return (
        r.id.toLowerCase().includes(s) ||
        r.order.id.toLowerCase().includes(s) ||
        r.user.email.toLowerCase().includes(s) ||
        r.vendor.shopName.toLowerCase().includes(s) ||
        r.orderItem.product.title.toLowerCase().includes(s)
      );
    });
  }, [q, rows]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Returns</div>
          <div className="mt-1 text-sm text-muted-foreground">Review return requests, schedule pickup, and process refunds.</div>
        </div>
        <ExportDropdown
          filenameBase="Bohosaaz_Admin_Returns"
          csv={{ href: "/api/export/admin/returns.csv" }}
          pdf={{ href: "/api/export/admin/returns.pdf" }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
          placeholder="Search by order, email, vendor, product…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-muted/30 p-3 text-sm font-semibold">{filtered.length} return requests</div>
        <div className="divide-y">
          {filtered.map((r) => {
            const amount = r.orderItem.price * r.orderItem.quantity;
            return (
              <div key={r.id} className="p-4 grid gap-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{r.orderItem.product.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Return #{r.id} • Order #{r.order.id} • ₹{amount} • {r.order.paymentMethod}
                    </div>
                  </div>
                  <Link className="text-sm underline" href={`/admin/returns/${r.id}`}>
                    View
                  </Link>
                </div>

                <div className="text-xs">
                  Status: <b>{r.status}</b> • User: {r.user.email} • Vendor: {r.vendor.shopName}
                </div>

                <div className="text-xs text-muted-foreground">Updated: {new Date(r.updatedAt).toLocaleString()}</div>
              </div>
            );
          })}

          {filtered.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No matches.</div> : null}
        </div>
      </div>
    </div>
  );
}
