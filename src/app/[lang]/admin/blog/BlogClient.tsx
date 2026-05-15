"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl: string | null;
  tags: string[];
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function BlogClient({
  lang,
  initialPosts,
}: {
  lang: string;
  initialPosts: BlogRow[];
}) {
  const [posts, setPosts] = useState<BlogRow[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [tagsCsv, setTagsCsv] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const sorted = useMemo(() => {
    return [...posts].sort((a, b) => {
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      return tb - ta;
    });
  }, [posts]);

  function resetForm() {
    setEditingId(null);
    setSlug("");
    setTitle("");
    setExcerpt("");
    setBody("");
    setCoverImageUrl("");
    setTagsCsv("");
    setIsPublished(false);
  }

  function fillForm(p: BlogRow) {
    setEditingId(p.id);
    setSlug(p.slug);
    setTitle(p.title);
    setExcerpt(p.excerpt);
    setBody(p.body);
    setCoverImageUrl(p.coverImageUrl || "");
    setTagsCsv((p.tags || []).join(", "));
    setIsPublished(Boolean(p.isPublished));
  }

  async function reload() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/admin/blogs?take=50", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load posts");
      setLoading(false);
      return;
    }
    setPosts((data.data?.posts || []) as BlogRow[]);
    setLoading(false);
  }

  function parseTags(input: string) {
    const parts = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts;
  }

  async function save() {
    setLoading(true);
    setMsg(null);

    const payload = {
      slug,
      title,
      excerpt,
      body,
      coverImageUrl: coverImageUrl.trim() ? coverImageUrl.trim() : null,
      tags: parseTags(tagsCsv),
      isPublished,
    };

    const isEdit = Boolean(editingId);
    const url = isEdit ? `/api/admin/blogs/${editingId}` : "/api/admin/blogs";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to save");
      setLoading(false);
      return;
    }

    const post = (data.data?.post || null) as BlogRow | null;
    if (post) {
      setPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === post.id);
        if (idx >= 0) return prev.map((p) => (p.id === post.id ? post : p));
        return [post, ...prev];
      });
    }

    resetForm();
    setLoading(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this post?")) return;

    setLoading(true);
    setMsg(null);

    const res = await fetch(`/api/admin/blogs/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to delete");
      setLoading(false);
      return;
    }

    setPosts((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) resetForm();
    setLoading(false);
  }

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Blog</h1>
          <p className="mt-1 text-sm text-gray-600">Create, publish, and edit posts</p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="text-sm underline" href={`/${lang}/blog`} target="_blank">
            View public blog
          </Link>
          <button className="text-sm underline" onClick={reload} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold">{editingId ? "Edit post" : "New post"}</div>

          <div className="mt-4 grid gap-3">
            <label className="text-sm">
              Slug
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="handmade-story"
              />
            </label>

            <label className="text-sm">
              Title
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Craft stories"
              />
            </label>

            <label className="text-sm">
              Excerpt
              <textarea
                className="mt-1 w-full min-h-24 rounded border px-3 py-2 text-sm"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Short summary..."
              />
            </label>

            <label className="text-sm">
              Cover image URL (optional)
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>

            <label className="text-sm">
              Tags (comma-separated)
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={tagsCsv}
                onChange={(e) => setTagsCsv(e.target.value)}
                placeholder="craft, saree, artisan"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Published
            </label>

            <label className="text-sm">
              Body
              <textarea
                className="mt-1 w-full min-h-60 rounded border px-3 py-2 text-sm"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the full post..."
              />
            </label>

            <div className="flex items-center gap-3">
              <button className="rounded border px-3 py-2 text-sm" onClick={save} disabled={loading}>
                {editingId ? "Save" : "Create"}
              </button>
              <button className="text-sm underline" onClick={resetForm} disabled={loading}>
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <div className="bg-gray-50 p-3 text-sm font-semibold">Posts</div>
          {sorted.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">No posts.</div>
          ) : (
            <div>
              {sorted.map((p) => (
                <div key={p.id} className="border-t p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{p.title}</div>
                      <div className="text-xs text-gray-600">/{p.slug}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {p.isPublished ? "PUBLISHED" : "DRAFT"}
                        {p.publishedAt ? ` • ${new Date(p.publishedAt).toLocaleString()}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-xs underline" onClick={() => fillForm(p)} disabled={loading}>
                        Edit
                      </button>
                      <button className="text-xs underline text-red-600" onClick={() => remove(p.id)} disabled={loading}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-700">
                    {p.excerpt.length > 160 ? p.excerpt.slice(0, 160) + "…" : p.excerpt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
