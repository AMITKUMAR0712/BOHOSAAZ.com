"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgePercent, LayoutDashboard, Megaphone, Package, Settings, Store, Tags, Users } from "lucide-react";
import { DashboardCards } from "@/components/dashboard/DashboardCards";

const SETTING_KEY = "adminLandingTheme";

type ThemeId = "default" | "cards" | "split" | "compact";

const THEMES: Array<{ id: ThemeId; name: string; description: string }> = [
  { id: "default", name: "Default", description: "Matches the current dashboard style." },
  { id: "cards", name: "Cards", description: "Quick actions in a clean card grid." },
  { id: "split", name: "Split", description: "Actions + links in a split layout." },
  { id: "compact", name: "Compact", description: "Dense, fast navigation." },
];

const ACTIONS = [
  { href: "/admin/vendors", label: "Vendor Requests", icon: Store },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/orders", label: "Orders", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: BadgePercent },
  { href: "/admin/ads", label: "Ads", icon: Megaphone },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function withBase(basePath: string, href: string) {
  const bp = (basePath || "").trim();
  if (!bp) return href;
  return `${bp}${href}`;
}

function ThemePicker({ value, onChange, saving }: { value: ThemeId; onChange: (t: ThemeId) => void; saving: boolean }) {
  return (
    <Card className="bg-card/70 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base">Landing theme</CardTitle>
        <CardDescription>Admins can switch this anytime.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={saving}
            onClick={() => onChange(t.id)}
            className={cn(
              "w-full text-left rounded-(--radius) border border-border px-4 py-3 transition",
              "hover:bg-muted/40",
              t.id === value ? "bg-muted/60" : "bg-card",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{t.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground truncate">{t.description}</div>
              </div>
              {t.id === value ? (
                <span className="shrink-0 text-xs font-medium text-primary">Selected</span>
              ) : null}
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function ActionGrid({ variant, basePath }: { variant: ThemeId; basePath: string }) {
  const actions = React.useMemo(
    () => ACTIONS.map((a) => ({ ...a, href: withBase(basePath, a.href) })),
    [basePath],
  );

  if (variant === "default") {
    // Keep existing dashboard metrics as default.
    return <DashboardCards role="admin" basePath={basePath} />;
  }

  if (variant === "compact") {
    return (
      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl">Admin Dashboard</CardTitle>
          <CardDescription>Quick navigation</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <DashboardCards role="admin" basePath={basePath} />

          <div className="grid gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center justify-between gap-3 rounded-(--radius) border border-border bg-card px-4 py-3 hover:bg-muted/40 transition"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-medium text-foreground truncate">{a.label}</span>
                </span>
                <span className="text-xs text-muted-foreground">Open</span>
              </Link>
            );
          })}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "split") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Admin Dashboard</CardTitle>
            <CardDescription>Common actions</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <DashboardCards role="admin" basePath={basePath} />

            <div className="grid gap-3 sm:grid-cols-2">
            {actions.slice(0, 6).map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group rounded-(--radius) border border-border bg-card px-4 py-4 hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                    <div className="text-sm font-semibold text-foreground">{a.label}</div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Open {a.label.toLowerCase()}</div>
                </Link>
              );
            })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">More</CardTitle>
            <CardDescription>Less frequent sections</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {actions.slice(6).map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-2 rounded-(--radius) border border-border bg-card px-4 py-3 hover:bg-muted/40 transition"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm text-foreground">{a.label}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  // cards
  return (
    <Card className="bg-card/70 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl">Admin Dashboard</CardTitle>
        <CardDescription>Quick actions</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <DashboardCards role="admin" basePath={basePath} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group rounded-(--radius) border border-border bg-card px-4 py-4 hover:bg-muted/40 transition"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <div className="text-sm font-semibold text-foreground">{a.label}</div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Open</div>
            </Link>
          );
        })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminLandingClient({
  initialTheme,
  basePath,
}: {
  initialTheme?: string | null;
  basePath: string;
}) {
  const [theme, setTheme] = React.useState<ThemeId>("default");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const t = (initialTheme || "default") as ThemeId;
    if (THEMES.some((x) => x.id === t)) setTheme(t);
  }, [initialTheme]);

  async function save(nextTheme: ThemeId) {
    setTheme(nextTheme);
    setSaving(true);

    const res = await fetch(`/api/admin/settings/${encodeURIComponent(SETTING_KEY)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: nextTheme }),
    });

    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to save theme");
      return;
    }

    toast.success("Theme saved");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <ActionGrid variant={theme} basePath={basePath} />

        <div className="mt-4 flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => save("default")}
          >
            Reset to default
            </Button>
        </div>
      </div>

      <div id="admin-theme">
        <ThemePicker value={theme} saving={saving} onChange={save} />
      </div>
    </div>
  );
}
