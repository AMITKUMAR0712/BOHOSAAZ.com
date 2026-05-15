"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

type SettingRow = {
  key: string;
  value: unknown;
  updatedAt: string;
};

function pretty(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "null";
  }
}

export default function SettingsClient({
  initialSettings,
}: {
  initialSettings: SettingRow[];
}) {
  const [settings, setSettings] = useState<SettingRow[]>(initialSettings);
  const [loading, setLoading] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("{}\n");

  const drafts = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = pretty(s.value);
    return map;
  }, [settings]);

  const [edited, setEdited] = useState<Record<string, string>>({});

  function getDraft(key: string) {
    return edited[key] ?? drafts[key] ?? "";
  }

  async function reload() {
    setLoading(true);
    const res = await fetch("/api/admin/settings", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to load settings");
      setLoading(false);
      return;
    }
    setSettings((data.data?.settings || []) as SettingRow[]);
    setEdited({});
    setLoading(false);
  }

  async function save(key: string, text: string) {
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      toast.error("Invalid JSON");
      return;
    }

    const res = await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Save failed");
      return;
    }

    await reload();
    toast.success("Saved");
  }

  async function createSetting() {
    const k = newKey.trim();
    if (!k) {
      toast.error("Key is required");
      return;
    }

    let value: unknown;
    try {
      value = JSON.parse(newValue);
    } catch {
      toast.error("Invalid JSON");
      return;
    }

    const res = await fetch(`/api/admin/settings/${encodeURIComponent(k)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Create failed");
      return;
    }

    setNewKey("");
    setNewValue("{}\n");
    await reload();
    toast.success("Created");
  }

  async function del(key: string) {
    const res = await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Delete failed");
      return;
    }
    await reload();
    toast.success("Deleted");
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-gray-600">Key/value JSON configuration.</p>

      <div className="mt-4">
        <button className="text-sm underline" onClick={reload} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="text-sm font-semibold">Create / Update</div>
        <div className="mt-3 grid gap-3 max-w-2xl">
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Key</label>
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="e.g. site.checkout.enabled"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Value (JSON)</label>
            <textarea
              className="rounded-lg border px-3 py-2 text-sm font-mono"
              rows={6}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
          <button
            className="w-fit rounded-xl bg-black px-4 py-2 text-sm text-white"
            onClick={createSetting}
          >
            Save
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-7 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-2">Key</div>
          <div className="col-span-3">Value</div>
          <div>Updated</div>
          <div>Action</div>
        </div>

        {settings.map((s) => (
          <div key={s.key} className="grid grid-cols-7 gap-2 p-3 text-sm border-t">
            <div className="col-span-2">
              <div className="font-semibold break-all">{s.key}</div>
            </div>
            <div className="col-span-3">
              <textarea
                className="w-full rounded-lg border px-2 py-2 text-xs font-mono"
                rows={6}
                value={getDraft(s.key)}
                onChange={(e) => setEdited((prev) => ({ ...prev, [s.key]: e.target.value }))}
              />
            </div>
            <div className="text-xs text-gray-600">
              {new Date(s.updatedAt).toLocaleString()}
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="rounded-lg bg-black text-white px-3 py-1"
                onClick={() => save(s.key, getDraft(s.key))}
              >
                Save
              </button>
              <button className="rounded-lg border px-3 py-1" onClick={() => del(s.key)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
