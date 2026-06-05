"use client";

import { useMemo, useState } from "react";

type BannerRow = {
  id: string;
  title: string;
  highlightText: string | null;
  subtitle: string | null;
  imageUrl: string;
  videoUrl: string | null;
  ctaText: string | null;
  ctaHref: string | null;
  isActive: boolean;
  sortOrder: number;
  couponCode: string | null;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type BannerPayload = {
  title: string | null;
  highlightText: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  ctaText: string | null;
  ctaHref: string | null;
  sortOrder: number;
  couponCode: string | null;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
};

function toDateTimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function BannersClient({
  initialBanners,
}: {
  lang: string;
  initialBanners: BannerRow[];
}) {
  const [banners, setBanners] = useState<BannerRow[]>(initialBanners);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [highlightText, setHighlightText] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [couponCode, setCouponCode] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  const sorted = useMemo(() => banners, [banners]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setHighlightText("");
    setSubtitle("");
    setImageUrl("");
    setVideoUrl("");
    setCtaText("");
    setCtaHref("");
    setSortOrder("0");
    setCouponCode("");
    setStartAt("");
    setEndAt("");
    setIsActive(true);
  }

  async function uploadToServer(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "banner");

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });

    const uploaded = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) throw new Error(uploaded?.error || "Upload failed");

    const url = String(uploaded?.url || "");
    if (!url) throw new Error("Upload failed");
    return url;
  }

  async function reload() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/admin/banners", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load banners");
      setLoading(false);
      return;
    }
    setBanners((data.data?.banners || []) as BannerRow[]);
    setLoading(false);
  }

  async function submit() {
    setMsg(null);

    const nSort = Number(sortOrder);
    if (!Number.isFinite(nSort) || nSort < 0 || !Number.isInteger(nSort)) {
      return setMsg("Sort order must be a non-negative integer");
    }

    const payload: BannerPayload = {
      title: title.trim() === "" ? null : title.trim(),
      highlightText: highlightText.trim() === "" ? null : highlightText.trim(),
      subtitle: subtitle.trim() === "" ? null : subtitle.trim(),
      imageUrl: imageUrl.trim() === "" ? null : imageUrl.trim(),
      videoUrl: videoUrl.trim() === "" ? null : videoUrl.trim(),
      ctaText: ctaText.trim() === "" ? null : ctaText.trim(),
      ctaHref: ctaHref.trim() === "" ? null : ctaHref.trim(),
      sortOrder: nSort,
      couponCode: couponCode.trim() === "" ? null : couponCode.trim().toUpperCase(),
      startAt: startAt === "" ? null : new Date(startAt).toISOString(),
      endAt: endAt === "" ? null : new Date(endAt).toISOString(),
      isActive,
    };

    const url = editingId ? `/api/admin/banners/${editingId}` : "/api/admin/banners";
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

  async function uploadMultipleVideoStories(files: FileList | null) {
    const selected = Array.from(files ?? []).filter((file) => file.type === "video/mp4" || file.type === "video/webm");
    if (!selected.length) return;

    const nSort = Number(sortOrder);
    if (!Number.isFinite(nSort) || nSort < 0 || !Number.isInteger(nSort)) {
      return setMsg("Sort order must be a non-negative integer");
    }

    setLoading(true);
    setMsg(`Uploading ${selected.length} video stories...`);

    try {
      const baseTitle = title.trim() || "Bohosaaz gifting story";
      const fallbackImage = imageUrl.trim() || "/logo-copy.jpeg";

      for (let i = 0; i < selected.length; i++) {
        const file = selected[i];
        const url = await uploadToServer(file);
        const payload: BannerPayload = {
          title: selected.length > 1 ? `${baseTitle} ${i + 1}` : baseTitle,
          highlightText: highlightText.trim() === "" ? "Gifting Story" : highlightText.trim(),
          subtitle: subtitle.trim() === "" ? "Thoughtful gifts, premium moments, and celebration-ready picks." : subtitle.trim(),
          imageUrl: fallbackImage,
          videoUrl: url,
          ctaText: ctaText.trim() === "" ? "Shop now" : ctaText.trim(),
          ctaHref: ctaHref.trim() === "" ? null : ctaHref.trim(),
          sortOrder: nSort + i,
          couponCode: couponCode.trim() === "" ? null : couponCode.trim().toUpperCase(),
          startAt: startAt === "" ? null : new Date(startAt).toISOString(),
          endAt: endAt === "" ? null : new Date(endAt).toISOString(),
          isActive,
        };

        const res = await fetch("/api/admin/banners", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || `Failed to create story ${i + 1}`);
      }

      await reload();
      setMsg(`${selected.length} video stories uploaded and added to homepage.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Multiple video upload failed";
      setMsg(message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(bannerId: string, nextActive: boolean) {
    setMsg(null);
    const res = await fetch(`/api/admin/banners/${bannerId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: nextActive }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error || "Update failed");
    setBanners((prev) => prev.map((b) => (b.id === bannerId ? { ...b, isActive: nextActive } : b)));
  }

  function startEdit(b: BannerRow) {
    setEditingId(b.id);
    setTitle(b.title);
    setHighlightText(b.highlightText ?? "");
    setSubtitle(b.subtitle ?? "");
    setImageUrl(b.imageUrl);
    setVideoUrl(b.videoUrl ?? "");
    setCtaText(b.ctaText ?? "");
    setCtaHref(b.ctaHref ?? "");
    setSortOrder(String(b.sortOrder));
    setCouponCode(b.couponCode ?? "");
    setStartAt(toDateTimeLocalValue(b.startAt));
    setEndAt(toDateTimeLocalValue(b.endAt));
    setIsActive(b.isActive);
  }

  async function remove(bannerId: string) {
    if (!confirm("Delete this banner?")) return;
    setMsg(null);

    const res = await fetch(`/api/admin/banners/${bannerId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error || "Delete failed");

    setBanners((prev) => prev.filter((b) => b.id !== bannerId));
    if (editingId === bannerId) resetForm();
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Banners</h1>
      <p className="mt-1 text-sm text-gray-600">Create and manage homepage banners.</p>

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
        <div className="text-sm font-semibold">{editingId ? "Edit banner" : "Create banner"}</div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Title (optional)</span>
            <input className="rounded-lg border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auto: Bohosaaz banner" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Highlight text (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              placeholder="e.g. Limited Time"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Subtitle (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Image URL (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://.../banner.webp or /uploads/..."
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Upload image from device</span>
            <input
              type="file"
              accept="image/*"
              className="rounded-lg border px-3 py-2"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setMsg(null);
                try {
                  const url = await uploadToServer(file);
                  setImageUrl(url);
                  setMsg("Image uploaded");
                } catch (err) {
                  const message = err instanceof Error ? err.message : "Upload failed";
                  setMsg(message);
                } finally {
                  e.target.value = "";
                }
              }}
            />
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-gray-600">Video URL (optional, MP4/WebM)</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://.../hero.mp4"
            />
            <span className="text-xs text-gray-500">Paste video here. If a video is pasted in Image URL by mistake, the server will still treat it as video.</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Upload video from device</span>
            <input
              type="file"
              accept="video/mp4,video/webm"
              className="rounded-lg border px-3 py-2"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setMsg(null);
                try {
                  const url = await uploadToServer(file);
                  setVideoUrl(url);
                  setMsg("Video uploaded");
                } catch (err) {
                  const message = err instanceof Error ? err.message : "Upload failed";
                  setMsg(message);
                } finally {
                  e.target.value = "";
                }
              }}
            />
            <span className="text-xs text-gray-500">Max 60MB. MP4/WebM recommended. Upload sets the Video URL automatically.</span>
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-gray-600">Upload multiple 5-sec gifting videos</span>
            <input
              type="file"
              accept="video/mp4,video/webm"
              multiple
              className="rounded-lg border px-3 py-2"
              disabled={loading}
              onChange={async (e) => {
                await uploadMultipleVideoStories(e.target.files);
                e.target.value = "";
              }}
            />
            <span className="text-xs text-gray-500">
              Select multiple MP4/WebM files. Each file becomes one active dynamic homepage banner/story and plays for 5 seconds.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">CTA text (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="e.g. Shop now"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">CTA href (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={ctaHref}
              onChange={(e) => setCtaHref(e.target.value)}
              placeholder="/p/some-product"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Sort order</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="number"
              step="1"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Coupon code (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="BOHO40"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Start at (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">End at (optional)</span>
            <input
              className="rounded-lg border px-3 py-2"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 mt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-gray-700">Active</span>
          </label>
        </div>

        <div className="mt-4">
          <button className="rounded-lg bg-black text-white px-4 py-2 text-sm" onClick={submit}>
            {editingId ? "Update" : "Create"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 bg-gray-50 p-3 text-sm font-semibold">
          <div className="col-span-3">Title</div>
          <div className="col-span-2">Schedule</div>
          <div className="col-span-2">Links</div>
          <div>Sort</div>
          <div>Status</div>
          <div className="col-span-4">Actions</div>
        </div>

        {sorted.map((b) => (
          <div key={b.id} className="grid grid-cols-12 gap-2 p-3 text-sm border-t">
            <div className="col-span-3">
              <div className="font-semibold">{b.title}</div>
              {b.subtitle ? <div className="text-xs text-gray-600">{b.subtitle}</div> : null}
              <div className="text-xs text-gray-600">Updated: {new Date(b.updatedAt).toLocaleString()}</div>
            </div>
            <div className="col-span-2 text-xs text-gray-700">
              <div>Start: {b.startAt ? new Date(b.startAt).toLocaleString() : "-"}</div>
              <div>End: {b.endAt ? new Date(b.endAt).toLocaleString() : "-"}</div>
            </div>
            <div className="col-span-2 text-xs text-gray-700 break-all">
              <div>Img: {b.imageUrl}</div>
              {b.videoUrl ? <div>Video: {b.videoUrl}</div> : null}
              <div>CTA: {b.ctaText ?? "-"}</div>
              <div>Href: {b.ctaHref ?? "-"}</div>
              <div>Coupon: {b.couponCode ?? "-"}</div>
            </div>
            <div className="text-gray-700">{b.sortOrder}</div>
            <div className={b.isActive ? "font-semibold" : "text-gray-600"}>{b.isActive ? "ACTIVE" : "INACTIVE"}</div>
            <div className="col-span-4 flex gap-2">
              <button className="rounded-lg border px-3 py-1" onClick={() => startEdit(b)}>
                Edit
              </button>
              {b.isActive ? (
                <button className="rounded-lg border px-3 py-1" onClick={() => toggleActive(b.id, false)}>
                  Disable
                </button>
              ) : (
                <button className="rounded-lg bg-black text-white px-3 py-1" onClick={() => toggleActive(b.id, true)}>
                  Enable
                </button>
              )}
              <button className="rounded-lg border px-3 py-1" onClick={() => remove(b.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
