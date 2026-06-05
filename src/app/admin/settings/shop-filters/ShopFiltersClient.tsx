"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_SHOP_FILTER_CONFIG,
  normalizeShopFilterConfig,
  SHOP_FILTERS_SETTING_KEY,
  type ShopFilterConfig,
  type ShopFilterFieldConfig,
  type ShopFilterOption,
} from "@/lib/shopFilters";

const sourceLabels: Record<ShopFilterFieldConfig["source"], string> = {
  manual: "Admin options",
  categories: "Categories",
  "tag:occasion": "Occasion tags",
  "tag:recipient": "Recipient tags",
  "tag:availability": "Availability tags + admin options",
  "product:colors": "Product colors",
  "product:sizes": "Product sizes",
};

function optionsToText(options?: ShopFilterOption[]) {
  return (options ?? []).map((option) => `${option.value}|${option.label}`).join("\n");
}

function textToOptions(text: string) {
  return text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...labelParts] = line.split("|");
      const cleanValue = (value ?? "").trim();
      const cleanLabel = labelParts.join("|").trim() || cleanValue;
      return cleanValue ? { value: cleanValue, label: cleanLabel } : null;
    })
    .filter((option): option is ShopFilterOption => Boolean(option));
}

export default function ShopFiltersClient({ initialConfig }: { initialConfig: ShopFilterConfig }) {
  const [config, setConfig] = React.useState(() => normalizeShopFilterConfig(initialConfig));
  const [saving, setSaving] = React.useState(false);

  const enabledCount = config.fields.filter((field) => field.enabled).length;

  function updateField(key: ShopFilterFieldConfig["key"], patch: Partial<ShopFilterFieldConfig>) {
    setConfig((current) =>
      normalizeShopFilterConfig({
        fields: current.fields.map((field) =>
          field.key === key ? { ...field, ...patch } : field
        ),
      })
    );
  }

  async function save(nextConfig = config) {
    setSaving(true);
    const normalized = normalizeShopFilterConfig(nextConfig);
    const res = await fetch(`/api/admin/settings/${encodeURIComponent(SHOP_FILTERS_SETTING_KEY)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: normalized }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to save shop filters");
      return;
    }

    setConfig(normalized);
    toast.success("Shop filters saved");
  }

  function resetDefaults() {
    const next = normalizeShopFilterConfig(DEFAULT_SHOP_FILTER_CONFIG);
    setConfig(next);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shop Filters</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control every visible filter field on the customer shop page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled={saving} onClick={resetDefaults}>
            Reset defaults
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving..." : "Save filters"}
          </Button>
        </div>
      </div>

      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Filter configuration</CardTitle>
          <CardDescription>
            {enabledCount} fields enabled. Drag-and-drop is not required; lower order numbers appear first.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {config.fields.map((field) => (
            <div
              key={field.key}
              className="grid gap-4 rounded-[24px] border border-border bg-background/55 p-4 lg:grid-cols-[minmax(0,1fr)_180px]"
            >
              <div className="grid gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{field.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      `{field.key}` · {sourceLabels[field.source]} · {field.type}
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.enabled}
                      onChange={(event) => updateField(field.key, { enabled: event.target.checked })}
                    />
                    Enabled
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Label</span>
                    <Input
                      value={field.label}
                      onChange={(event) => updateField(field.key, { label: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Placeholder</span>
                    <Input
                      value={field.placeholder}
                      onChange={(event) => updateField(field.key, { placeholder: event.target.value })}
                    />
                  </label>
                </div>

                {field.options ? (
                  <label className="grid gap-1">
                    <span className="text-xs text-muted-foreground">
                      Options, one per line as value|label
                    </span>
                    <textarea
                      className="min-h-28 rounded-(--radius) border border-border bg-card px-3 py-2 font-mono text-xs text-foreground"
                      value={optionsToText(field.options)}
                      onChange={(event) => updateField(field.key, { options: textToOptions(event.target.value) })}
                    />
                  </label>
                ) : null}
              </div>

              <div className="grid content-start gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Section</span>
                  <select
                    className="h-10 rounded-(--radius) border border-border bg-card px-3 text-sm"
                    value={field.section}
                    onChange={(event) =>
                      updateField(field.key, { section: event.target.value === "refine" ? "refine" : "intent" })
                    }
                  >
                    <option value="intent">Step 1</option>
                    <option value="refine">Step 2</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Order</span>
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    value={field.order}
                    onChange={(event) => updateField(field.key, { order: Number(event.target.value) })}
                  />
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-border bg-muted/25 p-4 text-sm text-muted-foreground">
        Product-backed fields like categories, colors, sizes and tags still read live product data. This page controls whether they appear, their labels, section and order.
      </div>
    </div>
  );
}
