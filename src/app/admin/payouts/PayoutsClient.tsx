"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import ExportDropdown from "@/components/ExportDropdown";

type PayoutRow = {
  id: string;
  subtotal: number;
  commission: number;
  payout: number;
  order: { id: string };
  vendor: { id: string; shopName: string };
};

export default function PayoutsClient({
  initialRows,
}: {
  initialRows: PayoutRow[];
}) {
  const [rows, setRows] = useState<PayoutRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const res = await fetch("/api/admin/payouts", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed");
      setRows([]);
    } else {
      setMsg(null);
      setRows((data.data?.rows || []) as PayoutRow[]);
    }
    setLoading(false);
  }

  async function settle(id: string) {
    setMsg(null);
    const res = await fetch(`/api/admin/payouts/${id}/settle`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error || "Failed");
    setMsg("✅ Settled");
    await reload();
  }

  return (
    <div className="p-6 md:p-10">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Vendor Payouts</CardTitle>
            <CardDescription>Delivered vendor orders waiting for settlement</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ExportDropdown
              filenameBase="Bohosaaz_Admin_Payouts"
              csv={{ href: "/api/export/admin/finance/payouts.csv" }}
              pdf={{ href: "/api/export/admin/finance/payouts.pdf" }}
            />
            <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
              Refresh
            </Button>
          </div>
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
                <TH>Order</TH>
                <TH>Vendor</TH>
                <TH>Subtotal</TH>
                <TH>Commission</TH>
                <TH>Payout</TH>
                <TH>Action</TH>
              </TR>
            </THead>
            <tbody>
              {loading ? (
                <TR>
                  <TD colSpan={6} className="text-sm text-muted-foreground">
                    Loading...
                  </TD>
                </TR>
              ) : rows.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="text-sm text-muted-foreground">
                    No payouts
                  </TD>
                </TR>
              ) : (
                rows.map((r) => (
                  <TR key={r.id}>
                    <TD>{r.order.id}</TD>
                    <TD>{r.vendor.shopName}</TD>
                    <TD>₹{r.subtotal}</TD>
                    <TD>₹{r.commission}</TD>
                    <TD className="font-semibold">₹{r.payout}</TD>
                    <TD>
                      <Button size="sm" onClick={() => settle(r.id)}>
                        Mark Settled
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
