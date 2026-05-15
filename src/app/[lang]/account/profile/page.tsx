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

type Address = {
  fullName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
};

const defaultAddress: Address = {
  fullName: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  pincode: "",
};

export default function AccountProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState<Address>(defaultAddress);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 || phone.trim().length > 0;
  }, [name, phone]);

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

    const addrRes = await fetch("/api/profile", { credentials: "include" });
    const addrJson = await addrRes.json();
    setAddr(addrJson.address || defaultAddress);

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
        body: JSON.stringify({ name, phone, address: addr }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setMsg("✅ Saved");
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed";
      setMsg(message);
    } finally {
      setSaving(false);
    }
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
    return <div className="rounded-2xl border p-4 text-sm text-gray-600">Loading…</div>;
  }

  if (!me) {
    return (
      <div className="rounded-2xl border p-4 text-sm text-gray-600">
        You need to sign in to view your profile. <Link className="underline" href="/login">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border p-4">
        <div className="text-xl font-semibold">Profile</div>
        <div className="mt-1 text-sm text-gray-600">Update your personal details.</div>

        {msg ? <div className="mt-3 text-sm">{msg}</div> : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Name</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Email (read-only)</span>
            <input className="rounded-lg border px-3 py-2 bg-gray-50" value={me.email} readOnly />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Phone</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
            />
          </label>
        </div>

        <button
          className="mt-4 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={saving || !canSubmit}
          onClick={saveProfile}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-xl font-semibold">Shipping address</div>
        <div className="mt-1 text-sm text-gray-600">Saved for faster checkout.</div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Full name</span>
            <input className="rounded-lg border px-3 py-2" value={addr.fullName} onChange={(e) => setAddr({ ...addr, fullName: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Phone</span>
            <input className="rounded-lg border px-3 py-2" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs text-gray-600">Address line 1</span>
            <input className="rounded-lg border px-3 py-2" value={addr.address1} onChange={(e) => setAddr({ ...addr, address1: e.target.value })} />
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs text-gray-600">Address line 2</span>
            <input className="rounded-lg border px-3 py-2" value={addr.address2} onChange={(e) => setAddr({ ...addr, address2: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">City</span>
            <input className="rounded-lg border px-3 py-2" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">State</span>
            <input className="rounded-lg border px-3 py-2" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Pincode</span>
            <input className="rounded-lg border px-3 py-2" value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value })} />
          </label>
        </div>

        <button
          className="mt-4 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          onClick={saveProfile}
          disabled={saving}
        >
          Save address
        </button>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-xl font-semibold">Password</div>
        <div className="mt-1 text-sm text-gray-600">Change your password.</div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Current password</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">New password</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
        </div>

        <button className="mt-4 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={changePassword}>
          Update password
        </button>
      </div>
    </div>
  );
}
