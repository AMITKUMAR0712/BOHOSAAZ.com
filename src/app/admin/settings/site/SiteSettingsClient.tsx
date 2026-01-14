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

export default function SiteSettingsClient({ initialHomeTheme }: { initialHomeTheme: HomeThemeId }) {
  const [homeTheme, setHomeTheme] = React.useState<HomeThemeId>(initialHomeTheme);
  const [saving, setSaving] = React.useState(false);

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
