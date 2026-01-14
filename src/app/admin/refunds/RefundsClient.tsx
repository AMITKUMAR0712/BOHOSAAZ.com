"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";

type RefundItem = {
  id: string;
  orderId: string;
  price: number;
  quantity: number;
  product: { id: string; title: string };
};

export default function RefundsClient({
  initialItems,
}: {
  initialItems: RefundItem[];
}) {
  const [items, setItems] = useState<RefundItem[]>(initialItems);
  const [msg, setMsg] = useState<string | null>(null);

  async function reload() {
    setMsg(null);
    const res = await fetch("/api/admin/refunds", { credentials: "include" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) {
      setMsg(d?.error || "Failed to load refunds");
      setItems([]);
      return;
    }
    setItems((d.data?.items || []) as RefundItem[]);
  }

  async function approve(id: string) {
    setMsg(null);
    const res = await fetch(`/api/admin/refunds/${id}/approve`, {
      method: "POST",
      credentials: "include",
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) {
      setMsg(d?.error || "Approve failed");
      return;
    }
    setMsg("✅ Approved");
    reload();
  }

  return (
    <div className="p-6 md:p-10">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Refund Requests</CardTitle>
          <Button variant="outline" size="sm" onClick={reload}>
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {msg ? (
            <div
              className={
                msg.startsWith("✅")
                  ? "mb-4 text-sm text-success"
                  : msg.startsWith("❌")
                    ? "mb-4 text-sm text-danger"
                    : "mb-4 text-sm text-muted-foreground"
              }
            >
              {msg}
            </div>
          ) : null}

          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Product</TH>
                <TH>Order</TH>
                <TH>Amount</TH>
                <TH>Action</TH>
              </TR>
            </THead>
            <tbody>
              {items.length === 0 ? (
                <TR>
                  <TD colSpan={4} className="text-sm text-muted-foreground">
                    No refund requests
                  </TD>
                </TR>
              ) : (
                items.map((it) => (
                  <TR key={it.id}>
                    <TD className="font-semibold">{it.product.title}</TD>
                    <TD className="text-sm text-muted-foreground">{it.orderId}</TD>
                    <TD>
                      ₹{it.price} × {it.quantity}
                    </TD>
                    <TD>
                      <Button size="sm" onClick={() => approve(it.id)}>
                        Approve Refund
                      </Button>
                    </TD>
                  </TR>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
