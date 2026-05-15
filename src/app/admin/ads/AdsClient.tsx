"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { toast } from "@/lib/toast";

type AdPlacement =
  | "HOME_TOP"
  | "HOME_BETWEEN_SECTIONS"
  | "HOME_SIDEBAR"
  | "CATEGORY_TOP"
  | "PRODUCT_DETAIL_RIGHT"
  | "FOOTER_STRIP"
  | "SEARCH_TOP";

type AdType = "IMAGE_BANNER" | "HTML_SNIPPET" | "VIDEO" | "PRODUCT_SPOTLIGHT" | "BRAND_SPOTLIGHT";

type AdTargetDevice = "ALL" | "MOBILE" | "DESKTOP";

type Ad = {
  id: string;
  title: string;
  placement: AdPlacement;
  type: AdType;
  imageUrl: string | null;
  linkUrl: string | null;
  html: string | null;
  startsAt: string | Date | null;
  endsAt: string | Date | null;
  isActive: boolean;
  priority: number;
  targetDevice: AdTargetDevice;
  impressions: number;
  clicks: number;
  updatedAt: string | Date;
};

function toDateTimeLocalValue(value: unknown) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoOrNull(datetimeLocal: string) {
  const s = String(datetimeLocal || "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function AdsClient({ initialAds }: { initialAds: Ad[] }) {
  const [ads, setAds] = useState<Ad[]>(initialAds);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => ads.find((a) => a.id === selectedId) || null, [ads, selectedId]);

  const placements: AdPlacement[] = [
    "HOME_TOP",
    "HOME_BETWEEN_SECTIONS",
    "HOME_SIDEBAR",
    "CATEGORY_TOP",
    "PRODUCT_DETAIL_RIGHT",
    "FOOTER_STRIP",
    "SEARCH_TOP",
  ];

  const types: AdType[] = ["IMAGE_BANNER", "HTML_SNIPPET", "VIDEO", "PRODUCT_SPOTLIGHT", "BRAND_SPOTLIGHT"];

  const devices: AdTargetDevice[] = ["ALL", "MOBILE", "DESKTOP"];

  const [newTitle, setNewTitle] = useState("");
  const [newPlacement, setNewPlacement] = useState<AdPlacement>("HOME_TOP");
  const [newType, setNewType] = useState<AdType>("IMAGE_BANNER");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newHtml, setNewHtml] = useState("");
  const [newStartsAt, setNewStartsAt] = useState("");
  const [newEndsAt, setNewEndsAt] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [newPriority, setNewPriority] = useState("0");
  const [newTargetDevice, setNewTargetDevice] = useState<AdTargetDevice>("ALL");

  const [editTitle, setEditTitle] = useState("");
  const [editPlacement, setEditPlacement] = useState<AdPlacement>("HOME_TOP");
  const [editType, setEditType] = useState<AdType>("IMAGE_BANNER");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [editHtml, setEditHtml] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPriority, setEditPriority] = useState("0");
  const [editTargetDevice, setEditTargetDevice] = useState<AdTargetDevice>("ALL");

  function loadEdit(a: Ad) {
    setSelectedId(a.id);
    setEditTitle(a.title ?? "");
    setEditPlacement(a.placement);
    setEditType(a.type);
    setEditImageUrl(a.imageUrl ?? "");
    setEditLinkUrl(a.linkUrl ?? "");
    setEditHtml(a.html ?? "");
    setEditStartsAt(toDateTimeLocalValue(a.startsAt));
    setEditEndsAt(toDateTimeLocalValue(a.endsAt));
    setEditIsActive(Boolean(a.isActive));
    setEditPriority(String(a.priority ?? 0));
    setEditTargetDevice(a.targetDevice ?? "ALL");
  }

  async function reload() {
    const res = await fetch("/api/admin/ads", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to load ads");
      return;
    }
    setAds(data.data?.ads || []);
  }

  async function createAd() {
    const res = await fetch("/api/admin/ads", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        placement: newPlacement,
        type: newType,
        imageUrl: newImageUrl.trim() ? newImageUrl.trim() : null,
        linkUrl: newLinkUrl.trim() ? newLinkUrl.trim() : null,
        html: newHtml.trim() ? newHtml : null,
        startsAt: toIsoOrNull(newStartsAt),
        endsAt: toIsoOrNull(newEndsAt),
        isActive: newIsActive,
        priority: Number(newPriority || 0),
        targetDevice: newTargetDevice,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Create failed");
      return;
    }

    toast.success("Ad created");
    setNewTitle("");
    setNewImageUrl("");
    setNewLinkUrl("");
    setNewHtml("");
    setNewStartsAt("");
    setNewEndsAt("");
    setNewIsActive(true);
    setNewPriority("0");
    setNewTargetDevice("ALL");
    await reload();
  }

  async function saveSelected() {
    if (!selected) return;

    const res = await fetch(`/api/admin/ads/${encodeURIComponent(selected.id)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          placement: editPlacement,
          type: editType,
          imageUrl: editImageUrl.trim() ? editImageUrl.trim() : null,
          linkUrl: editLinkUrl.trim() ? editLinkUrl.trim() : null,
          html: editHtml.trim() ? editHtml : null,
          startsAt: toIsoOrNull(editStartsAt),
          endsAt: toIsoOrNull(editEndsAt),
          isActive: editIsActive,
          priority: Number(editPriority || 0),
          targetDevice: editTargetDevice,
        }),
      }
    );

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Update failed");
      return;
    }

    toast.success("Ad updated");
    await reload();
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!confirm("Delete this ad?")) return;

    const res = await fetch(`/api/admin/ads/${encodeURIComponent(selected.id)}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Delete failed");
      return;
    }

    toast.success("Ad deleted");
    setSelectedId(null);
    await reload();
  }

  return (
    <div className="p-6 md:p-10">
      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>Ads</CardTitle>
          <CardDescription>Create and manage storefront advertisements.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 rounded-(--radius) border border-border bg-muted/20 p-4">
            <div className="text-sm font-semibold">Create</div>

            <div className="grid gap-2 md:grid-cols-2">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newPlacement}
                  onChange={(e) => setNewPlacement(e.target.value as AdPlacement)}
                  className="h-10 rounded-(--radius) border border-border bg-background px-3 text-sm"
                >
                  {placements.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AdType)}
                  className="h-10 rounded-(--radius) border border-border bg-background px-3 text-sm"
                >
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Image URL (optional)" />
              <Input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="Link URL (optional)" />
            </div>

            <textarea
              value={newHtml}
              onChange={(e) => setNewHtml(e.target.value)}
              placeholder="HTML snippet (optional)"
              className="min-h-24 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm"
            />

            <div className="grid gap-2 md:grid-cols-3">
              <input
                type="datetime-local"
                value={newStartsAt}
                onChange={(e) => setNewStartsAt(e.target.value)}
                className="h-10 rounded-(--radius) border border-border bg-background px-3 text-sm"
              />
              <input
                type="datetime-local"
                value={newEndsAt}
                onChange={(e) => setNewEndsAt(e.target.value)}
                className="h-10 rounded-(--radius) border border-border bg-background px-3 text-sm"
              />
              <select
                value={newTargetDevice}
                onChange={(e) => setNewTargetDevice(e.target.value as AdTargetDevice)}
                className="h-10 rounded-(--radius) border border-border bg-background px-3 text-sm"
              >
                {devices.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={newIsActive} onChange={(e) => setNewIsActive(e.target.checked)} />
                <span>Active</span>
              </label>

              <Input
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                inputMode="numeric"
                placeholder="Priority"
                className="w-40"
              />

              <div className="ml-auto flex items-center gap-2">
                <Button onClick={reload} variant="outline">
                  Refresh
                </Button>
                <Button onClick={createAd} variant="primary" disabled={newTitle.trim().length < 2}>
                  Create
                </Button>
              </div>
            </div>
          </div>

          {selected ? (
            <div className="mt-5 grid gap-3 rounded-(--radius) border border-border bg-muted/20 p-4">
              <div className="text-sm font-semibold">Edit</div>

              <div className="grid gap-2 md:grid-cols-2">
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editPlacement}
                    onChange={(e) => setEditPlacement(e.target.value as AdPlacement)}
                    className="h-10 rounded-(--radius) border border-border bg-background px-3 text-sm"
                  >
                    {placements.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as AdType)}
                    className="h-10 rounded-(--radius) border border-border bg-background px-3 text-sm"
                  >
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <Input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} placeholder="Image URL" />
                <Input value={editLinkUrl} onChange={(e) => setEditLinkUrl(e.target.value)} placeholder="Link URL" />
              </div>

              <textarea
                value={editHtml}
                onChange={(e) => setEditHtml(e.target.value)}
                placeholder="HTML snippet"
                className="min-h-24 w-full rounded-(--radius) border border-border bg-background px-3 py-2 text-sm"
              />

              <div className="grid gap-2 md:grid-cols-3">
                <input
                  type="datetime-local"
                  value={editStartsAt}
                  onChange={(e) => setEditStartsAt(e.target.value)}
                  className="h-10 rounded-(--radius) border border-border bg-background px-3 text-sm"
                />
                <input
                  type="datetime-local"
                  value={editEndsAt}
                  onChange={(e) => setEditEndsAt(e.target.value)}
                  className="h-10 rounded-(--radius) border border-border bg-background px-3 text-sm"
                />
                <select
                  value={editTargetDevice}
                  onChange={(e) => setEditTargetDevice(e.target.value as AdTargetDevice)}
                  className="h-10 rounded-(--radius) border border-border bg-background px-3 text-sm"
                >
                  {devices.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
                  <span>Active</span>
                </label>

                <Input
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  inputMode="numeric"
                  placeholder="Priority"
                  className="w-40"
                />

                <div className="ml-auto flex items-center gap-2">
                  <Button onClick={() => setSelectedId(null)} variant="outline">
                    Close
                  </Button>
                  <Button onClick={deleteSelected} variant="outline">
                    Delete
                  </Button>
                  <Button onClick={saveSelected} variant="primary" disabled={editTitle.trim().length < 2}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Title</TH>
                  <TH>Placement</TH>
                  <TH>Type</TH>
                  <TH>Device</TH>
                  <TH>Active</TH>
                  <TH>Priority</TH>
                  <TH>Impr.</TH>
                  <TH>Clicks</TH>
                </TR>
              </THead>
              <tbody>
                {ads.map((a) => (
                  <TR
                    key={a.id}
                    className="cursor-pointer"
                    onClick={() => loadEdit(a)}
                  >
                    <TD className="font-semibold">{a.title}</TD>
                    <TD className="text-xs text-muted-foreground">{a.placement}</TD>
                    <TD className="text-xs text-muted-foreground">{a.type}</TD>
                    <TD className="text-xs text-muted-foreground">{a.targetDevice}</TD>
                    <TD className="text-xs text-muted-foreground">{a.isActive ? "Yes" : "No"}</TD>
                    <TD className="text-xs text-muted-foreground">{a.priority}</TD>
                    <TD className="text-xs text-muted-foreground">{a.impressions}</TD>
                    <TD className="text-xs text-muted-foreground">{a.clicks}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
