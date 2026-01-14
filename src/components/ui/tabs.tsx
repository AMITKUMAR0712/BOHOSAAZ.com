"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const ctx = React.useMemo(() => ({ value, setValue: onValueChange }), [value, onValueChange]);
  return <TabsContext.Provider value={ctx}>{children}</TabsContext.Provider>;
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("inline-flex rounded-[var(--radius)] border border-border bg-card p-1", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const active = ctx.value === value;
  return (
    <button
      type="button"
      className={cn(
        "px-3 py-2 text-sm rounded-[calc(var(--radius)-8px)] transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      aria-pressed={active}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== value) return null;
  return <div className={cn("mt-3", className)}>{children}</div>;
}
