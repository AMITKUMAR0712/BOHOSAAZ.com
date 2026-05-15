"use client";

import { useState } from "react";
import ExportDropdown from "@/components/ExportDropdown";
import { toast } from "@/lib/toast";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "VENDOR" | "ADMIN";
  isBlocked: boolean;
  blockedReason: string | null;
  blockedAt: string | null;
  tokenVersion: number;
  createdAt: string;
  vendor: { id: string; status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED"; shopName: string } | null;
};

export default function UsersClient({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<Record<string, string>>({});

  async function reload() {
    setLoading(true);
    const res = await fetch("/api/admin/users?take=50", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to load users");
      setLoading(false);
      return;
    }
    setUsers((data.data?.users || []) as UserRow[]);
    setLoading(false);
  }

  async function block(userId: string) {
    const r = (reason[userId] || "").trim();
    if (r.length < 3) {
      toast.error("Block reason is required");
      return;
    }

    const res = await fetch(`/api/admin/users/${userId}/block`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: r }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Block failed");
      return;
    }
    toast.success("Blocked");
    reload();
  }

  async function unblock(userId: string) {
    const res = await fetch(`/api/admin/users/${userId}/unblock`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Unblock failed");
      return;
    }
    toast.success("Unblocked");
    reload();
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-1 text-sm text-gray-600">Block/unblock users and review roles.</p>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <ExportDropdown
            filenameBase="Bohosaaz_Admin_Users"
            csv={{ href: "/api/export/admin/users.csv" }}
          />
          <button className="text-sm underline" onClick={reload} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-7 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-2">User</div>
          <div>Role</div>
          <div>Vendor</div>
          <div>Status</div>
          <div className="col-span-2">Action</div>
        </div>

        {users.map((u) => (
          <div key={u.id} className="grid grid-cols-7 gap-2 p-3 text-sm border-t">
            <div className="col-span-2">
              <div className="font-semibold">{u.name || "-"}</div>
              <div className="text-xs text-gray-600">{u.email}</div>
              <div className="text-xs text-gray-500">id: {u.id}</div>
            </div>
            <div className="font-semibold">{u.role}</div>
            <div>{u.vendor ? u.vendor.shopName : "-"}</div>
            <div className={u.isBlocked ? "font-semibold" : "text-gray-600"}>
              {u.isBlocked ? "BLOCKED" : "ACTIVE"}
            </div>
            <div className="col-span-2 flex items-center gap-2">
              {u.isBlocked ? (
                <button className="rounded-lg border px-3 py-1" onClick={() => unblock(u.id)}>
                  Unblock
                </button>
              ) : (
                <>
                  <input
                    className="flex-1 rounded-lg border px-2 py-1"
                    placeholder="Reason"
                    value={reason[u.id] || ""}
                    onChange={(e) =>
                      setReason((prev) => ({ ...prev, [u.id]: e.target.value }))
                    }
                  />
                  <button
                    className="rounded-lg bg-black text-white px-3 py-1"
                    onClick={() => block(u.id)}
                  >
                    Block
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
