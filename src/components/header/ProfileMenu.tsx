"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type ProfileMenuMe = {
  user: {
    role: "USER" | "VENDOR" | "ADMIN";
    email: string;
    vendor?: { status?: string | null } | null;
  };
};

export function ProfileMenu({
  langPrefix,
  me,
  onLogout,
}: {
  langPrefix: string;
  me: ProfileMenuMe;
  onLogout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // ✅ Close on outside click + escape key
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }

    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const role = me.user.role;
  const vendorStatus = me.user.vendor?.status || null;

  // ✅ Avatar initial
  const initial = useMemo(() => {
    const em = me.user.email || "U";
    return em[0]?.toUpperCase() ?? "U";
  }, [me.user.email]);

  const showVendor = role === "VENDOR" && vendorStatus === "APPROVED";
  const showAdmin = role === "ADMIN";

  return (
    <div className="relative" ref={rootRef}>
      {/* ✅ Profile Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="h-10 rounded-2xl px-3 flex items-center gap-2 bg-background/60 hover:bg-muted/40 transition shadow-sm"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="h-7 w-7 rounded-full bg-primary/12 text-primary grid place-items-center font-semibold text-xs">
          {initial}
        </span>

        <span className="max-w-[180px] truncate text-sm font-medium">
          {me.user.email}
        </span>

        <span
          className={`ml-1 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▼
        </span>
      </Button>

      {/* ✅ Dropdown */}
      <div
        className={`absolute right-0 top-full mt-2 w-[280px] origin-top-right transition-all duration-200 ${
          open
            ? "scale-100 opacity-100 translate-y-0 pointer-events-auto"
            : "scale-[0.98] opacity-0 -translate-y-1 pointer-events-none"
        }`}
      >
        <div className="rounded-2xl border border-border bg-background/90 backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.12)] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center font-heading text-lg">
                {initial}
              </div>

              <div className="min-w-0">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Signed in as
                </div>
                <div className="text-sm font-semibold truncate">
                  {me.user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Menu */}
          <nav className="p-2 grid gap-1">
            <MenuLink href={`${langPrefix}/account`} label="My Account" />
            <MenuLink href={`${langPrefix}/account/orders`} label="Orders" />
            <MenuLink
              href={`${langPrefix}/account/returns`}
              label="Returns / Refunds"
            />

            {showVendor && (
              <>
                <Divider />
                <MenuLink
                  href={`${langPrefix}/vendor`}
                  label="Vendor Panel"
                  highlight
                />
              </>
            )}

            {showAdmin && (
              <>
                <Divider />
                <MenuLink
                  href={`${langPrefix}/admin`}
                  label="Admin Panel"
                  highlight
                />
              </>
            )}

            <Divider />

            {/* Logout */}
            <button
              type="button"
              className="w-full text-left rounded-xl px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition flex items-center gap-2"
              onClick={async () => {
                setOpen(false);
                await onLogout();
              }}
            >
              <LogoutIcon />
              Logout
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

/* ✅ Reusable MenuLink */
function MenuLink({
  href,
  label,
  highlight,
}: {
  href: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-3 py-2 text-sm transition flex items-center gap-2 ${
        highlight
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "hover:bg-muted/50"
      }`}
    >
      <DotIcon />
      {label}
    </Link>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-border" />;
}

/* ✅ Icons */
function DotIcon() {
  return (
    <span className="h-2 w-2 rounded-full bg-primary inline-block opacity-80" />
  );
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M10 17l5-5-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 12H3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M21 3v18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
