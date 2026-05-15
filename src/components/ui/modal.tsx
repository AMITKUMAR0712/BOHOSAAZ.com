"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export function Modal({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [open, onOpenChange]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-foreground/20"
        onMouseDown={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "w-full max-w-lg rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-premium",
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {(title || footer) && (
            <div className="flex items-center justify-between gap-4 border-b border-border p-4">
              <div className="min-w-0">
                {title ? <div className="text-sm font-semibold truncate">{title}</div> : null}
              </div>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}

          <div className="p-4">{children}</div>

          {footer ? <div className="border-t border-border p-4">{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
