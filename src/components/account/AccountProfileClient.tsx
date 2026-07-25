"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Me = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "USER" | "VENDOR" | "ADMIN";
};

export type ProfileAddress = {
  id?: string;
  label: string | null;
  fullName: string;
  phone: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  pincode: string;
  kind: "PRIMARY" | "DEFAULT" | "SECONDARY";
  isDefault: boolean;
};

const emptyAddress: ProfileAddress = {
  label: "",
  fullName: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  pincode: "",
  kind: "SECONDARY",
  isDefault: false,
};

export default function AccountProfileClient({ loginHref = "/login" }: { loginHref?: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState<ProfileAddress>(emptyAddress);
  const [addresses, setAddresses] = useState<ProfileAddress[]>([]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim().length > 0 || phone.trim().length > 0, [name, phone]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/me", { credentials: "include" });
    const d: unknown = await res.json().catch(() => null);
    const user: Me | null =
      d && typeof d === "object" && "user" in d ? ((d as { user?: unknown }).user as Me | null) : null;
    setMe(user);
    setName(user?.name || "");
    setPhone(user?.phone || "");

    if (!user) {
      setLoading(false);
      return;
    }

    const addrRes = await fetch("/api/addresses", { credentials: "include", cache: "no-store" });
    const addrJson = await addrRes.json().catch(() => ({}));
    const rows = Array.isArray(addrJson?.addresses) ? (addrJson.addresses as ProfileAddress[]) : [];
    setAddresses(rows);
    setAddr(emptyAddress);

    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function saveProfile() {
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, phone }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setMsg("✅ Profile saved");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveAddress() {
    setMsg(null);
    if (!addr.fullName.trim() || !addr.phone.trim() || !addr.address1.trim() || !addr.city.trim() || !addr.state.trim() || !addr.pincode.trim()) {
      setMsg("Please fill full name, phone, address, city, state and pincode.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label: addr.label,
        fullName: addr.fullName,
        phone: addr.phone,
        address1: addr.address1,
        address2: addr.address2 || null,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        kind: addr.isDefault ? "DEFAULT" : addr.kind,
        isDefault: addr.isDefault || addresses.length === 0,
      };
      const res = await fetch("/api/addresses", {
        method: addr.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(addr.id ? { id: addr.id, action: "update", address: payload } : payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Failed to save address");
      setMsg("✅ Address saved");
      setAddr(emptyAddress);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to save address");
    } finally {
      setSaving(false);
    }
  }

  async function setPrimaryAddress(id: string) {
    setMsg(null);
    const res = await fetch("/api/addresses", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, action: "default" }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error || "Failed to set primary address");
      return;
    }
    setMsg("✅ Primary address updated");
    await load();
  }

  async function deleteAddress(id: string) {
    setMsg(null);
    const res = await fetch("/api/addresses", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, action: "delete" }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error || "Failed to delete address");
      return;
    }
    setAddr(emptyAddress);
    setMsg("✅ Address deleted");
    await load();
  }

  async function changePassword() {
    setMsg(null);
    const res = await fetch("/api/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error || "Failed");
      return;
    }
    setMsg("✅ Password updated");
    setCurrentPassword("");
    setNewPassword("");
  }

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!me) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        You need to sign in to view your profile.{" "}
        <Link className="text-primary underline" href={loginHref}>
          Sign in
        </Link>
      </div>
    );
  }

  const primary = addresses.find((row) => row.isDefault) ?? addresses[0] ?? null;

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Account</div>
        <div className="mt-2 font-heading text-2xl tracking-tight text-foreground">Profile & Address</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Update your details and shipping address. Your primary address is used at checkout.
        </div>

        {msg ? <div className="mt-3 text-sm">{msg}</div> : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Name</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email (read-only)</span>
            <input className="rounded-lg border border-border bg-muted/30 px-3 py-2" value={me.email} readOnly />
          </label>

          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mobile number</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
            />
          </label>
        </div>

        <button
          className="mt-4 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40 disabled:opacity-50"
          disabled={saving || !canSubmit}
          onClick={saveProfile}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-heading text-xl text-foreground">
              Shipping addresses{addresses.length ? ` (${addresses.length})` : ""}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Saare saved addresses yahan dikhenge — same list checkout pe bhi aati hai. Phone number required.
            </div>
          </div>
          <button
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
            onClick={() =>
              setAddr({
                ...emptyAddress,
                fullName: name || me.name || "",
                phone: phone || me.phone || "",
                isDefault: addresses.length === 0,
                kind: addresses.length === 0 ? "DEFAULT" : "SECONDARY",
              })
            }
          >
            Add new
          </button>
        </div>

        {primary ? (
          <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-primary">Primary address (checkout default)</div>
            <div className="mt-2 font-semibold text-foreground">{primary.label || primary.fullName}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {primary.fullName} • {primary.phone}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {primary.address1}
              {primary.address2 ? `, ${primary.address2}` : ""}, {primary.city}, {primary.state} - {primary.pincode}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No address saved yet. Add one below — it will show on checkout automatically.
          </div>
        )}

        <div className="mt-4">
          <div className="text-sm font-semibold text-foreground">All addresses</div>
          {addresses.length ? (
            <div className="mt-3 grid gap-3">
              {addresses.map((address) => (
                <div key={address.id} className="rounded-2xl border border-border bg-card/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{address.label || address.fullName}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {address.fullName} • Phone: {address.phone}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {address.address1}
                        {address.address2 ? `, ${address.address2}` : ""}, {address.city}, {address.state} -{" "}
                        {address.pincode}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
                        address.isDefault
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {address.isDefault ? "Primary" : "Saved"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted/40"
                      onClick={() => setAddr({ ...address, label: address.label || "" })}
                    >
                      Edit
                    </button>
                    {!address.isDefault ? (
                      <button
                        className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted/40"
                        onClick={() => address.id && setPrimaryAddress(address.id)}
                      >
                        Set primary
                      </button>
                    ) : null}
                    <button
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-danger hover:bg-muted/40"
                      onClick={() => address.id && deleteAddress(address.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
              Abhi koi address nahi hai. Form fill karke Save address dabao.
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">Label</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={addr.label || ""}
              onChange={(e) => setAddr({ ...addr, label: e.target.value })}
              placeholder="Home, Office, Parents..."
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">Full name</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={addr.fullName}
              onChange={(e) => setAddr({ ...addr, fullName: e.target.value })}
            />
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mobile number</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              type="tel"
              inputMode="numeric"
              value={addr.phone}
              onChange={(e) => setAddr({ ...addr, phone: e.target.value })}
              placeholder="e.g. 9876543210"
            />
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs text-muted-foreground">Address line 1</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={addr.address1}
              onChange={(e) => setAddr({ ...addr, address1: e.target.value })}
            />
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs text-muted-foreground">Address line 2</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={addr.address2 || ""}
              onChange={(e) => setAddr({ ...addr, address2: e.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">City</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={addr.city}
              onChange={(e) => setAddr({ ...addr, city: e.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">State</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={addr.state}
              onChange={(e) => setAddr({ ...addr, state: e.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">Pincode</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={addr.pincode}
              onChange={(e) => setAddr({ ...addr, pincode: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={addr.isDefault || addresses.length === 0}
              onChange={(e) =>
                setAddr({
                  ...addr,
                  isDefault: e.target.checked,
                  kind: e.target.checked ? "DEFAULT" : "SECONDARY",
                })
              }
            />
            Set as primary address (used by default at checkout)
          </label>
        </div>

        <button
          className="mt-4 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
          onClick={saveAddress}
          disabled={saving}
        >
          {addr.id ? "Update address" : "Save address"}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-xl font-semibold">Password</div>
        <div className="mt-1 text-sm text-muted-foreground">Change your password.</div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">Current password</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">New password</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
        </div>

        <button
          className="mt-4 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
          onClick={changePassword}
        >
          Update password
        </button>
      </div>
    </div>
  );
}
