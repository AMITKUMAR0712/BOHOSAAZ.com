"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountSecurityPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

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
    setMsg("✅ Password updated. Please log in again.");
    setCurrentPassword("");
    setNewPassword("");
    router.refresh();
  }

  async function logoutAll() {
    // Token invalidation across devices requires a server-side session/token-version model.
    // For now, provide a safe fallback: clear this device session.
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
  }

  return (
    <div className="grid gap-6">
      <div>
        <div className="text-xl font-semibold">Security</div>
        <div className="mt-1 text-sm text-gray-600">Password & session controls.</div>
        {msg ? <div className="mt-2 text-sm">{msg}</div> : null}
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">Change password</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
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

      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">Active sessions</div>
        <div className="mt-1 text-sm text-gray-600">Session listing is not available with cookie JWT-only auth.</div>
        <button className="mt-4 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={logoutAll}>
          Logout (this device)
        </button>
      </div>
    </div>
  );
}
