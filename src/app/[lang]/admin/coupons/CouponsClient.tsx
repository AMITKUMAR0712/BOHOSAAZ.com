"use client";

import { useMemo, useState } from "react";
import ExportDropdown from "@/components/ExportDropdown";

type CouponRow = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  startAt: string | null;
  endAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CouponPayload = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  startAt: string | null;
  endAt: string | null;
  usageLimit: number | null;
  isActive: boolean;
};

function toDateTimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function CouponsClient({
  initialCoupons,
}: {
  lang: string;
  initialCoupons: CouponRow[];
}) {
  const [coupons, setCoupons] = useState<CouponRow[]>(initialCoupons);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "SCHEDULED" | "EXPIRED" | "AVAILABLE"
  >("ALL");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("10");
  const [minOrder, setMinOrder] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [isActive, setIsActive] = useState(true);

  const filtered = useMemo(() => {
    const now = Date.now();
    const query = q.trim().toUpperCase();
    return coupons
      .filter((c) => (query ? c.code.toUpperCase().includes(query) : true))
      .filter((c) => {
        if (statusFilter === "ALL") return true;
        if (statusFilter === "ACTIVE") return c.isActive;
        if (statusFilter === "INACTIVE") return !c.isActive;

        const start = c.startAt ? new Date(c.startAt).getTime() : null;
        const end = c.endAt ? new Date(c.endAt).getTime() : null;
        const scheduled = start != null && Number.isFinite(start) && start > now;
        const expired = end != null && Number.isFinite(end) && end < now;
        const within = !scheduled && !expired;
        const hasRemaining = c.usageLimit == null ? true : c.usedCount < c.usageLimit;

        if (statusFilter === "SCHEDULED") return scheduled;
        if (statusFilter === "EXPIRED") return expired;
        if (statusFilter === "AVAILABLE") return c.isActive && within && hasRemaining;
        return true;
      });
  }, [coupons, q, statusFilter]);

  function resetForm() {
    setEditingId(null);
    setCode("");
    setType("PERCENT");
    setValue("10");
    setMinOrder("");
    setMaxDiscount("");
    setStartAt("");
    setEndAt("");
    setUsageLimit("");
    setIsActive(true);
  }

  async function reload() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/admin/coupons", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load coupons");
      setLoading(false);
      return;
    }
    setCoupons((data.data?.coupons || []) as CouponRow[]);
    setLoading(false);
  }

  async function submit() {
    setMsg(null);

    const nValue = Number(value);
    if (!Number.isFinite(nValue) || nValue <= 0) return setMsg("Value must be a positive number");

    const payload: CouponPayload = {
      code: code.trim(),
      type,
      value: nValue,
      minOrderAmount: minOrder === "" ? null : Number(minOrder),
      maxDiscountAmount: maxDiscount === "" ? null : Number(maxDiscount),
      startAt: startAt === "" ? null : new Date(startAt).toISOString(),
      endAt: endAt === "" ? null : new Date(endAt).toISOString(),
      usageLimit: usageLimit === "" ? null : Number(usageLimit),
      isActive,
    };

    if (
      payload.minOrderAmount !== null &&
      (!Number.isFinite(payload.minOrderAmount) || payload.minOrderAmount < 0)
    ) {
      return setMsg("Min order must be a non-negative number");
    }
    if (
      payload.maxDiscountAmount !== null &&
      (!Number.isFinite(payload.maxDiscountAmount) || payload.maxDiscountAmount < 0)
    ) {
      return setMsg("Max discount must be a non-negative number");
    }
    if (payload.usageLimit !== null && (!Number.isFinite(payload.usageLimit) || payload.usageLimit <= 0)) {
      return setMsg("Usage limit must be a positive integer");
    }

    if (payload.startAt && payload.endAt) {
      const s = new Date(payload.startAt).getTime();
      const e = new Date(payload.endAt).getTime();
      if (Number.isFinite(s) && Number.isFinite(e) && s > e) {
        return setMsg("Start date must be before end date");
      }
    }

    const url = editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error || "Save failed");

    await reload();
    resetForm();
  }

  async function toggleActive(couponId: string, nextActive: boolean) {
    setMsg(null);
    const res = await fetch(`/api/admin/coupons/${couponId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: nextActive }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error || "Update failed");
    setCoupons((prev) => prev.map((c) => (c.id === couponId ? { ...c, isActive: nextActive } : c)));
  }

  function startEdit(c: CouponRow) {
    setEditingId(c.id);
    setCode(c.code);
    setType(c.type);
    setValue(String(c.value));
    setMinOrder(c.minOrderAmount === null ? "" : String(c.minOrderAmount));
    setMaxDiscount(c.maxDiscountAmount === null ? "" : String(c.maxDiscountAmount));
    setStartAt(toDateTimeLocalValue(c.startAt));
    setEndAt(toDateTimeLocalValue(c.endAt));
    setUsageLimit(c.usageLimit === null ? "" : String(c.usageLimit));
    setIsActive(c.isActive);
  }

  async function remove(couponId: string) {
    if (!confirm("Delete this coupon?")) return;
    setMsg(null);

    const res = await fetch(`/api/admin/coupons/${couponId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error || "Delete failed");

    setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    if (editingId === couponId) resetForm();
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Coupons</h1>
      <p className="mt-1 text-sm text-gray-600">Create and manage discount coupons.</p>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <div className="mt-4 flex items-center gap-3">
        <button className="text-sm underline" onClick={reload} disabled={loading}>
          Refresh
        </button>
        <ExportDropdown
          filenameBase="Bohosaaz_Admin_CouponUsage"
          csv={{ href: "/api/export/admin/coupons/usage.csv" }}
        />
        {editingId ? (
          <button className="text-sm underline" onClick={resetForm}>
            Cancel edit
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          className="h-10 rounded-lg border px-3 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search code…"
        />
        <select
          className="h-10 rounded-lg border px-3 text-sm"
          value={statusFilter}
          onChange={(e) => {
            const v = e.target.value as typeof statusFilter;
            setStatusFilter(v);
          }}
        >
          <option value="ALL">All</option>
          <option value="AVAILABLE">Available</option>
          <option value="ACTIVE">Active (flag)</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="text-sm font-semibold">{editingId ? "Edit coupon" : "Create coupon"}</div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Code</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="WELCOME10"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Type</span>
            <select
              className="rounded-lg border px-3 py-2"
              value={type}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === "PERCENT" || next === "FIXED") setType(next);
                }}
            >
              <option value="PERCENT">PERCENT</option>
              <option value="FIXED">FIXED</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Value</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Min order (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="number"
              step="0.01"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Max discount (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="number"
              step="0.01"
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Usage limit (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="number"
              step="1"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Start at (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">End at (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 mt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-gray-700">Active</span>
          </label>
        </div>

        <div className="mt-4">
          <button className="rounded-lg bg-black text-white px-4 py-2 text-sm" onClick={submit}>
            {editingId ? "Update" : "Create"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-3">Code</div>
          <div>Type</div>
          <div>Value</div>
          <div className="col-span-2">Rules</div>
          <div className="col-span-2">Usage</div>
          <div>Status</div>
          <div className="col-span-3">Actions</div>
        </div>

        {filtered.map((c) => (
          <div key={c.id} className="grid grid-cols-12 gap-2 p-3 text-sm border-t">
            <div className="col-span-3">
              <div className="font-semibold">{c.code}</div>
              <div className="text-xs text-gray-600">Updated: {new Date(c.updatedAt).toLocaleString()}</div>
            </div>
            <div className="text-gray-700">{c.type}</div>
            <div>
              {c.type === "PERCENT" ? `${c.value}%` : `₹${c.value.toFixed(2)}`}
            </div>
            <div className="col-span-2 text-xs text-gray-700">
              <div>Min: {c.minOrderAmount === null ? "-" : `₹${c.minOrderAmount.toFixed(2)}`}</div>
              <div>Max: {c.maxDiscountAmount === null ? "-" : `₹${c.maxDiscountAmount.toFixed(2)}`}</div>
              <div>Start: {c.startAt ? new Date(c.startAt).toLocaleString() : "-"}</div>
              <div>End: {c.endAt ? new Date(c.endAt).toLocaleString() : "-"}</div>
            </div>
            <div className="col-span-2 text-xs text-gray-700">
              <div>Used: {c.usedCount}</div>
              <div>Limit: {c.usageLimit ?? "-"}</div>
            </div>
            <div className={c.isActive ? "font-semibold" : "text-gray-600"}>{c.isActive ? "ACTIVE" : "INACTIVE"}</div>
            <div className="col-span-3 flex gap-2">
              <button className="rounded-lg border px-3 py-1" onClick={() => startEdit(c)}>
                Edit
              </button>
              {c.isActive ? (
                <button className="rounded-lg border px-3 py-1" onClick={() => toggleActive(c.id, false)}>
                  Disable
                </button>
              ) : (
                <button className="rounded-lg bg-black text-white px-3 py-1" onClick={() => toggleActive(c.id, true)}>
                  Enable
                </button>
              )}
              <button className="rounded-lg border px-3 py-1" onClick={() => remove(c.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
