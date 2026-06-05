"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarToggleButton } from "@/components/sidebar/Sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type PanelRole = "USER" | "VENDOR" | "ADMIN";

function roleLabel(role: PanelRole) {
  if (role === "ADMIN") return "Admin";
  if (role === "VENDOR") return "Vendor";
  return "User";
}

export function PanelTopbar({
  title,
  userName,
  role,
  actions,
  className,
}: {
  title: string;
  userName: string;
  role: PanelRole;
  actions?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = React.useState(false);

  async function onLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      router.push("/login");
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <div className={cn("sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-xl", className)}>
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 md:px-6 md:py-3">
        <div className="md:hidden">
          <SidebarToggleButton />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-heading text-lg md:text-xl tracking-tight truncate">{title}</div>
          <div className="mt-1 hidden md:block text-xs text-muted-foreground truncate">{pathname}</div>
        </div>

        {actions ? <div className="order-3 flex w-full items-center gap-2 overflow-x-auto pb-1 sm:order-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">{actions}</div> : null}

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/80 px-2.5 py-2 text-sm sm:rounded-3xl sm:px-3">
          <span className="inline-flex items-center rounded-full bg-accent/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
            {roleLabel(role)}
          </span>
          <span className="min-w-0 truncate text-sm font-medium text-foreground">{userName}</span>
          <Button size="sm" variant="outline" onClick={onLogout} disabled={loading} className="ml-auto rounded-xl">
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
