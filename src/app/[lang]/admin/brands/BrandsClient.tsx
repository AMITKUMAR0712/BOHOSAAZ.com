"use client";

import { useMemo, useState } from "react";

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type BrandPayload = {
  name: string;
  slug?: string;
  logoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export default function BrandsClient({
  initialBrands,
}: {
  lang: string;
  initialBrands: BrandRow[];
}) {
  const [brands, setBrands] = useState<BrandRow[]>(initialBrands);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const sorted = useMemo(() => brands, [brands]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setSlug("");
    setLogoUrl("");
    setSortOrder("0");
    setIsActive(true);
  }

  async function uploadToCloudinary(file: File) {
    const sigRes = await fetch("/api/upload/signature", {
      method: "POST",
      credentials: "include",
    });
    const sig = await sigRes.json().catch(() => ({}));
    if (!sigRes.ok) throw new Error(sig?.error || "Signature failed");

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: "POST",
      body: form,
    });

    const uploaded = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) throw new Error(uploaded?.error?.message || "Upload failed");

    return uploaded.secure_url as string;
  }

  async function reload() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/admin/brands", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load brands");
      setLoading(false);
      return;
    }
    setBrands((data.data?.brands || []) as BrandRow[]);
    setLoading(false);
  }

  function startEdit(b: BrandRow) {
    setEditingId(b.id);
    setName(b.name);
    setSlug(b.slug);
    setLogoUrl(b.logoUrl ?? "");
    setSortOrder(String(b.sortOrder));
    setIsActive(b.isActive);
  }

  async function submit() {
    setMsg(null);

    const nSort = Number(sortOrder);
    if (!Number.isFinite(nSort) || !Number.isInteger(nSort)) {
      return setMsg("Sort order must be an integer");
    }

    const payload: BrandPayload = {
      name: name.trim(),
      logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
      isActive,
      sortOrder: nSort,
    };

    const cleanedSlug = slug.trim();
    if (cleanedSlug) payload.slug = cleanedSlug;

    const url = editingId ? `/api/admin/brands/${editingId}` : "/api/admin/brands";
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

  async function toggleActive(brandId: string, nextActive: boolean) {
    setMsg(null);
    const res = await fetch(`/api/admin/brands/${brandId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: nextActive }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error || "Update failed");
    setBrands((prev) => prev.map((b) => (b.id === brandId ? { ...b, isActive: nextActive } : b)));
  }

  async function remove(brandId: string) {
    if (!confirm("Delete this brand?")) return;
    setMsg(null);

    const res = await fetch(`/api/admin/brands/${brandId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error || "Delete failed");

    setBrands((prev) => prev.filter((b) => b.id !== brandId));
    if (editingId === brandId) resetForm();
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Brands</h1>
      <p className="mt-1 text-sm text-gray-600">Create and manage popular brands shown on the homepage.</p>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <div className="mt-4 flex items-center gap-3">
        <button className="text-sm underline" onClick={reload} disabled={loading}>
          Refresh
        </button>
        {editingId ? (
          <button className="text-sm underline" onClick={resetForm}>
            Cancel edit
          </button>
        ) : null}
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="text-sm font-semibold">{editingId ? "Edit brand" : "Create brand"}</div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Name</span>
            <input className="rounded-lg border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Slug (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-from-name"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Logo URL (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Upload logo</span>
            <input
              type="file"
              accept="image/*"
              className="rounded-lg border px-3 py-2"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setMsg(null);
                try {
                  const url = await uploadToCloudinary(file);
                  setLogoUrl(url);
                  setMsg("✅ Logo uploaded");
                } catch (err) {
                  const message = err instanceof Error ? err.message : "Upload failed";
                  setMsg(`❌ ${message}`);
                } finally {
                  e.target.value = "";
                }
              }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Sort order</span>
            <input className="rounded-lg border px-3 py-2" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>

          <label className="flex items-center gap-2 mt-7">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-gray-600">Active</span>
          </label>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            className="rounded-lg border px-4 py-2 text-sm"
            onClick={submit}
            disabled={loading || name.trim().length < 1}
          >
            {editingId ? "Save" : "Create"}
          </button>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Brand</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Sort</th>
              <th className="px-3 py-2 text-left">Active</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg border bg-white overflow-hidden grid place-items-center">
                      {b.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.logoUrl} alt={b.name} className="h-8 w-8 object-contain" />
                      ) : (
                        <div className="font-semibold">{b.name.trim().slice(0, 1).toUpperCase()}</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{b.name}</div>
                      <div className="text-xs text-gray-500">{b.logoUrl ? "Has logo" : "No logo"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-600">{b.slug}</td>
                <td className="px-3 py-2">{b.sortOrder}</td>
                <td className="px-3 py-2">
                  <button className="text-sm underline" onClick={() => toggleActive(b.id, !b.isActive)}>
                    {b.isActive ? "Yes" : "No"}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-3">
                    <button className="text-sm underline" onClick={() => startEdit(b)}>
                      Edit
                    </button>
                    <button className="text-sm underline" onClick={() => remove(b.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!sorted.length ? (
              <tr>
                <td className="px-3 py-6 text-gray-500" colSpan={5}>
                  No brands yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
