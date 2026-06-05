"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export function Drawer({
  open,
  onOpenChange,
  side = "left",
  title,
  mobileTopOffset = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  title?: string;
  mobileTopOffset?: boolean;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }, [open, onOpenChange]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]" onMouseDown={() => onOpenChange(false)} />
      <div
        className={cn(
          "absolute w-[min(94vw,28rem)] max-w-full overflow-y-auto bg-card/95 border-border shadow-premium backdrop-blur-2xl",
          mobileTopOffset
            ? "top-[4.75rem] h-[calc(100dvh-4.75rem)] md:top-0 md:h-full"
            : "top-0 h-full",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
        )}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title ? (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-4 backdrop-blur">
            <div className="font-heading text-lg">{title}</div>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-2xl bg-background/80 text-lg font-semibold text-foreground shadow-sm transition hover:bg-muted/50"
              onClick={() => onOpenChange(false)}
              aria-label="Close menu"
            >
              x
            </button>
          </div>
        ) : null}
        <div className="p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
