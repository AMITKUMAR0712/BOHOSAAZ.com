"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export function Dropdown({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo(() => ({ open, setOpen }), [open]);

  return <DropdownContext.Provider value={value}>{children}</DropdownContext.Provider>;
}

export function DropdownTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownTrigger must be used within Dropdown");

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-(--radius) border border-border bg-card px-3 py-2 text-sm hover:bg-muted/40 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-haspopup="menu"
      aria-expanded={ctx.open}
      onClick={() => ctx.setOpen(!ctx.open)}
    >
      {children}
    </button>
  );
}

export function DropdownContent({
  className,
  align = "end",
  children,
}: {
  className?: string;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DropdownContext);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  if (!ctx) throw new Error("DropdownContent must be used within Dropdown");

  const { open, setOpen } = ctx;

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("mousedown", onDocClick);
        document.removeEventListener("keydown", onKeyDown);
      };
    }
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "absolute top-full mt-2 min-w-56 rounded-(--radius) border border-border bg-card shadow-premium p-2 z-50",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
      role="menu"
    >
      {children}
    </div>
  );
}

export function DropdownItem({
  className,
  children,
  onSelect,
}: {
  className?: string;
  children: React.ReactNode;
  onSelect?: () => void;
}) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownItem must be used within Dropdown");

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left rounded-[calc(var(--radius)-6px)] px-3 py-2 text-sm hover:bg-muted/50 transition-colors",
        className,
      )}
      role="menuitem"
      onClick={() => {
        onSelect?.();
        ctx.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-2 h-px bg-border" />;
}
