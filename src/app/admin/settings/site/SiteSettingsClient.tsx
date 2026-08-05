"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const HOME_THEME_KEY = "homeTheme";

type HomeThemeId =
  | "studio"
  | "market"
  | "commerce"
  | "noir"
  | "atlas"
  | "heritage"
  | "mono";

const HOME_THEMES: Array<{ id: HomeThemeId; name: string; description: string }> = [
  { id: "studio", name: "Studio", description: "Clean editorial look with crisp borders and subtle depth." },
  { id: "market", name: "Market", description: "Promo-first look with stronger highlights for deals and trends." },
  { id: "commerce", name: "Commerce", description: "Retail catalog vibe: tighter grid, boxed cards, and a clear shopping-first layout." },
  { id: "noir", name: "Noir", description: "Deep, high-contrast feel with bolder surfaces and textures." },
  { id: "atlas", name: "Atlas", description: "Sharper grid layout, tighter type, and a modern product-catalog feel." },
  { id: "heritage", name: "Heritage", description: "Ornate luxury vibe: more spacing, softer accents, and elevated surfaces." },
  { id: "mono", name: "Mono", description: "Utility-forward look with more numeric/compact typography and crisp UI." },
];

type SiteSettingsClientProps = {
  initialHomeTheme: HomeThemeId;
  initialCategorySectionImages?: string[];
};

const CATEGORY_SECTION_IMAGES_KEY = "categorySectionImages";

export default function SiteSettingsClient({
  initialHomeTheme,
  initialCategorySectionImages = [],
}: SiteSettingsClientProps) {
  const [homeTheme, setHomeTheme] = React.useState<HomeThemeId>(initialHomeTheme);
  const [saving, setSaving] = React.useState(false);
  const [categorySectionImages, setCategorySectionImages] = React.useState<string[]>([
    initialCategorySectionImages[0] ?? "",
    initialCategorySectionImages[1] ?? "",
    initialCategorySectionImages[2] ?? "",
  ]);
  const [savingImages, setSavingImages] = React.useState(false);
  const [uploadingIndex, setUploadingIndex] = React.useState<number | null>(null);

  async function saveHomeTheme(next: HomeThemeId) {
    setHomeTheme(next);
    setSaving(true);

    const res = await fetch(`/api/admin/settings/${encodeURIComponent(HOME_THEME_KEY)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: next }),
    });

    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to save homepage theme");
      return;
    }

    toast.success("Homepage theme saved");
  }

  async function uploadToServer(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "banner");

    const res = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok || typeof data.url !== "string") {
      throw new Error(data?.error || "Upload failed");
    }
    return data.url;
  }

  async function saveCategorySectionImages() {
    setSavingImages(true);

    const res = await fetch(`/api/admin/settings/${encodeURIComponent(CATEGORY_SECTION_IMAGES_KEY)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: categorySectionImages }),
    });

    const data = await res.json().catch(() => null);
    setSavingImages(false);

    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to save category section images");
      return;
    }

    toast.success("Category section images saved");
  }

  function updateCategoryImage(index: number, url: string) {
    setCategorySectionImages((current) => {
      const next = [...current];
      next[index] = url;
      return next;
    });
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Site Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure homepage appearance and global UX.</p>
      </div>

      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Homepage theme</CardTitle>
          <CardDescription>
            Select a theme for the customer homepage.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-4">
          {HOME_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={saving}
              onClick={() => saveHomeTheme(t.id)}
              className={cn(
                "rounded-(--radius) border border-border p-4 text-left transition",
                "hover:bg-muted/40",
                t.id === homeTheme ? "bg-muted/60" : "bg-card",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>
                </div>
                {t.id === homeTheme ? (
                  <span className="shrink-0 text-xs font-medium text-primary">Active</span>
                ) : null}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Category page section images</CardTitle>
          <CardDescription>
            Upload up to three images for the category listing hero section. Leave a slot blank to use the default art.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {categorySectionImages.map((imageUrl, index) => (
            <div key={index} className="grid gap-2 rounded-[18px] border border-border/70 bg-background/70 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Image {index + 1}</div>
                  <div className="text-xs text-muted-foreground">Used in the category page hero section.</div>
                </div>
                <span className="rounded-full border border-border bg-muted/20 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Slot {index + 1}
                </span>
              </div>
              <input
                value={imageUrl}
                onChange={(event) => updateCategoryImage(index, event.target.value)}
                placeholder="Image URL"
                className="h-12 w-full rounded-2xl border border-border/15 bg-background/80 px-3 text-sm shadow-(--shadowInputInset) outline-none transition focus:border-primary/35 focus:ring-4 focus:ring-primary/10"
              />
              <label className="grid gap-2 text-sm text-muted-foreground">
                Upload from device
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingIndex !== null}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setUploadingIndex(index);
                    try {
                      const url = await uploadToServer(file);
                      updateCategoryImage(index, url);
                      toast.success("Image uploaded");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Upload failed");
                    } finally {
                      setUploadingIndex(null);
                    }
                  }}
                  className="block w-full text-sm"
                />
              </label>
            </div>
          ))}

          <div className="grid gap-3 md:grid-cols-3">
            {categorySectionImages.map((imageUrl, index) => (
              <div key={index} className="overflow-hidden rounded-[22px] border border-border/70 bg-card/60">
                {imageUrl ? (
                  <img src={imageUrl} alt={`Category hero preview ${index + 1}`} className="h-28 w-full object-cover" />
                ) : (
                  <div className="flex h-28 items-center justify-center text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Default image {index + 1}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={saveCategorySectionImages}
              disabled={savingImages}
              variant="primary"
            >
              Save images
            </Button>
            <div className="text-sm text-muted-foreground">
              Your uploaded images will appear in the category page hero section.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={saving} onClick={() => saveHomeTheme("studio")}>
          Reset to Studio
        </Button>
        <div className="text-xs text-muted-foreground">
          Changes apply immediately on the homepage.
        </div>
      </div>
    </div>
  );
}
