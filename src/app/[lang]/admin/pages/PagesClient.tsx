"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type CmsRow = {
  id: string;
  slug: string;
  title: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

function publicPathForSlug(lang: string, slug: string) {
  const s = slug.trim().replace(/^\/+/, "");
  if (s === "about") return `/${lang}/about`;
  if (s === "terms") return `/${lang}/terms`;
  if (s === "privacy") return `/${lang}/privacy`;
  return `/${lang}/${encodeURIComponent(s)}`;
}

export default function PagesClient({
  lang,
  initialPages,
}: {
  lang: string;
  initialPages: CmsRow[];
}) {
  const [pages, setPages] = useState<CmsRow[]>(initialPages);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [slug, setSlug] = useState("about");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const sorted = useMemo(() => {
    return [...pages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [pages]);

  function resetForm() {
    setEditingId(null);
    setSlug("about");
    setTitle("");
    setContent("");
  }

  function fillForm(p: CmsRow) {
    setEditingId(p.id);
    setSlug(p.slug);
    setTitle(p.title);
    setContent(p.content);
  }

  async function reload() {
    setLoading(true);
    const res = await fetch("/api/admin/cms-pages?take=50", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to load pages");
      setLoading(false);
      return;
    }
    setPages((data.data?.pages || []) as CmsRow[]);
    setLoading(false);
  }

  async function save() {
    setLoading(true);

    const payload = {
      slug: slug.trim(),
      title: title.trim(),
      content: content,
    };

    const isEdit = Boolean(editingId);
    const url = isEdit ? `/api/admin/cms-pages/${editingId}` : "/api/admin/cms-pages";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to save");
      setLoading(false);
      return;
    }

    const page = (data.data?.page || null) as CmsRow | null;
    if (page) {
      setPages((prev) => {
        const idx = prev.findIndex((p) => p.id === page.id);
        if (idx >= 0) return prev.map((p) => (p.id === page.id ? page : p));
        return [page, ...prev];
      });
    }

    resetForm();
    setLoading(false);
    toast.success("Saved");
  }

  async function remove(id: string) {
    if (!confirm("Delete this page?")) return;

    setLoading(true);

    const res = await fetch(`/api/admin/cms-pages/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to delete");
      setLoading(false);
      return;
    }

    setPages((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) resetForm();
    setLoading(false);
    toast.success("Deleted");
  }

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">CMS Pages</h1>
          <p className="mt-1 text-sm text-gray-600">Edit About, Terms, Privacy and other pages</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-sm underline" onClick={reload} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold">{editingId ? "Edit page" : "New page"}</div>

          <div className="mt-4 grid gap-3">
            <label className="text-sm">
              Slug
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="about"
              />
            </label>

            <label className="text-sm">
              Title
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="About"
              />
            </label>

            <label className="text-sm">
              Content
              <textarea
                className="mt-1 w-full min-h-80 rounded border px-3 py-2 text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write page content..."
              />
            </label>

            <div className="flex items-center gap-3">
              <button className="rounded border px-3 py-2 text-sm" onClick={save} disabled={loading}>
                {editingId ? "Save" : "Create"}
              </button>
              <button className="text-sm underline" onClick={resetForm} disabled={loading}>
                Reset
              </button>
              {slug.trim() ? (
                <Link className="text-sm underline" href={publicPathForSlug(lang, slug)} target="_blank">
                  View
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <div className="bg-gray-50 p-3 text-sm font-semibold">Pages</div>

          <div className="divide-y">
            {sorted.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.title || p.slug}</div>
                    <div className="mt-0.5 text-xs text-gray-500 truncate">/{p.slug} • v{p.version}</div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span>Updated: {new Date(p.updatedAt).toLocaleString()}</span>
                      <Link className="underline" href={publicPathForSlug(lang, p.slug)} target="_blank">
                        Open
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded border px-3 py-1 text-xs" onClick={() => fillForm(p)}>
                      Edit
                    </button>
                    <button className="rounded border px-3 py-1 text-xs" onClick={() => remove(p.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!sorted.length ? <div className="p-4 text-sm text-gray-600">No pages yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
