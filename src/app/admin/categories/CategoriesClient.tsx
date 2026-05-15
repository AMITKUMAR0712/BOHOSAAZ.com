"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { toast } from "@/lib/toast";
import * as LucideIcons from "lucide-react";

type Category = { id: string; name: string; slug: string; iconName?: string | null; iconUrl?: string | null };

function CategoryIcon({ iconName, iconUrl }: { iconName?: string | null; iconUrl?: string | null }) {
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        className="h-5 w-5 rounded bg-muted object-contain"
        loading="lazy"
      />
    );
  }

  if (!iconName) return <span className="h-5 w-5 rounded bg-muted" aria-hidden />;

  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  if (!Icon) return <span className="h-5 w-5 rounded bg-muted" aria-hidden />;
  return <Icon className="h-5 w-5 text-muted-foreground" />;
}

export default function CategoriesClient({
  initialItems,
}: {
  initialItems: Category[];
}) {
  const [items, setItems] = useState<Category[]>(initialItems);
  const [name, setName] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((c) => c.id === selectedId) || null;
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editIconName, setEditIconName] = useState("");
  const [editIconUrl, setEditIconUrl] = useState("");

  function selectCategory(c: Category) {
    setSelectedId(c.id);
    setEditName(c.name ?? "");
    setEditSlug(c.slug ?? "");
    setEditIconName(c.iconName ?? "");
    setEditIconUrl(c.iconUrl ?? "");
  }

  async function reload() {
    const res = await fetch("/api/admin/categories", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Failed to load categories");
      return;
    }
    setItems(data.data?.categories || []);
  }

  async function create() {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Create failed");
      return;
    }
    setName("");
    toast.success("Category created");
    reload();
  }

  async function saveSelected() {
    if (!selected) return;

    const res = await fetch(`/api/admin/categories/${encodeURIComponent(selected.id)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          slug: editSlug,
          iconName: editIconName,
          iconUrl: editIconUrl,
        }),
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.error || "Update failed");
      return;
    }
    toast.success("Category updated");
    await reload();
  }

  return (
    <div className="p-6 md:p-10">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Create and manage storefront categories.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
            />
            <Button onClick={create} disabled={name.trim().length < 2} variant="primary">
              Add
            </Button>
            <Button onClick={reload} variant="outline">
              Refresh
            </Button>
          </div>

          {selected ? (
            <div className="mt-5 grid gap-2 rounded-(--radius) border border-border bg-muted/20 p-3">
              <div className="text-sm font-semibold">Edit</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder="Slug" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={editIconName}
                  onChange={(e) => setEditIconName(e.target.value)}
                  placeholder="Lucide iconName (e.g. Gift)"
                />
                <Input
                  value={editIconUrl}
                  onChange={(e) => setEditIconUrl(e.target.value)}
                  placeholder="Icon URL (optional)"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={saveSelected} variant="primary" disabled={editName.trim().length < 2}>
                  Save
                </Button>
                <Button onClick={() => setSelectedId(null)} variant="outline">
                  Cancel
                </Button>
                <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                  <CategoryIcon iconName={editIconName} iconUrl={editIconUrl} />
                  <span>Preview</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Icon</TH>
                  <TH>Name</TH>
                  <TH>Slug</TH>
                  <TH>ID</TH>
                </TR>
              </THead>
              <tbody>
                {items.map((c) => (
                  <TR
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => selectCategory(c)}
                  >
                    <TD>
                      <CategoryIcon iconName={c.iconName} iconUrl={c.iconUrl} />
                    </TD>
                    <TD className="font-semibold">{c.name}</TD>
                    <TD>{c.slug}</TD>
                    <TD className="text-xs text-muted-foreground">{c.id}</TD>
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
