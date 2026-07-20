"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "@/lib/toast";

type Address = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  pincode: string;
  kind: string;
  isDefault: boolean;
};

type UserDetail = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "USER" | "VENDOR" | "ADMIN";
  isBlocked: boolean;
  blockedReason: string | null;
  createdAt: string;
  vendor: { id: string; status: string; shopName: string } | null;
  addresses: Address[];
};

export default function UserDetailClient({ userId }: { userId: string }) {
  const params = useParams();
  const lang = typeof params?.lang === "string" ? params.lang : "en";
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!active) return;
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load user");
        setLoading(false);
        return;
      }
      setUser(data.data.user as UserDetail);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading user profile…</div>;
  }

  if (!user) {
    return <div className="p-6 text-sm text-muted-foreground">User not found.</div>;
  }

  return (
    <div className="p-6 md:p-10">
      <Link href={`/${lang}/admin/users`} className="text-sm underline text-muted-foreground hover:text-foreground">
        ← Back to users
      </Link>

      <div className="mt-4">
        <div className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground">User profile</div>
        <h1 className="mt-2 font-heading text-2xl tracking-tight text-foreground">{user.name || "Unnamed user"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="font-heading text-lg text-foreground">Profile details</div>
          <div className="mt-3 grid gap-2 text-sm">
            <div><span className="text-muted-foreground">Role:</span> {user.role}</div>
            <div><span className="text-muted-foreground">Phone:</span> {user.phone || "-"}</div>
            <div><span className="text-muted-foreground">Status:</span> {user.isBlocked ? "BLOCKED" : "ACTIVE"}</div>
            {user.vendor ? (
              <div><span className="text-muted-foreground">Vendor:</span> {user.vendor.shopName} ({user.vendor.status})</div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="font-heading text-lg text-foreground">Shipping addresses</div>
          <p className="mt-1 text-sm text-muted-foreground">Saved delivery addresses for this user.</p>
          {user.addresses.length ? (
            <div className="mt-4 grid gap-3">
              {user.addresses.map((address) => (
                <div key={address.id} className="rounded-xl border border-border bg-background/60 p-3 text-sm">
                  <div className="font-semibold text-foreground">
                    {address.label || address.fullName}
                    {address.isDefault ? <span className="ml-2 text-xs text-primary">Default</span> : null}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {address.fullName} · {address.phone}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {address.address1}
                    {address.address2 ? `, ${address.address2}` : ""}, {address.city}, {address.state} {address.pincode}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">No saved addresses yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
