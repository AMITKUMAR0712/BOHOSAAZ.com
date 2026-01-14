"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

export function MegaMenu({
  langPrefix,
}: {
  langPrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const openT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusFirstOnOpen = useRef(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  function clearTimers() {
    if (openT.current) {
      clearTimeout(openT.current);
      openT.current = null;
    }
    if (closeT.current) {
      clearTimeout(closeT.current);
      closeT.current = null;
    }
  }

  function scheduleOpen() {
    if (open) return;
    clearTimers();
    openT.current = setTimeout(() => setOpen(true), 200);
  }

  function scheduleClose() {
    clearTimers();
    closeT.current = setTimeout(() => setOpen(false), 450);
  }

  useEffect(() => {
    if (!open) return;
    if (!focusFirstOnOpen.current) return;
    focusFirstOnOpen.current = false;
    const t = setTimeout(() => {
      const first = menuRef.current?.querySelector<HTMLAnchorElement>(
        'a[data-megamenu-first="1"]'
      );
      first?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  const links: Array<{ label: string; href: string }> = [
    { label: "Saree", href: `${langPrefix}?q=saree` },
    { label: "Shawl / Stole", href: `${langPrefix}?q=shawl` },
    { label: "Wall Art", href: `${langPrefix}?q=wall%20art` },
    { label: "Indian Handicrafts", href: `${langPrefix}?q=handicrafts` },
    { label: "Latest Products", href: `${langPrefix}?sort=latest` },
    { label: "Special Offer", href: `${langPrefix}?sort=offer` },
  ];

  return (
    <div
      className="relative"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocusCapture={() => {
        clearTimers();
        setOpen(true);
      }}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && e.currentTarget.contains(next)) return;
        scheduleClose();
      }}
    >
      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-foreground transition"
        aria-haspopup="menu"
        aria-expanded={open}
        ref={triggerRef}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            clearTimers();
            setOpen(false);
          }
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            clearTimers();
            focusFirstOnOpen.current = true;
            setOpen(true);
          }
        }}
      >
        Shop by Category
      </button>

      {open ? (
        <div className="absolute left-0 top-full pt-3">
          <div
            ref={menuRef}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                clearTimers();
                setOpen(false);
                triggerRef.current?.focus();
              }
            }}
          >
            <Card className="w-130 p-4 shadow-premium" role="menu" aria-label="Shop by Category">
              <div className="grid grid-cols-2 gap-2">
                {links.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="rounded-(--radius) border border-border bg-muted/30 px-3 py-3 text-sm hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    role="menuitem"
                    data-megamenu-first={l === links[0] ? "1" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <div className="font-semibold">{l.label}</div>
                    <div className="text-xs text-muted-foreground">Browse</div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
