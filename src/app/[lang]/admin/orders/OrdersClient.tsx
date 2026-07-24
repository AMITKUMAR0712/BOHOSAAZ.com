"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ExportDropdown from "@/components/ExportDropdown";

const PAGE_SIZE = 10;

type OrderRow = {
  id: string;
  status:
    | "PENDING"
    | "COD_PENDING"
    | "PLACED"
    | "PAID"
    | "PACKED"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "RETURN_REQUESTED"
    | "RETURN_APPROVED"
    | "REFUNDED";
  total: number;
  city: string | null;
  state: string | null;
  createdAt: string;
  isDemo?: boolean;
  user: { id: string; email: string; name: string | null };
  _count: { items: number };
};

function statusClass(status: OrderRow["status"]) {
  if (status === "DELIVERED" || status === "REFUNDED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED") return "border-red-200 bg-red-50 text-red-700";
  if (status === "RETURN_REQUESTED" || status === "RETURN_APPROVED") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "PENDING" || status === "COD_PENDING") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function StatusBadge({ status }: { status: OrderRow["status"] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClass(status)}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function locationText(order: OrderRow) {
  return (order.city || "-") + (order.state ? `, ${order.state}` : "");
}

export default function OrdersClient({ lang }: { lang: string }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"ok" | "err">("err");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [clearingDemo, setClearingDemo] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, on]) => on).map(([id]) => id),
    [selected],
  );

  const allOnPageSelected = orders.length > 0 && orders.every((o) => selected[o.id]);
  const someOnPageSelected = orders.some((o) => selected[o.id]);

  const reload = useCallback(async (pageToLoad: number, keepMessage = false) => {
    setLoading(true);
    if (!keepMessage) setMsg(null);
    const res = await fetch(
      `/api/admin/orders?page=${pageToLoad}&pageSize=${PAGE_SIZE}`,
      { credentials: "include" },
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsgTone("err");
      setMsg(data?.error || "Failed to load orders");
      setLoading(false);
      return;
    }

    const nextPage = Number(data.data?.page || pageToLoad) || 1;
    const nextOrders = (
      (data.data?.orders || []) as Array<Omit<OrderRow, "createdAt"> & { createdAt: string | Date }>
    ).map((order) => ({
      ...order,
      total: Number(order.total ?? 0),
      createdAt:
        typeof order.createdAt === "string" ? order.createdAt : new Date(order.createdAt).toISOString(),
      user: order.user ?? { id: "unknown", email: "Unknown user", name: null },
      _count: order._count ?? { items: 0 },
    }));

    setPage(nextPage);
    setTotal(Number(data.data?.total || 0));
    setTotalPages(Math.max(1, Number(data.data?.totalPages || 1)));
    setOrders(nextOrders);
    setSelected({});
    setLoading(false);
  }, []);

  function toggleOne(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAllOnPage() {
    if (allOnPageSelected) {
      setSelected((prev) => {
        const next = { ...prev };
        for (const o of orders) delete next[o.id];
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = { ...prev };
      for (const o of orders) next[o.id] = true;
      return next;
    });
  }

  async function deleteOrder(id: string) {
    if (
      !window.confirm(
        `Permanently delete order ${id}? This removes the order and related items forever.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsgTone("err");
        setMsg(data?.error || "Failed to delete order");
        return;
      }
      setMsgTone("ok");
      setMsg("Order permanently deleted.");
      const remainingOnPage = orders.length - 1;
      const nextPage = remainingOnPage <= 0 && page > 1 ? page - 1 : page;
      await reload(nextPage, true);
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteSelected() {
    if (!selectedIds.length) return;
    if (
      !window.confirm(
        `Permanently delete ${selectedIds.length} selected order${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsgTone("err");
        setMsg(data?.error || "Failed to delete selected orders");
        return;
      }
      const count = Number(data.data?.count || selectedIds.length);
      setMsgTone("ok");
      setMsg(`Permanently deleted ${count} order${count === 1 ? "" : "s"}.`);
      const remainingOnPage = orders.length - selectedIds.length;
      const nextPage = remainingOnPage <= 0 && page > 1 ? page - 1 : page;
      await reload(nextPage, true);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function clearDemoOrders() {
    if (
      !window.confirm(
        "Permanently delete ALL demo/seed orders (Seed Street / @bohosaaz.test)? Real customer orders are kept. This cannot be undone.",
      )
    ) {
      return;
    }
    setClearingDemo(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/orders?scope=demo", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsgTone("err");
        setMsg(data?.error || "Failed to clear demo orders");
        return;
      }
      const count = Number(data.data?.count || 0);
      setMsgTone("ok");
      setMsg(
        count
          ? `Permanently deleted ${count} demo/seed order${count === 1 ? "" : "s"}.`
          : "No demo orders found.",
      );
      await reload(1, true);
    } finally {
      setClearingDemo(false);
    }
  }

  useEffect(() => {
    void reload(1);
  }, [reload]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const hasDemoOnPage = orders.some((o) => o.isDemo);

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="mt-1 text-sm text-gray-600">Review orders and update status. Deletes are permanent.</p>

      {msg ? (
        <div className={`mt-3 text-sm ${msgTone === "ok" ? "text-emerald-700" : "text-red-600"}`}>{msg}</div>
      ) : null}
      {loading && !orders.length && !msg ? (
        <div className="mt-3 text-sm text-gray-600">Loading orders...</div>
      ) : null}

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <ExportDropdown
            filenameBase="Bohosaaz_Admin_Orders"
            csv={{ href: "/api/export/admin/orders.csv" }}
            pdf={{ href: "/api/export/admin/orders.pdf" }}
          />
          <button className="text-sm underline" onClick={() => reload(page)} disabled={loading}>
            Refresh
          </button>
          <button
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            onClick={deleteSelected}
            disabled={bulkDeleting || loading || selectedIds.length === 0}
          >
            {bulkDeleting
              ? "Deleting…"
              : `Delete selected${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
          </button>
          <button
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            onClick={clearDemoOrders}
            disabled={clearingDemo || loading}
            title="Permanently removes seed/demo orders"
          >
            {clearingDemo ? "Clearing…" : "Clear demo orders"}
          </button>
        </div>
        {hasDemoOnPage ? (
          <p className="mt-2 text-xs text-amber-700">
            Some rows are demo/seed data. Use “Clear demo orders” or multi-select + Delete selected.
          </p>
        ) : null}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border bg-white">
        <div className="hidden grid-cols-[44px_minmax(0,2fr)_minmax(180px,1.2fr)_140px_80px_120px_minmax(120px,1fr)_110px] gap-3 bg-gray-50 p-3 text-sm font-semibold text-gray-700 lg:grid">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={allOnPageSelected}
              ref={(el) => {
                if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
              }}
              onChange={toggleAllOnPage}
              aria-label="Select all orders on this page"
              disabled={!orders.length || loading}
            />
          </div>
          <div>Order</div>
          <div>User</div>
          <div>Status</div>
          <div>Items</div>
          <div>Total</div>
          <div>Location</div>
          <div className="text-right">Actions</div>
        </div>

        {orders.map((o) => (
          <div
            key={o.id}
            className="border-t p-4 text-sm first:border-t-0 lg:grid lg:grid-cols-[44px_minmax(0,2fr)_minmax(180px,1.2fr)_140px_80px_120px_minmax(120px,1fr)_110px] lg:items-center lg:gap-3 lg:p-3"
          >
            <div className="mb-3 flex items-center gap-2 lg:mb-0 lg:justify-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={Boolean(selected[o.id])}
                onChange={() => toggleOne(o.id)}
                aria-label={`Select order ${o.id}`}
              />
              <span className="text-xs text-gray-500 lg:hidden">Select</span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 lg:block">
                <Link className="break-all font-semibold text-primary underline-offset-4 hover:underline" href={`/${lang}/admin/orders/${o.id}`}>
                  {o.id}
                </Link>
                <div className="lg:hidden">
                  <StatusBadge status={o.status} />
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span>{new Date(o.createdAt).toLocaleString()}</span>
                {o.isDemo ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                    Demo
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 min-w-0 lg:mt-0">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500 lg:hidden">User</div>
              <div className="truncate font-semibold text-gray-900">{o.user?.email || "Unknown user"}</div>
              <div className="truncate text-xs text-gray-600">{o.user?.name || "No name provided"}</div>
            </div>

            <div className="mt-4 hidden lg:mt-0 lg:block">
              <StatusBadge status={o.status} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-gray-50 p-3 lg:contents">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 lg:hidden">Items</div>
                <div className="font-semibold text-gray-900">{o._count.items}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 lg:hidden">Total</div>
                <div className="font-semibold text-gray-900">₹{Number(o.total ?? 0).toFixed(2)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 lg:hidden">Location</div>
                <div className="truncate text-gray-700 lg:text-xs">{locationText(o)}</div>
              </div>
            </div>

            <div className="mt-4 flex lg:mt-0 lg:justify-end">
              <button
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                onClick={() => deleteOrder(o.id)}
                disabled={deletingId === o.id || bulkDeleting}
              >
                {deletingId === o.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        ))}

        {!loading && !orders.length ? (
          <div className="p-6 text-center text-sm text-gray-600">No orders found.</div>
        ) : null}
      </div>

      {total > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{from}–{to}</span> of{" "}
            <span className="font-semibold text-gray-900">{total}</span>
            {selectedIds.length ? (
              <span className="ml-2 text-primary">· {selectedIds.length} selected</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
              disabled={loading || page <= 1}
              onClick={() => void reload(page - 1)}
            >
              Previous
            </button>
            <span className="min-w-24 text-center text-sm text-gray-700">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
              disabled={loading || page >= totalPages}
              onClick={() => void reload(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
