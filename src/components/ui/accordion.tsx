"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function Accordion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("divide-y divide-border rounded-[var(--radius)] border border-border bg-card", className)}>{children}</div>;
}

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const contentId = React.useId();

  return (
    <div>
      <button
        type="button"
        className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-heading text-sm tracking-wide">{title}</span>
        <span className={cn("text-sm text-muted-foreground transition-transform", open ? "rotate-45" : "rotate-0")} aria-hidden>
          +
        </span>
      </button>
      {open ? (
        <div id={contentId} className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      ) : null}
    </div>
  );
}
