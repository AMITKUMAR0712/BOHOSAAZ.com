"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  const params = useParams();
  const lang = typeof params?.lang === "string" ? params.lang : "en";
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

  async function deleteUser(userId: string, email: string) {
    if (!window.confirm(`Delete user ${email}? This cannot be undone.`)) return;

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Delete failed");
      return;
    }
    toast.success("User deleted");
    reload();
  }

  async function deleteAllNonAdminUsers() {
    if (!window.confirm("Delete ALL non-admin users? This cannot be undone.")) return;
    if (!window.confirm("Are you absolutely sure? All customer and vendor accounts will be removed.")) return;

    setLoading(true);
    const res = await fetch("/api/admin/users?scope=non-admin", {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Bulk delete failed");
      return;
    }
    toast.success(`Deleted ${data.data?.deleted ?? 0} users`);
    reload();
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-heading text-2xl tracking-tight text-foreground">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">Block, delete, and review user profiles and addresses.</p>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <ExportDropdown
            filenameBase="Bohosaaz_Admin_Users"
            csv={{ href: "/api/export/admin/users.csv" }}
          />
          <button className="text-sm underline" onClick={reload} disabled={loading}>
            Refresh
          </button>
          <button
            className="rounded-lg border border-danger/30 px-3 py-1.5 text-sm text-danger hover:bg-danger/10"
            onClick={deleteAllNonAdminUsers}
            disabled={loading}
            type="button"
          >
            Delete all non-admin users
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border">
        <div className="grid grid-cols-8 gap-2 bg-muted/40 p-3 text-sm font-semibold">
          <div className="col-span-2">User</div>
          <div>Role</div>
          <div>Vendor</div>
          <div>Status</div>
          <div className="col-span-3">Action</div>
        </div>

        {users.map((u) => (
          <div key={u.id} className="grid grid-cols-8 gap-2 border-t p-3 text-sm">
            <div className="col-span-2">
              <div className="font-semibold">{u.name || "-"}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
              <div className="text-xs text-muted-foreground">id: {u.id}</div>
            </div>
            <div className="font-semibold">{u.role}</div>
            <div>{u.vendor ? u.vendor.shopName : "-"}</div>
            <div className={u.isBlocked ? "font-semibold text-danger" : "text-muted-foreground"}>
              {u.isBlocked ? "BLOCKED" : "ACTIVE"}
            </div>
            <div className="col-span-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/${lang}/admin/users/${u.id}`}
                className="rounded-lg border px-3 py-1 hover:bg-muted/40"
              >
                View
              </Link>
              {u.isBlocked ? (
                <button className="rounded-lg border px-3 py-1" onClick={() => unblock(u.id)} type="button">
                  Unblock
                </button>
              ) : (
                <>
                  <input
                    className="min-w-[120px] flex-1 rounded-lg border px-2 py-1"
                    placeholder="Reason"
                    value={reason[u.id] || ""}
                    onChange={(e) =>
                      setReason((prev) => ({ ...prev, [u.id]: e.target.value }))
                    }
                  />
                  <button
                    className="rounded-lg bg-black px-3 py-1 text-white"
                    onClick={() => block(u.id)}
                    type="button"
                  >
                    Block
                  </button>
                </>
              )}
              {u.role !== "ADMIN" ? (
                <button
                  className="rounded-lg border border-danger/30 px-3 py-1 text-danger hover:bg-danger/10"
                  onClick={() => deleteUser(u.id, u.email)}
                  type="button"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
