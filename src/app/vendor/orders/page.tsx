"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import ExportDropdown from "@/components/ExportDropdown";

type VendorOrderItem = {
  id: string;
  qty: number;
  price: number;
  lineTotal: number;
  status?: string;
  trackingCourier?: string | null;
  trackingNumber?: string | null;

  // local-only UI fields
  _nextStatus?: string;
  _courier?: string;
  _tracking?: string;

  product: { id: string; title: string; slug: string; img: string | null };
};

type VendorOrder = {
  orderId: string;
  status: string;
  total: number;
  createdAt: string;
  shipping?: {
    nameMasked?: string;
    city?: string;
    state?: string;
    pincodeMasked?: string;
  };
  items: VendorOrderItem[];
};

function getLangFromPath(pathname: string) {
  const seg0 = pathname.split("/").filter(Boolean)[0];
  return seg0 === "en" || seg0 === "hi" ? seg0 : "en";
}

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/vendor/orders", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data?.error || "Failed");
      setOrders([]);
      setLoading(false);
      return;
    }
    setOrders(data.orders || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const msgTone: "muted" | "success" | "danger" = msg?.startsWith("✅")
    ? "success"
    : msg?.startsWith("❌")
      ? "danger"
      : "muted";

  return (
    <div className="p-6 md:p-10">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Vendor Orders</CardTitle>
            <CardDescription>
              Only orders containing your products. Update item status & tracking.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ExportDropdown
              filenameBase="Bohosaaz_VendorOrders"
              csv={{ href: "/api/export/vendor/orders.csv" }}
              pdf={{ href: "/api/export/vendor/orders.pdf" }}
            />
            <Button variant="outline" size="sm" onClick={load}>
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {msg ? (
            <div
              className={
                msgTone === "success"
                  ? "mb-4 text-sm text-success"
                  : msgTone === "danger"
                    ? "mb-4 text-sm text-danger"
                    : "mb-4 text-sm text-muted-foreground"
              }
            >
              {msg}
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="rounded-(--radius) border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              No orders yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((o) => (
                <Card key={o.orderId}>
                  <CardHeader className="py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold">Order: {o.orderId}</div>
                        <div className="text-xs text-muted-foreground">
                          Order Status: <span className="font-semibold text-foreground">{o.status}</span> • Total
                          (your items): ₹{o.total}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
                        <Link
                          className="rounded-(--radius) border border-border px-3 py-1 text-xs hover:bg-muted/40"
                          href={`/${getLangFromPath(window.location.pathname)}/vendor/orders/${o.orderId}`}
                        >
                          View / Export
                        </Link>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="grid gap-3">
                    {o.items.map((it) => (
                      <div
                        key={it.id}
                        className="flex flex-col gap-3 rounded-(--radius) border border-border bg-card p-3 sm:flex-row sm:items-start"
                      >
                        <div className="h-16 w-16 rounded-(--radius) border border-border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                          {it.product.img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.product.img}
                              alt={it.product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">No img</span>
                          )}
                        </div>

                        <div className="flex-1">
                          <a
                            className="font-semibold hover:underline"
                            href={`/${getLangFromPath(window.location.pathname)}/p/${it.product.slug}`}
                          >
                            {it.product.title}
                          </a>

                          <div className="mt-1 text-xs text-muted-foreground">
                            Qty: {it.qty} • Price: ₹{it.price} • Line: ₹{it.lineTotal}
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                            <Select
                              defaultValue={it.status || "PLACED"}
                              onChange={(e) => (it._nextStatus = e.target.value)}
                            >
                              <option value="PLACED">PLACED</option>
                              <option value="PACKED">PACKED</option>
                              <option value="SHIPPED">SHIPPED</option>
                              <option value="DELIVERED">DELIVERED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </Select>

                            <Input
                              placeholder="Courier (optional)"
                              defaultValue={it.trackingCourier || ""}
                              onChange={(e) => (it._courier = e.target.value)}
                            />

                            <Input
                              placeholder="Tracking No. (optional)"
                              defaultValue={it.trackingNumber || ""}
                              onChange={(e) => (it._tracking = e.target.value)}
                            />
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                setMsg(null);
                                try {
                                  const res = await fetch(`/api/vendor/order-items/${it.id}`, {
                                    method: "PATCH",
                                    credentials: "include",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      status: it._nextStatus || it.status || "PLACED",
                                      trackingCourier: it._courier ?? it.trackingCourier ?? null,
                                      trackingNumber: it._tracking ?? it.trackingNumber ?? null,
                                    }),
                                  });
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok) throw new Error(data?.error || "Update failed");
                                  setMsg("✅ Updated");
                                  await load();
                                } catch (e) {
                                  const message = e instanceof Error ? e.message : "Error";
                                  setMsg(`❌ ${message}`);
                                }
                              }}
                            >
                              Save
                            </Button>

                            {(it.trackingCourier || it.trackingNumber) && (
                              <div className="text-xs text-muted-foreground">
                                Tracking: {it.trackingCourier || "-"} • {it.trackingNumber || "-"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="rounded-(--radius) border border-border bg-muted/30 p-3 text-sm">
                      <div className="font-semibold">Shipping (masked)</div>
                      <div className="mt-1 text-foreground">
                        {o.shipping?.nameMasked ? (
                          <div>
                            <span className="font-semibold">Name:</span> {o.shipping.nameMasked}
                          </div>
                        ) : null}
                        <div>
                          <span className="font-semibold">Location:</span> {o.shipping?.city || "-"}
                          {o.shipping?.state ? `, ${o.shipping.state}` : ""} • {o.shipping?.pincodeMasked || "-"}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Customer contact details are not shared with vendors.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
