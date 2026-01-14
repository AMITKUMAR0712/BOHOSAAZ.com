"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import ExportDropdown from "@/components/ExportDropdown";
import { toast } from "@/lib/toast";

type Vendor = {
  id: string;
  shopName: string;
  logoUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  createdAt: string;
  user: { email: string; name: string | null };
};

export default function VendorsClient({
  initialVendors,
}: {
  initialVendors: Vendor[];
}) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [loading, setLoading] = useState(false);
  const [rowHint, setRowHint] = useState<Record<string, string>>({});

  async function reload() {
    setLoading(true);
    const res = await fetch("/api/admin/vendors", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to load vendors");
      setLoading(false);
      return;
    }
    setVendors((data.data?.vendors || []) as Vendor[]);
    setLoading(false);
  }

  async function approve(vendorId: string) {
    setRowHint((prev) => {
      const next = { ...prev };
      delete next[vendorId];
      return next;
    });
    const res = await fetch(`/api/admin/vendors/${vendorId}/approve`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      const err = String(data?.error || "Approve failed");
      if (res.status === 400 && err.toLowerCase().includes("logo")) {
        setRowHint((prev) => ({
          ...prev,
          [vendorId]: "Logo upload required: ask the vendor to set a brand logo in Vendor → Settings before approval.",
        }));
      }
      toast.error(err);
      return;
    }
    toast.success("Approved");
    reload();
  }

  async function reject(vendorId: string) {
    const reason = window.prompt("Rejection reason (optional)") || "";
    const res = await fetch(`/api/admin/vendors/${vendorId}/reject`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() || null }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Reject failed");
      return;
    }
    toast.success("Rejected");
    reload();
  }

  return (
    <div className="p-6 md:p-10">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Vendor Requests</CardTitle>
              <CardDescription>Approve / Reject vendor applications.</CardDescription>
            </div>
            <ExportDropdown filenameBase="Bohosaaz_Admin_Vendors" csv={{ href: "/api/export/admin/vendors.csv" }} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
              Refresh
            </Button>
          </div>

          <div className="mt-4">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Shop</TH>
                  <TH>User</TH>
                  <TH>Status</TH>
                  <TH>Action</TH>
                </TR>
              </THead>

              <tbody>
                {loading ? (
                  <TR>
                    <TD colSpan={4} className="text-sm text-muted-foreground">Loading...</TD>
                  </TR>
                ) : vendors.length === 0 ? (
                  <TR>
                    <TD colSpan={4} className="text-sm text-muted-foreground">No requests</TD>
                  </TR>
                ) : (
                  vendors.map((v) => (
                    <TR key={v.id}>
                      <TD>
                        <div className="font-semibold">{v.shopName}</div>
                        <div className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</div>
                        {!v.logoUrl ? (
                          <div className="mt-1 text-xs text-amber-700">
                            Logo required for approval
                          </div>
                        ) : null}
                        {rowHint[v.id] ? (
                          <div className="mt-1 text-xs text-amber-700">{rowHint[v.id]}</div>
                        ) : null}
                      </TD>
                      <TD>
                        <div>{v.user?.name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{v.user?.email}</div>
                      </TD>
                      <TD className="font-semibold">{v.status}</TD>
                      <TD>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={v.status !== "PENDING" || !v.logoUrl}
                            onClick={() => approve(v.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={v.status !== "PENDING"}
                            onClick={() => reject(v.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
